import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { aiService } from "@/lib/ai-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { resumeText, jobRequirements, skills } = await request.json()

    if (!resumeText || !jobRequirements) {
      return NextResponse.json({ message: "Resume text and job requirements are required" }, { status: 400 })
    }

    // Use AI service for real-time analysis
    const analysis = await aiService.analyzeResume(resumeText, jobRequirements, skills || [])

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("AI Resume Screening Error:", error)
    return NextResponse.json({ message: "Failed to analyze resume" }, { status: 500 })
  }
}
