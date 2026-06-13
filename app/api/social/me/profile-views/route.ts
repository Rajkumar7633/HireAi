import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import ProfileView from "@/models/ProfileView";

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

// GET /api/social/me/profile-views — stats for own profile
export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [total, last7days, last30days, recent] = await Promise.all([
      ProfileView.countDocuments({ profileUserId: me }),
      ProfileView.countDocuments({ profileUserId: me, viewedAt: { $gte: day7 } }),
      ProfileView.countDocuments({ profileUserId: me, viewedAt: { $gte: day30 } }),
      // Weekly buckets for last 8 weeks
      ProfileView.aggregate([
        { $match: { profileUserId: { $in: [me, me?.toString()] }, viewedAt: { $gte: new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: {
              week: { $week: "$viewedAt" },
              year: { $year: "$viewedAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.week": 1 } },
      ]),
    ]);

    return NextResponse.json({ total, last7days, last30days, weekly: recent });
  } catch (e) {
    console.error("/api/social/me/profile-views error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
