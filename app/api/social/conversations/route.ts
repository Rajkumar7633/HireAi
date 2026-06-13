import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialConversation from "@/models/SocialConversation";
import User from "@/models/User";
import { headers, cookies } from "next/headers";
import { verifyTokenEdge } from "@/lib/auth-edge";

export const dynamic = "force-dynamic";

async function getUserId() {
  const auth = headers().get("authorization");
  let token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;
  if (!token) token = cookies().get("token")?.value;
  if (!token) return null;
  const s = await verifyTokenEdge(token);
  return s?.userId || null;
}

export async function GET() {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await SocialConversation.find({ participants: { $in: [me] } })
      .sort({ updatedAt: -1 })
      .lean();

    // Populate participant details (name, email, profileImage)
    const allIds = [...new Set(items.flatMap((c: any) => c.participants.map(String)))];
    const users = allIds.length
      ? await User.find({ _id: { $in: allIds } })
          .select("_id name email profileImage")
          .lean()
      : [];
    const userMap: Record<string, any> = Object.fromEntries(
      users.map((u: any) => [String(u._id), u])
    );

    const enriched = items.map((c: any) => ({
      ...c,
      participantDetails: c.participants.map((pid: any) => {
        const u = userMap[String(pid)];
        return u
          ? { _id: String(u._id), name: u.name || "", email: u.email || "", profileImage: u.profileImage || "" }
          : { _id: String(pid), name: "", email: String(pid), profileImage: "" };
      }),
    }));

    return NextResponse.json({ items: enriched });
  } catch (e) {
    console.error("/api/social/conversations GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { otherUserId } = await req.json();
    if (!otherUserId) return NextResponse.json({ error: "otherUserId required" }, { status: 400 });

    const key = [String(me), String(otherUserId)].sort();
    let convo = await SocialConversation.findOne({ participants: { $all: key, $size: 2 } });
    if (!convo) {
      convo = await SocialConversation.create({ participants: key });
    }

    // Populate participant details for the returned conversation
    const allIds = convo.participants.map(String);
    const users = await User.find({ _id: { $in: allIds } })
      .select("_id name email profileImage")
      .lean();
    const userMap: Record<string, any> = Object.fromEntries(
      users.map((u: any) => [String(u._id), u])
    );
    const conversation = {
      ...convo.toObject(),
      participantDetails: convo.participants.map((pid: any) => {
        const u = userMap[String(pid)];
        return u
          ? { _id: String(u._id), name: u.name || "", email: u.email || "", profileImage: u.profileImage || "" }
          : { _id: String(pid), name: "", email: String(pid), profileImage: "" };
      }),
    };

    return NextResponse.json({ ok: true, conversation });
  } catch (e) {
    console.error("/api/social/conversations POST error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
