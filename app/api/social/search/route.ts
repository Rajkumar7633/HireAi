import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import JobSeekerProfile from "@/models/JobSeekerProfile";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("query") || "").trim();
    if (!q) return NextResponse.json({ items: [] });

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const items = await JobSeekerProfile.find({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { currentTitle: regex },
      ],
    })
      .select("firstName lastName email currentTitle location profileImage userId")
      .limit(20)
      .lean();

    return NextResponse.json({ items });
  } catch (e) {
    console.error("/api/social/search error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
