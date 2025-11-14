import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import SocialConnection from "@/models/SocialConnection";

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

export async function GET(_req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ items: [] });

    const meProfile: any = await JobSeekerProfile.findOne({ userId: me }).lean();

    const cons = await SocialConnection.find({
      $or: [
        { requesterId: me },
        { addresseeId: me },
      ],
    }).select("requesterId addresseeId status").lean();
    const exclude = new Set<string>([String(me)]);
    for (const c of cons) {
      exclude.add(String(c.requesterId));
      exclude.add(String(c.addresseeId));
    }

    const criteria: any = { userId: { $nin: Array.from(exclude) } };
    const or: any[] = [];
    if (meProfile?.currentTitle) or.push({ currentTitle: new RegExp(meProfile.currentTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
    if (meProfile?.location) or.push({ location: new RegExp(meProfile.location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") });
    const query = or.length ? { ...criteria, $or: or } : criteria;

    const items = await JobSeekerProfile.find(query)
      .select("userId firstName lastName email currentTitle location profileImage")
      .limit(12)
      .lean();

    return NextResponse.json({ items });
  } catch (e) {
    console.error("/api/social/suggestions error", e);
    return NextResponse.json({ items: [] });
  }
}
