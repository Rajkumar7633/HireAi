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

    // Find the application for this assessment and user
    const application = await Application.findOne({
      jobSeekerId: session.userId,
      assessmentId: assessmentId,
      status: { $in: ["assigned", "Assessment Assigned", "test_assigned", "Test Assigned"] },
    })

    if (!application) {
      return NextResponse.json({ message: "Assessment not found or already started" }, { status: 404 })
    }

    // Update application status to in_progress and record start time
    await Application.findByIdAndUpdate(application._id, {
      status: "in_progress",
      startedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: "Assessment started successfully",
    })
  } catch (error) {
    console.error("Error starting assessment:", error)
    return NextResponse.json({ message: "Failed to start assessment" }, { status: 500 })
  }
}
