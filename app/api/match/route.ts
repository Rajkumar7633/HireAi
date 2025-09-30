import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Resume from "@/models/Resume"
import JobDescription from "@/models/JobDescription"
import { aiService } from "@/lib/ai-service"

type MatchPayload = {
  _id: string
  resumeId: { _id: string; filename: string }
  jobDescriptionId: { _id: string; title: string; location: string }
  matchScore: number
  atsScore: number
  matchedSkills: string[]
  missingSkills?: string[]
  suggestions: string[]
  matchDate: string
  jobSkills?: string[]
  jobDescriptionText?: string
}

async function computeMatches(userId: string, specificResumeId?: string): Promise<MatchPayload[]> {
  await connectDB()

  const resume = specificResumeId
    ? await Resume.findOne({ _id: specificResumeId, userId })
    : await Resume.findOne({ userId }).sort({ uploadedAt: -1 })

  if (!resume) return []

  const jobs = await JobDescription.find({ isActive: true, status: "active" }).lean()

  const candidateProfile = {
    skills: resume.extractedData?.skills?.length ? resume.extractedData?.skills : resume.parsedSkills || [],
    experience: resume.experience || "",
    education: Array.isArray(resume.extractedData?.education)
      ? (resume.extractedData!.education as any[]).map((e) => `${e.degree || ""} ${e.school || ""}`.trim())
      : [],
    professionalSummary: (resume.rawText || "").slice(0, 2000),
  }

  const results: MatchPayload[] = []
  for (const job of jobs) {
    const jobSkills: string[] = Array.isArray(job.skillsRequired) ? job.skillsRequired : []
    const jobDesc: string = job.description || ""

    // AI match
    const match = await aiService.generateJobMatch(candidateProfile, jobDesc, jobSkills)

    // ATS-like score based on resume vs job description & skills
    const ats = await aiService.analyzeResume(resume.rawText || "", jobDesc, jobSkills)

    // Determine matched skills by intersection (fallback if AI didn't provide)
    const candidateSkills = candidateProfile.skills || []
    const matchedSkills = jobSkills.filter((s) =>
      candidateSkills.some((c) => c?.toLowerCase?.().includes?.(String(s).toLowerCase()) || String(s).toLowerCase().includes(String(c).toLowerCase())),
    )

    results.push({
      _id: `${job._id}_${resume._id}`,
      resumeId: { _id: String(resume._id), filename: resume.fileName },
      jobDescriptionId: { _id: String(job._id), title: job.title, location: job.location },
      matchScore: Math.round(match.matchScore),
      atsScore: Math.round(ats.atsScore),
      matchedSkills: match.topSkills?.length ? match.topSkills : matchedSkills,
      missingSkills: match.missingSkills || [],
      suggestions: match.recommendations?.length ? match.recommendations : ats.suggestions || [],
      matchDate: new Date().toISOString(),
      jobSkills: jobSkills,
      jobDescriptionText: jobDesc,
    })
  }

  // Sort by matchScore desc, then atsScore desc
  results.sort((a, b) => b.matchScore - a.matchScore || b.atsScore - a.atsScore)
  return results.slice(0, 30)
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const resumeId = body?.resumeId as string | undefined
    const matches = await computeMatches(session.userId, resumeId)
    return NextResponse.json(matches)
  } catch (error) {
    console.error("AI Match generation error:", error)
    return NextResponse.json({ message: "Failed to generate matches" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  try {
    const matches = await computeMatches(session.userId)
    return NextResponse.json(matches)
  } catch (error) {
    console.error("AI Match fetch error:", error)
    return NextResponse.json({ message: "Failed to fetch matches" }, { status: 500 })
  }
}
