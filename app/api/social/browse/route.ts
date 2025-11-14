import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(24, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));
    const location = (searchParams.get("location") || "").trim();
    const title = (searchParams.get("title") || "").trim();
    const skills = (searchParams.get("skills") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const sortParam = (searchParams.get("sort") || "recent").trim();

    const filter: any = {};
    if (me) filter.userId = { $ne: me };
    const or: any[] = [];
    if (location) or.push({ location: new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
    if (title) or.push({ currentTitle: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
    if (skills.length) or.push({ skills: { $in: skills } });
    const query = or.length ? { ...filter, $or: or } : filter;

    const sort: any = sortParam === "name_asc" ? { firstName: 1, lastName: 1 } : { updatedAt: -1 };

    const items = await JobSeekerProfile.find(query)
      .select("userId firstName lastName email currentTitle location profileImage bannerImage skills experienceLevel university")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await JobSeekerProfile.countDocuments(query);

    return NextResponse.json({ items, page, hasMore: page * limit < total });
  } catch (e) {
    console.error("/api/social/browse error", e);
    return NextResponse.json({ items: [], page: 1, hasMore: false });
  }
}
