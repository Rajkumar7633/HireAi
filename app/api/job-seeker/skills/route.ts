import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import JobSeekerProfile from "@/models/JobSeekerProfile";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

async function backendFetch(path: string, init?: RequestInit) {
  const authToken = cookies().get("auth-token")?.value;
  return fetch(`${BACKEND_URL}/api/skills${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

function normalizeSkill(raw: unknown) {
  if (typeof raw === "string") {
    return { name: raw.trim(), level: "intermediate" as const, verified: false };
  }
  if (raw && typeof raw === "object" && "name" in raw) {
    const o = raw as Record<string, unknown>;
    return {
      name: String(o.name).trim(),
      level: (o.level as "beginner" | "intermediate" | "advanced") || "intermediate",
      verified: Boolean(o.verified),
      verifiedScore: typeof o.verifiedScore === "number" ? o.verifiedScore : undefined,
      verifiedAt: o.verifiedAt ? String(o.verifiedAt) : undefined,
    };
  }
  return null;
}

async function syncProfileSkills(userId: string, skillNames: string[]) {
  await connectDB();
  const profile = await JobSeekerProfile.findOne({ userId });
  if (!profile) return;
  profile.skills = skillNames;
  profile.lastUpdated = new Date();
  await profile.save();
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession(_req);
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const backendRes = await backendFetch("/dashboard");

    await connectDB();
    const [backendData, profileDoc, trendingAgg] = await Promise.all([
      backendRes.ok
        ? backendRes.json()
        : Promise.resolve({ skills: [], stats: {}, history: [], cooldowns: [], skillStats: {} }),
      JobSeekerProfile.findOne({ userId: session.userId })
        .select("skills skillEndorsements desiredRole currentTitle industry")
        .lean(),
      JobSeekerProfile.aggregate([
        { $unwind: { path: "$skills", preserveNullAndEmptyArrays: false } },
        { $group: { _id: { $toLower: "$skills" }, name: { $first: "$skills" }, count: { $sum: 1 } } },
        { $sort: { count: -1, name: 1 } },
        { $limit: 100 },
        { $project: { _id: 0, name: 1, count: 1 } },
      ]).exec(),
    ]);

    const profile = profileDoc as {
      skills?: string[];
      skillEndorsements?: Array<{ skill: string; endorsedBy?: string[] }>;
      desiredRole?: string;
      currentTitle?: string;
      industry?: string;
    } | null;

    const profileSkills = Array.isArray(profile?.skills) ? profile.skills : [];
    const backendSkills = (backendData.skills || []).map(normalizeSkill).filter(Boolean);
    const mergedMap = new Map<string, ReturnType<typeof normalizeSkill>>();

    for (const s of backendSkills) {
      if (s) mergedMap.set(s.name.toLowerCase(), s);
    }
    for (const name of profileSkills) {
      const key = String(name).toLowerCase();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, { name: String(name), level: "intermediate", verified: false });
      }
    }

    const skills = Array.from(mergedMap.values()).filter(Boolean);
    const endorsements = (profile?.skillEndorsements || []).map(
      (e: { skill: string; endorsedBy?: string[] }) => ({
        skill: e.skill,
        count: Array.isArray(e.endorsedBy) ? e.endorsedBy.length : 0,
      }),
    );

    const trending = Array.isArray(trendingAgg) ? trendingAgg.slice(0, 12) : [];

    const owned = new Set(skills.map((s) => s!.name.toLowerCase()));
    const recommendations = trending
      .map((t: { name: string }) => t.name)
      .filter((n: string) => n && !owned.has(n.toLowerCase()))
      .slice(0, 6);

    const stats = backendData.stats || {};
    stats.total = skills.length;
    stats.verified = skills.filter((s) => s!.verified).length;
    stats.unverified = stats.total - stats.verified;
    stats.verificationRate = stats.total
      ? Math.round((stats.verified / stats.total) * 100)
      : 0;

    return NextResponse.json({
      skills,
      stats,
      history: backendData.history || [],
      cooldowns: backendData.cooldowns || [],
      skillStats: backendData.skillStats || {},
      endorsements,
      trending,
      recommendations,
      profileContext: {
        desiredRole: profile?.desiredRole || "",
        currentTitle: profile?.currentTitle || "",
        industry: profile?.industry || "",
      },
    });
  } catch (err) {
    console.error("/api/job-seeker/skills GET error", err);
    return NextResponse.json({ message: "Failed to load skills dashboard" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const res = await backendFetch("/manage", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && Array.isArray(data.skills)) {
      const names = data.skills
        .map((s: { name?: string }) => s?.name)
        .filter(Boolean) as string[];
      await syncProfileSkills(session.userId, names);
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("/api/job-seeker/skills PATCH error", err);
    return NextResponse.json({ message: "Failed to update skills" }, { status: 500 });
  }
}
