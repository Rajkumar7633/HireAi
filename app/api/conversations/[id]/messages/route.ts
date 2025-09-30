import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Message from "@/models/Message";
import { addConversationEvent } from "../events/route";
import Conversation from "@/models/Conversation";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(req as any);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const conversationId = params.id;

    const messages = await Message.find({ conversationId })
      .populate("senderId", "name email role")
      .populate("recipientId", "name email role")
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json(messages.map((m: any) => ({
      _id: String(m._id),
      conversationId: String(m.conversationId || conversationId),
      senderId: String(m.senderId?._id || m.senderId),
      senderRole: (m.senderId as any)?.role || "user",
      content: m.content,
      timestamp: (m.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
      readBy: [],
    })));
  } catch (e) {
    console.error("GET /api/conversations/[id]/messages error", e);
    return NextResponse.json({ message: "Failed to load messages" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(req as any);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { content } = await req.json();
    if (!content || !content.trim()) return NextResponse.json({ message: "content required" }, { status: 400 });

    await connectDB();
    const conversationId = params.id;

    // Find conversation to determine recipient
    const conv = await Conversation.findById(conversationId);
    if (!conv) return NextResponse.json({ message: "Conversation not found" }, { status: 404 });

    const isSenderJobSeeker = String(conv.jobSeekerId) === String(session.userId);
    const recipientId = isSenderJobSeeker ? conv.recruiterId : conv.jobSeekerId;

    const msg = await Message.create({
      conversationId,
      senderId: session.userId,
      recipientId,
      content: content.trim(),
      type: "text",
    });

    // Update convo last message time
    conv.lastMessageAt = new Date();
    await conv.save();

    // Emit SSE event to subscribers
    addConversationEvent(conversationId, {
      _id: String(msg._id),
      conversationId: String(conversationId),
      senderId: String(msg.senderId),
      senderRole: isSenderJobSeeker ? "job_seeker" : "recruiter",
      content: msg.content,
      timestamp: (msg.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
      readBy: [],
    });

    return NextResponse.json({
      _id: String(msg._id),
      conversationId: String(conversationId),
      senderId: String(msg.senderId),
      senderRole: isSenderJobSeeker ? "job_seeker" : "recruiter",
      content: msg.content,
      timestamp: (msg.createdAt as Date)?.toISOString?.() || new Date().toISOString(),
      readBy: [],
    }, { status: 201 });
  } catch (e) {
    console.error("POST /api/conversations/[id]/messages error", e);
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 });
  }
}
