import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import AssessmentResult from "@/models/AssessmentResult"
import ProctorEvent from "@/models/ProctorEvent"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { assessmentId, violationType, severity, message, data } = await request.json()

    if (!assessmentId || !violationType) {
      return NextResponse.json({ message: "assessmentId and violationType are required" }, { status: 400 })
    }

    // Persist to ProctorEvent collection for audit trail
    await ProctorEvent.create({
      assessmentId,
      candidateId: session.userId,
      type: violationType,
      message: message || violationType,
      meta: { severity, data },
    })

    // Update assessment result's proctoring timeline
    const result = await AssessmentResult.findOneAndUpdate(
      { assessmentId, candidateId: session.userId, status: "In Progress" },
      {
        $push: {
          "proctoringData.timeline": {
            timestamp: new Date(),
            type: violationType,
            severity,
            message,
            data,
          },
        },
        $inc: { [`proctoringData.violations.${violationType}`]: 1 },
      },
      { new: true },
    )

    // Emit socket event to notify recruiter dashboard in real time
    try {
      const { getIO } = await import("@/lib/socket-server")
      const io = getIO()
      if (io) {
        io.to(`recruiter:${assessmentId}`).emit("proctor:violation", {
          assessmentId,
          candidateId: session.userId,
          violationType,
          severity,
          message,
          timestamp: new Date().toISOString(),
        })
      }
    } catch {}

    return NextResponse.json({
      success: true,
      message: "Violation recorded",
      severity,
      sessionFound: !!result,
    })
  } catch (error) {
    console.error("Error recording violation:", error)
    return NextResponse.json({ message: "Failed to record violation" }, { status: 500 })
  }
}
