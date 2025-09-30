import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import CandidateFeedback from "@/models/CandidateFeedback"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get("applicationId")

    await connectDB()

    const feedback = await CandidateFeedback.find({
      candidateId: session.userId,
      ...(applicationId && { applicationId }),
    })
      .populate("applicationId", "status")
      .populate("recruiterId", "name company")
      .sort({ createdAt: -1 })

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error("Error fetching candidate feedback:", error)
    return NextResponse.json({ message: "Failed to fetch feedback" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { applicationId, rating, comment, category } = await request.json()

    await connectDB()

    const feedback = new CandidateFeedback({
      candidateId: session.userId,
      applicationId,
      rating,
      comment,
      category,
      createdAt: new Date(),
    })

    await feedback.save()

    return NextResponse.json({ message: "Feedback submitted successfully", feedback }, { status: 201 })
  } catch (error) {
    console.error("Error submitting feedback:", error)
    return NextResponse.json({ message: "Failed to submit feedback" }, { status: 500 })
  }
}
