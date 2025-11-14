import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";
import SocialConnection from "@/models/SocialConnection";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";

export const dynamic = "force-dynamic";

async function getUserId() {
  const auth = headers().get("authorization");
  let token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) token = cookies().get("token")?.value;
  if (!token) return null;
  const s = await verifyTokenEdge(token);
  return s?.userId || null;
}

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) {
      const publicItems = await SocialPost.find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      return NextResponse.json({ items: publicItems });
    }

    const cons = await SocialConnection.find({
      status: "accepted",
      $or: [{ requesterId: me }, { addresseeId: me }],
    })
      .select("requesterId addresseeId")
      .lean();

    const ids = new Set<string>([String(me)]);
    for (const c of cons) {
      ids.add(String(c.requesterId));
      ids.add(String(c.addresseeId));
    }

    const raw = await SocialPost.find({
      authorId: { $in: Array.from(ids) },
      hiddenBy: { $ne: me },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const userIds = Array.from(new Set(raw.map((p: any) => String(p.authorId))));
    const profiles = await JobSeekerProfile.find({ userId: { $in: userIds } })
      .select("userId firstName lastName currentTitle location profileImage")
      .lean();
    const profileMap = new Map<string, any>(profiles.map((p: any) => [String(p.userId), p]));
    const items = raw.map((p: any) => ({
      ...p,
      author: profileMap.get(String(p.authorId)) || null,
    }));
    return NextResponse.json({ items });
  } catch (e) {
    console.error("/api/social/feed error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
