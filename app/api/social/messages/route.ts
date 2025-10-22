import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SocialMessage from "@/models/SocialMessage";
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

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    if (!conversationId) return NextResponse.json({ items: [] });

    // Ensure user is part of conversation
    const convo = await SocialConversation.findOne({ _id: conversationId, participants: { $in: [me] } }).lean();
    if (!convo) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const items = await SocialMessage.find({ conversationId }).sort({ createdAt: 1 }).limit(200).lean();
    return NextResponse.json({ items });
  } catch (e) {
    console.error("/api/social/messages GET error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const me = await getUserId();
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { conversationId, text } = await req.json();
    if (!conversationId || !text?.trim()) return NextResponse.json({ error: "Invalid" }, { status: 400 });

    const convo = await SocialConversation.findOne({ _id: conversationId, participants: { $in: [me] } });
    if (!convo) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const msg = await SocialMessage.create({ conversationId, senderId: me, text: text.trim() });
    convo.lastMessageAt = new Date();
    await convo.save();

    return NextResponse.json({ ok: true, message: msg });
  } catch (e) {
    console.error("/api/social/messages POST error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
