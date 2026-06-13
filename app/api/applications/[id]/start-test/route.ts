import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import { getIO } from "@/lib/socket-server"

const COMPLETED = new Set([
  "Test Passed", "Test Failed", "Test Completed", "test_completed", "Reviewed",
])

/**
 * POST /api/applications/[id]/start-test
 * Marks coding test session as in_progress and records startedAt.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  await connectDB()

  const application = await Application.findById(params.id)
  if (!application) {
    return NextResponse.json({ message: "Application not found" }, { status: 404 })
  }

  const seekerId = application.jobSeekerId?.toString?.() || String(application.jobSeekerId)
  if (seekerId !== session.userId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  if (!application.testId) {
    return NextResponse.json({ message: "No test assigned" }, { status: 400 })
  }

  if (COMPLETED.has(String(application.status))) {
    return NextResponse.json({
      success: true,
      alreadyCompleted: true,
      message: "Test already completed",
    })
  }

  const now = new Date()
  const wasInProgress = application.status === "in_progress"

  if (!wasInProgress) {
    application.status = "in_progress" as any
    if (!application.startedAt) {
      application.startedAt = now
    }
    await application.save()
  }

  const testId = application.testId?.toString?.() || String(application.testId)

  try {
    const io = getIO()
    if (io && testId) {
      io.to(`test:${testId}:recruiters`).emit("test:live-update", {
        type: "session_start",
        testId,
        applicationId: params.id,
        candidateId: session.userId,
        at: now.toISOString(),
      })
    }
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({
    success: true,
    message: wasInProgress ? "Session resumed" : "Test started",
    startedAt: application.startedAt || now,
    testId,
  })
}
