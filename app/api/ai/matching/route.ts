import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { aiService } from "@/lib/ai-service"
import Resume from "@/models/Resume"
import JobSeekerProfile from "@/models/JobSeekerProfile"

function normalizeSkills(input: string[] | undefined | null): string[] {
  const set = new Set<string>()
  ;(input || []).forEach((s) => {
    const v = String(s || "").trim().toLowerCase()
    if (v) set.add(v)
  })
  return Array.from(set)
}

function extractSkillsFromText(text: string): string[] {
  // naive extraction: split by non-letters, filter length>1
  return Array.from(
    new Set(
      (text || "")
        .toLowerCase()
        .split(/[^a-z0-9+#.\-]/g)
        .filter((t) => t && t.length > 1)
    )
  ).slice(0, 200)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { jobDescription, keySkills = [], limit = 50, offset = 0, minScore = 0, minOverlap = 1, locationContains = "", minYears = 0 } = await request.json()

    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json({ message: "jobDescription is required" }, { status: 400 })
    }

    await connectDB()

    const skills = normalizeSkills(keySkills)
    const inferred = extractSkillsFromText(jobDescription).slice(0, 50)
    const requiredSkills = Array.from(new Set([...
      skills,
      ...inferred,
    ])).slice(0, 50)

    // Load talent pool: profiles and their latest processed resume if available
    const profiles = await JobSeekerProfile.find({},
      "userId firstName lastName email skills summary atsScore location yearsOfExperience"
    ).lean()

    const userIds = profiles.map((p: any) => p.userId)

    const resumes = await Resume.find(
      { userId: { $in: userIds }, status: "processed" },
      "userId fileName rawText parsedSkills atsScore uploadedAt"
    )
      .sort({ uploadedAt: -1 })
      .lean()

    const latestResumeByUser = new Map<string, any>()
    for (const r of resumes) {
      const id = String(r.userId)
      if (!latestResumeByUser.has(id)) latestResumeByUser.set(id, r)
    }

    // Seed candidate pool
    type Candidate = {
      userId: string
      name: string
      email: string
      profileSkills: string[]
      resume?: any
      atsScore?: number
    }
    const pool: Candidate[] = profiles.map((p: any) => ({
      userId: String(p.userId),
      name: [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email,
      email: p.email,
      profileSkills: normalizeSkills(p.skills),
      resume: latestResumeByUser.get(String(p.userId)),
      atsScore: p.atsScore ?? latestResumeByUser.get(String(p.userId))?.atsScore,
    }))

    // Pre-filter: keep those with any overlap or a resume present
    const requiredSet = new Set(requiredSkills)
    const loc = String(locationContains || "").toLowerCase().trim()
    const minY = Math.max(0, Number(minYears) || 0)
    const prefiltered = pool.filter((c) => {
      const resumeSkills = normalizeSkills(c.resume?.parsedSkills)
      const overlapCount = [...resumeSkills, ...c.profileSkills].filter((s) => requiredSet.has(s)).length
      const overlap = overlapCount >= Math.max(0, Number(minOverlap) || 0)
      const locationOk = !loc || String((c as any).location || "").toLowerCase().includes(loc)
      const expOk = (c as any).yearsOfExperience === undefined || Number((c as any).yearsOfExperience || 0) >= minY
      return (overlap || !!c.resume) && locationOk && expOk
    })

    // Score candidates with AI + keyword boost
    const hardLimit = Math.min(Math.max(Number(limit) || 50, 1), 200)
    const start = Math.max(0, Number(offset) || 0)
    const scored = [] as any[]

    for (const c of prefiltered) {
      const resumeText = c.resume?.rawText || ""
      const analysis = await aiService.analyzeResume(resumeText, jobDescription, requiredSkills)
      const aiScore = analysis.score
      const ats = typeof c.atsScore === "number" ? c.atsScore : analysis.atsScore

      const skillsMatch = analysis.skillsMatch || []
      // Simple keyword boost based on overlap count, capped at +10
      const resumeSkills = normalizeSkills(c.resume?.parsedSkills)
      const overlapCount = resumeSkills.filter((s: string) => requiredSet.has(s)).length +
        c.profileSkills.filter((s: string) => requiredSet.has(s)).length
      const boost = Math.min(overlapCount, 10)
      const finalScore = Math.max(0, Math.min(100, Math.round(aiScore + boost)))

      // Filter out obviously irrelevant profiles and user-defined minimums
      if (finalScore < Math.max(0, Number(minScore) || 0) && skillsMatch.length === 0) continue

      scored.push({
        userId: c.userId,
        name: c.name,
        email: c.email,
        resumeFile: c.resume?.fileName || null,
        aiMatchScore: finalScore,
        atsScore: typeof ats === "number" ? Math.round(ats) : undefined,
        skillsMatched: skillsMatch,
        snippet: resumeText ? (resumeText.slice(0, 300)) : undefined,
      })
    }

    scored.sort((a, b) => (b.aiMatchScore || 0) - (a.aiMatchScore || 0))

    const total = scored.length
    const sliced = scored.slice(start, start + hardLimit)

    return NextResponse.json({ total, offset: start, limit: hardLimit, candidates: sliced })
  } catch (error) {
    console.error("AI matching error:", error)
    return NextResponse.json({ message: "Failed to run matching" }, { status: 500 })
  }
}
