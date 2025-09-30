import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { assessmentId, alert } = await request.json()

    console.log("[v0] Proctoring alert for assessment:", assessmentId)
    console.log("[v0] Alert type:", alert.type)
    console.log("[v0] Alert severity:", alert.severity)
    console.log("[v0] Alert message:", alert.message)

    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const alertRecord = {
      id: `alert_${Date.now()}`,
      assessmentId,
      userId: session.userId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp || new Date(),
      processed: true,
      actionTaken: alert.severity === "high" ? "flagged_for_review" : "logged",
      metadata: {
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      }
    }

    // In production, you would create a ProctoringAlert model
    console.log("[v0] Alert stored:", alertRecord)

    if (alert.severity === "high") {
      console.log("[v0] High severity alert - notifying recruiter immediately")
      // In production: trigger WebSocket notification to recruiter
      // await notifyRecruiter(assessmentId, alertRecord)
    }

    const scoreDeduction = {
      'high': 15,
      'medium': 8,
      'low': 3
    }[alert.severity] || 0

    console.log(`[v0] Security score deduction: ${scoreDeduction} points`)

    return NextResponse.json({
      success: true,
      alert: alertRecord,
      scoreDeduction,
    })
  } catch (error) {
    console.error("[v0] Error processing proctoring alert:", error)
    return NextResponse.json({ 
      success: false, 
      message: "Failed to process alert",
      error: error.message 
    }, { status: 500 })
  }
}
