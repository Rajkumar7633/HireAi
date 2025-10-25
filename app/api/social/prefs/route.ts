import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import SocialUserPrefs from "@/models/SocialUserPrefs";

export const dynamic = "force-dynamic";

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

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({});
    const doc = await SocialUserPrefs.findOne({ userId: me }).lean();
    if (!doc) return NextResponse.json({});
    return NextResponse.json({
      location: doc.location || "",
      title: doc.title || "",
      skills: Array.isArray(doc.skills) ? doc.skills : [],
      sort: doc.sort || "recent",
      compactCards: !!doc.compactCards,
      lastProfileTab: doc.lastProfileTab || "",
      lastProfileScroll: Number(doc.lastProfileScroll || 0),
      analyticsSavedViews: Array.isArray((doc as any).analyticsSavedViews) ? (doc as any).analyticsSavedViews : [],
    });
  } catch (e) {
    console.error("/api/social/prefs GET error", e);
    return NextResponse.json({}, { status: 200 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const update: any = {
      location: typeof body.location === 'string' ? body.location : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      skills: Array.isArray(body.skills) ? body.skills.filter((s: any) => typeof s === 'string' && s.trim()) : undefined,
      sort: typeof body.sort === 'string' ? body.sort : undefined,
      compactCards: typeof body.compactCards === 'boolean' ? body.compactCards : undefined,
      lastProfileTab: typeof body.lastProfileTab === 'string' ? body.lastProfileTab : undefined,
      lastProfileScroll: typeof body.lastProfileScroll === 'number' ? body.lastProfileScroll : undefined,
      analyticsSavedViews: Array.isArray(body.analyticsSavedViews) ? body.analyticsSavedViews : undefined,
    };
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);
    const doc = await SocialUserPrefs.findOneAndUpdate(
      { userId: me },
      { $set: update, $setOnInsert: { userId: me } },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json({ ok: true, prefs: doc });
  } catch (e) {
    console.error("/api/social/prefs PUT error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
