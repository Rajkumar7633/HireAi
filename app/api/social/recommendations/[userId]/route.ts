import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import SocialRecommendation from "@/models/SocialRecommendation";
import JobSeekerProfile from "@/models/JobSeekerProfile";

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

// GET /api/social/recommendations/[userId]
export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connectDB();
    const recs = await SocialRecommendation.find({ toUserId: params.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return NextResponse.json({ recommendations: recs });
  } catch (e) {
    console.error("/api/social/recommendations GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/social/recommendations/[userId]
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { text, relationship } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return NextResponse.json({ error: "Recommendation must be at least 20 characters" }, { status: 400 });
    }

    // Get recommender profile
    const myProfile = await JobSeekerProfile.findOne({ userId: me }).select("firstName lastName currentTitle profileImage").lean() as any;

    const rec = await SocialRecommendation.findOneAndUpdate(
      { fromUserId: me, toUserId: params.userId },
      {
        fromUserId: me,
        toUserId: params.userId,
        text: text.trim(),
        relationship: relationship || "",
        recommenderName: myProfile ? `${myProfile.firstName || ""} ${myProfile.lastName || ""}`.trim() : "",
        recommenderTitle: myProfile?.currentTitle || "",
        recommenderImage: myProfile?.profileImage || "",
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ recommendation: rec });
  } catch (e) {
    console.error("/api/social/recommendations POST error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
