import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";

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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = params;
    const post: any = await SocialPost.findById(id).lean();
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const author = await JobSeekerProfile.findOne({ userId: post.authorId })
      .select("userId firstName lastName currentTitle location profileImage")
      .lean();
    return NextResponse.json({ post: { ...post, author: author || null } });
  } catch (e) {
    console.error("/api/social/posts/[id] GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = params;
    const { content } = await req.json();
    if (!content || !String(content).trim()) return NextResponse.json({ error: "content required" }, { status: 400 });

    const post = await SocialPost.findById(id);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(post.authorId) !== String(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    post.content = String(content).trim();
    await post.save();
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    console.error("/api/social/posts/[id] PATCH error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = params;

    const post = await SocialPost.findById(id).select("authorId");
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (String(post.authorId) !== String(me)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await SocialPost.findByIdAndDelete(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("/api/social/posts/[id] DELETE error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
