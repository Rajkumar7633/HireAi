import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const assessmentId = params.id

    // Accept already in_progress too (handles page refresh after start)
    const application = await Application.findOne({
      jobSeekerId: session.userId,
      assessmentId,
      status: {
        $in: [
          "assigned", "Assessment Assigned", "test_assigned", "Test Assigned",
          "in_progress",
        ],
      },
    })

    if (!application) {
      // Check if already completed — return success so the take page can redirect cleanly
      const completed = await Application.findOne({
        jobSeekerId: session.userId,
        assessmentId,
        status: { $in: ["Assessment Completed", "completed", "test_completed"] },
      })
      if (completed) {
        return NextResponse.json({ success: true, message: "Already completed", alreadyCompleted: true })
      }
      return NextResponse.json({ message: "Assessment not found or not assigned" }, { status: 404 })
    }

    // Only transition if not already in_progress
    if (application.status !== "in_progress") {
      await Application.findByIdAndUpdate(application._id, {
        status: "in_progress",
        startedAt: new Date(),
      })
    }

    return NextResponse.json({ success: true, message: "Assessment started successfully" })
  } catch (error) {
    console.error("Error starting assessment:", error)
    return NextResponse.json({ message: "Failed to start assessment" }, { status: 500 })
  }
}
