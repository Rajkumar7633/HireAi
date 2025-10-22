import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialConversation from "@/models/SocialConversation";
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
    return NextResponse.json({ items });
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
    return NextResponse.json({ ok: true, conversation: convo });
  } catch (e) {
    console.error("/api/social/conversations POST error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
