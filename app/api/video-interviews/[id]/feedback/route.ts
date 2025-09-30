import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import InterviewFeedback, { type NextStep } from "@/models/InterviewFeedback";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const roomId = req.nextUrl.searchParams.get("roomId") || "";
    const doc = await InterviewFeedback.findOne({ interviewId: params.id, roomId });
    return NextResponse.json(doc || {}, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await req.json();
    const { roomId, role, payload, nextStep }: { roomId: string; role: "recruiter" | "candidate"; payload: any; nextStep?: NextStep } = body;
    if (!roomId || !role || !payload) {
      return NextResponse.json({ message: "roomId, role and payload are required" }, { status: 400 });
    }

    const update: any = { updatedAt: new Date() };
    if (role === "recruiter") update.recruiterFeedback = payload;
    if (role === "candidate") update.candidateFeedback = payload;
    if (nextStep) update.nextStep = nextStep;

    const doc = await InterviewFeedback.findOneAndUpdate(
      { interviewId: params.id, roomId },
      { $set: update, $setOnInsert: { interviewId: params.id, roomId } },
      { new: true, upsert: true }
    );

    return NextResponse.json({ ok: true, feedback: doc }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "Failed" }, { status: 500 });
  }
}
