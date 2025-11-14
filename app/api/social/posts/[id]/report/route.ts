import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialPost from "@/models/SocialPost";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getUserId() {
  const auth = headers().get("authorization");
  let token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) token = cookies().get("token")?.value;
  if (!token) token = cookies().get("auth-token")?.value;
  if (!token) return null;
  const s = await verifyTokenEdge(token);
  return s?.userId || null;
}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = params;
    const post = await SocialPost.findById(id).select("reports");
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const reporters = (post.reports?.reporters || []).map((r: any) => String(r));
    if (!reporters.includes(String(me))) {
      post.reports = {
        count: (post.reports?.count || 0) + 1,
        reporters: [...(post.reports?.reporters || []), me as any],
      } as any;
      await post.save();
    }

    return NextResponse.json({ ok: true, count: post.reports?.count || 1 });
  } catch (e) {
    console.error("/api/social/posts/[id]/report error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
