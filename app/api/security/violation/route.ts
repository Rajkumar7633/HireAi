import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Notification from "@/models/Notification"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { type, message, assessmentId } = await request.json()

    if (!assessmentId || !type) {
      return NextResponse.json({ success: false, message: "assessmentId and type are required" }, { status: 400 })
    }

    await connectDB()

    const application: any = await Application.findOne({
      jobSeekerId: session.userId,
      assessmentId,
    })

    if (!application) {
      return NextResponse.json({ success: false, message: "Application not found" }, { status: 404 })
    }

    const now = new Date()
    const violationEntry = { type, message, timestamp: now }

    const inc: any = {}
    if (type === "tab_switch") {
      inc["proctoringData.tabSwitchCount"] = 1
    }

    await Application.updateOne(
      { _id: application._id },
      {
        $push: { "proctoringData.securityViolations": violationEntry },
        ...(Object.keys(inc).length ? { $inc: inc } : {}),
      },
    )

    // Notify recruiter assigned to this application, if present
    if (application.assignedBy) {
      await Notification.create({
        userId: application.assignedBy,
        type: "assessment_violation",
        message: `Violation reported for assessment ${assessmentId}: ${type} - ${message}`,
        relatedEntity: { id: application._id, type: "assessment" },
      })
    }

    return NextResponse.json({ success: true, violation: violationEntry })
  } catch (error) {
    console.error("[Security] Error processing violation:", error)
    return NextResponse.json({ success: false, message: "Failed to process security violation" }, { status: 500 })
  }
}

function getActionForViolation(type: string, severity: string): string {
  if (severity === "high") {
    switch (type) {
      case "dev_tools_open":
        return "assessment_paused"
      case "virtual_machine":
        return "flagged_for_review"
      case "screen_share":
        return "assessment_terminated"
      default:
        return "logged"
    }
  } else if (severity === "medium") {
    return "warning_issued"
  }
  return "logged"
}

function calculateRiskScore(type: string, severity: string): number {
  const baseScores = {
    high: 25,
    medium: 15,
    low: 5,
  }

  const typeMultipliers = {
    dev_tools_open: 2.0,
    virtual_machine: 2.5,
    screen_share: 3.0,
    copy_paste_attempt: 1.5,
    blocked_domain: 1.8,
    websocket: 1.3,
  }

  const baseScore = baseScores[severity as keyof typeof baseScores] || 5
  const multiplier = typeMultipliers[type as keyof typeof typeMultipliers] || 1.0

  return Math.round(baseScore * multiplier)
}
