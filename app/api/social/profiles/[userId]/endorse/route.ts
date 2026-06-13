import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import JobSeekerProfile from "@/models/JobSeekerProfile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getUserId() {
  const auth = headers().get("authorization");
  let token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) token = cookies().get("token")?.value;
  if (!token) token = cookies().get("auth-token")?.value;
  if (token) {
    const s = await verifyTokenEdge(token);
    if (s?.userId) return s.userId;
  }
  return null;
}

// POST /api/social/profiles/[userId]/endorse
// Body: { skill: string }
// Toggles endorsement — adds if not present, removes if already endorsed
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (String(me) === params.userId) {
      return NextResponse.json({ error: "Cannot endorse yourself" }, { status: 400 });
    }

    const { skill } = await req.json();
    if (!skill || typeof skill !== "string") {
      return NextResponse.json({ error: "skill required" }, { status: 400 });
    }

    const profile = await JobSeekerProfile.findOne({ userId: params.userId });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const endorsements: Array<{ skill: string; endorsedBy: string[] }> = profile.skillEndorsements || [];
    const entry = endorsements.find((e) => e.skill === skill);
    const meStr = String(me);

    if (entry) {
      if (entry.endorsedBy.includes(meStr)) {
        // Remove endorsement
        entry.endorsedBy = entry.endorsedBy.filter((id) => id !== meStr);
      } else {
        entry.endorsedBy.push(meStr);
      }
    } else {
      endorsements.push({ skill, endorsedBy: [meStr] });
    }

    profile.skillEndorsements = endorsements;
    await profile.save();

    const updated = endorsements.find((e) => e.skill === skill);
    return NextResponse.json({
      endorsed: updated?.endorsedBy.includes(meStr) ?? false,
      count: updated?.endorsedBy.length ?? 0,
    });
  } catch (e) {
    console.error("/api/social/profiles/endorse error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
