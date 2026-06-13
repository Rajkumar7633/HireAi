import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import JobSeekerProfile from "@/models/JobSeekerProfile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/social/similar?userId=xxx&limit=5
// Returns profiles with overlapping skills or same industry
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 10);

    if (!userId) return NextResponse.json({ profiles: [] });

    const source = await JobSeekerProfile.findOne({ userId })
      .select("skills industry currentTitle userId")
      .lean() as any;

    if (!source) return NextResponse.json({ profiles: [] });

    const profiles = await JobSeekerProfile.find({
      userId: { $ne: userId },
      $or: [
        { skills: { $in: source.skills?.slice(0, 5) || [] } },
        { industry: source.industry },
      ],
    })
      .select("userId firstName lastName currentTitle profileImage skills industry openToWork")
      .limit(limit)
      .lean();

    return NextResponse.json({ profiles });
  } catch (e) {
    console.error("/api/social/similar error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
