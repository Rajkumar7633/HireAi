import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Test from "@/models/Test"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { applicationId, testId } = body

    if (!applicationId || !testId) {
      return NextResponse.json({ message: "Application ID and Test ID are required" }, { status: 400 })
    }

    // Verify test belongs to recruiter
    const test = await Test.findById(testId)
    if (!test || test.recruiterId.toString() !== session.userId) {
      return NextResponse.json({ message: "Test not found or unauthorized" }, { status: 404 })
    }

    // Update application
    const application = await Application.findByIdAndUpdate(
      applicationId,
      {
        testId,
        status: "Test Assigned",
        testAssignedAt: new Date(),
      },
      { new: true },
    )

    if (!application) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Test assigned successfully",
      application,
    })
  } catch (error) {
    console.error("Error assigning test:", error)
    return NextResponse.json({ message: "Failed to assign test" }, { status: 500 })
  }
}
