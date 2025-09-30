import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { aiService } from "@/lib/ai-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { resumeText, jobDescription, requiredSkills } = await request.json()

    if (!resumeText) {
      return NextResponse.json({ message: "Resume text is required" }, { status: 400 })
    }

    console.log("[v0] AI Resume Analysis - Processing resume analysis")

    const analysis = await aiService.analyzeResume(resumeText, jobDescription || "", requiredSkills || [])

    console.log("[v0] AI Resume Analysis - Generated score:", analysis.score)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("[v0] AI Resume analysis error:", error)
    return NextResponse.json({ message: "Failed to analyze resume" }, { status: 500 })
  }
}
