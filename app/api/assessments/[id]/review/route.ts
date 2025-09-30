import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const assessmentId = params.id
    const { rating, comment } = await request.json()

    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ message: "Rating must be 1-5" }, { status: 400 })
    }

    await connectDB()

    const application = await Application.findOne({
      jobSeekerId: session.userId,
      assessmentId,
      status: { $in: ["Assessment Completed", "completed", "test_completed"] },
    })

    if (!application) {
      return NextResponse.json({ message: "Completed assessment not found" }, { status: 404 })
    }

    application.candidateReview = {
      rating,
      comment: (comment ?? "").toString().slice(0, 1000),
      submittedAt: new Date(),
    }

    await application.save()

    return NextResponse.json({ success: true, message: "Review submitted" })
  } catch (error: any) {
    console.error("[v0] Error submitting review:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to submit review" }, { status: 500 })
  }
}
