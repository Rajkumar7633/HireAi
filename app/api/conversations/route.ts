import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    const session = await getSession(req as any);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();

    const convs = await Conversation.find({
      $or: [{ jobSeekerId: session.userId }, { recruiterId: session.userId }],
    })
      .populate("jobSeekerId", "name email")
      .populate("recruiterId", "name email")
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    // Shape to UI contract
    const data = convs.map((c: any) => ({
      _id: String(c._id),
      jobSeekerId: c.jobSeekerId ? { _id: String(c.jobSeekerId._id), name: c.jobSeekerId.name, email: c.jobSeekerId.email } : undefined,
      recruiterId: c.recruiterId ? { _id: String(c.recruiterId._id), name: c.recruiterId.name, email: c.recruiterId.email } : undefined,
      type: c.type || "direct",
      pipelineStatus: c.pipelineStatus || "new",
      lastMessageAt: (c.lastMessageAt || c.updatedAt || c.createdAt)?.toISOString?.() || new Date().toISOString(),
    }));

    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/conversations error", e);
    return NextResponse.json({ message: "Failed to load conversations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession(req as any);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { recipientId, recipientEmail, type = "direct" } = await req.json();
    await connectDB();

    let targetUserId = recipientId as string | undefined;
    if (!targetUserId && recipientEmail) {
      const target = await (User as any).findOne({ email: recipientEmail }).select("_id");
      if (!target) return NextResponse.json({ message: "Recipient not found" }, { status: 404 });
      targetUserId = String(target._id);
    }
    if (!targetUserId) return NextResponse.json({ message: "recipientId or recipientEmail required" }, { status: 400 });

    // Determine roles based on current session.role
    // If current user is job_seeker -> recipient must be recruiter, else vice versa
    const isJobSeeker = String(session.role || "").toLowerCase().includes("job");

    const filter = isJobSeeker
      ? { jobSeekerId: session.userId, recruiterId: targetUserId }
      : { recruiterId: session.userId, jobSeekerId: targetUserId };

    let conv = await Conversation.findOne(filter);
    if (!conv) {
      conv = await Conversation.create({ ...filter, type, lastMessageAt: new Date() });
    }

    await conv.populate("jobSeekerId", "name email");
    await conv.populate("recruiterId", "name email");

    return NextResponse.json({ conversation: {
      _id: String(conv._id),
      jobSeekerId: conv.jobSeekerId ? { _id: String((conv as any).jobSeekerId._id), name: (conv as any).jobSeekerId.name, email: (conv as any).jobSeekerId.email } : undefined,
      recruiterId: conv.recruiterId ? { _id: String((conv as any).recruiterId._id), name: (conv as any).recruiterId.name, email: (conv as any).recruiterId.email } : undefined,
      type: conv.type,
      pipelineStatus: (conv as any).pipelineStatus || "new",
      lastMessageAt: (conv.lastMessageAt || new Date()).toISOString(),
    } });
  } catch (e) {
    console.error("POST /api/conversations error", e);
    return NextResponse.json({ message: "Failed to create conversation" }, { status: 500 });
  }
}
