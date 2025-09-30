import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import AssessmentResult from "@/models/AssessmentResult"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Proctoring violation reported")

    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { assessmentId, violationType, severity, message, data } = await request.json()

    const result = await AssessmentResult.findOneAndUpdate(
      {
        assessmentId: assessmentId,
        candidateId: session.userId,
        status: "In Progress",
      },
      {
        $push: {
          "proctoringData.timeline": {
            timestamp: new Date(),
            type: violationType,
            severity: severity,
            message: message,
            data: data,
          },
        },
        $inc: {
          [`proctoringData.violations.${violationType}`]: 1,
        },
      },
      { new: true },
    )

    if (!result) {
      return NextResponse.json(
        {
          message: "Assessment session not found",
        },
        { status: 404 },
      )
    }

    console.log("[v0] Proctoring violation recorded:", violationType, severity)

    // TODO: Implement WebSocket notification to recruiter dashboard
    // This would send real-time alerts to HR/recruiters about violations

    return NextResponse.json({
      success: true,
      message: "Violation recorded",
      severity: severity,
    })
  } catch (error) {
    console.error("[v0] Error recording violation:", error)
    return NextResponse.json(
      {
        message: "Failed to record violation",
      },
      { status: 500 },
    )
  }
}
