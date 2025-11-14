import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import JobSeekerProfile from "@/models/JobSeekerProfile";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const agg = await JobSeekerProfile.aggregate([
      { $unwind: { path: "$skills", preserveNullAndEmptyArrays: false } },
      { $group: { _id: { $toLower: "$skills" }, name: { $first: "$skills" }, count: { $sum: 1 } } },
      { $sort: { count: -1, name: 1 } },
      { $limit: 100 },
      { $project: { _id: 0, name: 1, count: 1 } },
    ]).exec();
    return NextResponse.json({ items: agg });
  } catch (e) {
    console.error("/api/social/skills error", e);
    return NextResponse.json({ items: [] });
  }
}
