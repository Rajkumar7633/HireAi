import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import SocialPost from "@/models/SocialPost";
import SocialConnection from "@/models/SocialConnection";

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

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [postsCount, recentPosts, pending, accepted] = await Promise.all([
      SocialPost.countDocuments({ authorId: me }),
      SocialPost.find({ authorId: me }).sort({ createdAt: -1 }).limit(5).select("_id content images createdAt likes commentsCount").lean(),
      SocialConnection.find({ addresseeId: me, status: "pending" }).select("requesterId").lean(),
      SocialConnection.find({ status: "accepted", $or: [{ requesterId: me }, { addresseeId: me }] }).select("requesterId addresseeId").lean(),
    ]);

    const connectionsCount = accepted.length;
    const pendingCount = pending.length;
    return NextResponse.json({ postsCount, connectionsCount, pendingCount, recentPosts });
  } catch (e) {
    console.error("/api/social/me/summary error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
