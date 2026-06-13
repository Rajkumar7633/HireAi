import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import InterviewFeedback, { type NextStep } from "@/models/InterviewFeedback";
import VideoInterview from "@/models/VideoInterview";
import { syncInterviewFeedbackToPipeline } from "@/lib/sync-interview-feedback";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const roomId = req.nextUrl.searchParams.get("roomId") || "";
    const doc = roomId
      ? await InterviewFeedback.findOne({ interviewId: params.id, roomId })
      : await InterviewFeedback.findOne({ interviewId: params.id }).sort({ updatedAt: -1 });

    const interview = await VideoInterview.findById(params.id).lean();
    if (interview) {
      const allowed =
        String(interview.recruiterId) === session.userId ||
        String(interview.candidateId) === session.userId;
      if (!allowed) {
        return NextResponse.json({ message: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json(doc || {}, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const {
      roomId,
      role,
      payload,
      nextStep,
    }: {
      roomId: string;
      role: "recruiter" | "candidate";
      payload: Record<string, unknown>;
      nextStep?: NextStep;
    } = body;

    if (!roomId || !role || !payload) {
      return NextResponse.json(
        { message: "roomId, role and payload are required" },
        { status: 400 }
      );
    }

    const interview = await VideoInterview.findById(params.id);
    if (!interview) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 });
    }

    const isRecruiter = String(interview.recruiterId) === session.userId;
    const isCandidate = String(interview.candidateId) === session.userId;
    if (role === "recruiter" && !isRecruiter) {
      return NextResponse.json({ message: "Only recruiter can submit recruiter feedback" }, { status: 403 });
    }
    if (role === "candidate" && !isCandidate) {
      return NextResponse.json({ message: "Only candidate can submit candidate feedback" }, { status: 403 });
    }

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (role === "recruiter") update.recruiterFeedback = payload;
    if (role === "candidate") update.candidateFeedback = payload;
    if (nextStep && role === "recruiter") update.nextStep = nextStep;

    const doc = await InterviewFeedback.findOneAndUpdate(
      { interviewId: params.id, roomId },
      { $set: update, $setOnInsert: { interviewId: params.id, roomId } },
      { new: true, upsert: true }
    );

    const syncResult = await syncInterviewFeedbackToPipeline({
      interviewId: params.id,
      recruiterPayload: role === "recruiter" ? (payload as Parameters<typeof syncInterviewFeedbackToPipeline>[0]["recruiterPayload"]) : undefined,
      candidatePayload: role === "candidate" ? (payload as Parameters<typeof syncInterviewFeedbackToPipeline>[0]["candidatePayload"]) : undefined,
      nextStep: role === "recruiter" ? nextStep : undefined,
    });

    return NextResponse.json({ ok: true, feedback: doc, pipeline: syncResult }, { status: 200 });
  } catch (e: unknown) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
