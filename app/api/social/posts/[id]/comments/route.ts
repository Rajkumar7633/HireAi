import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialComment from "@/models/SocialComment";
import JobSeekerProfile from "@/models/JobSeekerProfile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const { id } = params;
    const comments = await SocialComment.find({ postId: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const userIds = Array.from(new Set(comments.map((c: any) => String(c.authorId))));
    const profiles = await JobSeekerProfile.find({ userId: { $in: userIds } })
      .select("userId firstName lastName profileImage currentTitle")
      .lean();
    const map = new Map<string, any>(profiles.map((p: any) => [String(p.userId), p]));

    const items = comments.map((c: any) => ({
      ...c,
      author: map.get(String(c.authorId)) || null,
    }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("/api/social/posts/[id]/comments error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
