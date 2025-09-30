import { type NextRequest, NextResponse } from "next/server"
import { aiService } from "@/lib/ai-service"

export async function POST(request: NextRequest) {
  try {
    const { candidateProfile, jobDescription, jobSkills } = await request.json()

    if (!candidateProfile || !jobDescription) {
      return NextResponse.json({ message: "Candidate profile and job description are required" }, { status: 400 })
    }

    console.log("[v0] AI Job Matching - Processing request for:", candidateProfile.firstName || "Unknown candidate")

    const matchResult = await aiService.generateJobMatch(candidateProfile, jobDescription, jobSkills || [])

    console.log("[v0] AI Job Matching - Generated match score:", matchResult.matchScore)

    return NextResponse.json(matchResult)
  } catch (error) {
    console.error("[v0] AI Job matching error:", error)
    return NextResponse.json({ message: "Failed to generate job match" }, { status: 500 })
  }
}
