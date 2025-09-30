import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Conversation from "@/models/Conversation";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getSession(req as any);
        if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const { pipelineStatus } = await req.json();
        const allowed = ["new", "contacted", "interviewing", "offer", "rejected"] as const;
        if (!allowed.includes(pipelineStatus)) return NextResponse.json({ message: "Invalid pipelineStatus" }, { status: 400 });

        await connectDB();

        const conv = await Conversation.findById(params.id);
        if (!conv) return NextResponse.json({ message: "Not found" }, { status: 404 });

        // ensure user is in this conversation
        if (String(conv.jobSeekerId) !== String(session.userId) && String(conv.recruiterId) !== String(session.userId)) {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        conv.pipelineStatus = pipelineStatus;
        await conv.save();

        return NextResponse.json({ ok: true, pipelineStatus: conv.pipelineStatus });
    } catch (e) {
        console.error("PATCH /api/conversations/[id] error", e);
        return NextResponse.json({ message: "Failed to update conversation" }, { status: 500 });
    }
}
