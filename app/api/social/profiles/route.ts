import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import JobSeekerProfile from "@/models/JobSeekerProfile";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const ids = (searchParams.get("ids") || "").split(",").map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ items: [] });
    const items = await JobSeekerProfile.find({ userId: { $in: ids } })
      .select("userId firstName lastName email currentTitle location profileImage")
      .lean();
    return NextResponse.json({ items });
  } catch (e) {
    console.error("/api/social/profiles error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
