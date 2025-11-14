import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import { emitSocial } from "@/lib/socket-server";

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

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { postId } = await req.json();
    if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 });

    const post = await SocialPost.findById(postId).select("likedBy likes");
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const myId = String(me);
    const hasLiked = post.likedBy.some((id: any) => String(id) === myId);
    if (hasLiked) {
      post.likedBy = post.likedBy.filter((id: any) => String(id) !== myId) as any;
    } else {
      post.likedBy.push(me as any);
    }
    post.likes = post.likedBy.length;
    await post.save();

    emitSocial("post:like", { postId, likes: post.likes });
    return NextResponse.json({ ok: true, likes: post.likes, liked: !hasLiked });
  } catch (e) {
    console.error("/api/social/posts/like error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
