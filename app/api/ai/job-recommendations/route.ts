import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { aiService } from "@/lib/ai-service"
import { connectDB } from "@/lib/mongodb"
import Job from "@/models/Job"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { candidateProfile } = await request.json()

    if (!candidateProfile) {
      return NextResponse.json({ message: "Candidate profile is required" }, { status: 400 })
    }

    console.log("[v0] AI Job Recommendations - Finding jobs for candidate")

    // Get available jobs
    const availableJobs = await Job.find({ status: "active" }).limit(20).lean()

    if (availableJobs.length === 0) {
      return NextResponse.json({ recommendations: [] })
    }

    const recommendations = await aiService.generateJobRecommendations(candidateProfile, availableJobs)

    console.log("[v0] AI Job Recommendations - Generated", recommendations.length, "recommendations")

    return NextResponse.json({ recommendations })
  } catch (error) {
    console.error("[v0] AI Job recommendations error:", error)
    return NextResponse.json({ message: "Failed to generate job recommendations" }, { status: 500 })
  }
}
