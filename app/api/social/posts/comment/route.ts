import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";
import SocialComment from "@/models/SocialComment";
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
    const { postId, text } = await req.json();
    if (!postId || !text || !text.trim()) return NextResponse.json({ error: "postId and text required" }, { status: 400 });

    const post = await SocialPost.findById(postId).select("_id");
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const comment = await SocialComment.create({ postId, authorId: me, text: text.trim() });
    const updated = await SocialPost.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } }, { new: true }).select("commentsCount");

    emitSocial("post:comment", { postId, comment, commentsCount: updated?.commentsCount || 0 });
    return NextResponse.json({ ok: true, comment, commentsCount: updated?.commentsCount || 0 });
  } catch (e) {
    console.error("/api/social/posts/comment error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
