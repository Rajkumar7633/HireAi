import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { aiService } from "@/lib/ai-service"
import Resume from "@/models/Resume"
import JobSeekerProfile from "@/models/JobSeekerProfile"
import mongoose from "mongoose"
import { extractSkillsFromText } from "@/lib/skill-gap-utils"

function getSkillGapModel() {
  if (mongoose.models.SkillGapAnalysis) return mongoose.models.SkillGapAnalysis
  const schema = new mongoose.Schema(
    {
      userId: { type: String, required: true, index: true },
      jobTitle: { type: String, required: true },
      jobDescription: { type: String, default: "" },
      resumeText: { type: String, default: "" },
      currentSkills: [String],
      requiredSkills: [String],
      missingSkills: [
        {
          skill: String,
          importance: { type: String, enum: ["critical", "important", "nice-to-have"] },
          estimatedWeeks: Number,
          resources: [{ title: String, url: String, type: String }],
        },
      ],
      matchScore: Number,
      readinessLevel: String,
      summary: String,
      learningPath: [
        { week: Number, focus: String, skills: [String], resources: [String] },
      ],
    },
    { timestamps: true },
  )
  schema.index({ userId: 1, createdAt: -1 })
  return mongoose.model("SkillGapAnalysis", schema)
}

async function loadCandidateContext(userId: string) {
  const [latestResume, profile] = await Promise.all([
    Resume.findOne({ userId, status: "processed" }).sort({ uploadedAt: -1 }).lean(),
    JobSeekerProfile.findOne({ userId })
      .select("skills desiredRole currentTitle summary experiences projects")
      .lean(),
  ])

  const profileSkills: string[] = (profile as any)?.skills || []
  const resumeSkills: string[] =
    (latestResume as any)?.parsedSkills ||
    (latestResume as any)?.extractedData?.skills ||
    []
  const resumeText: string = (latestResume as any)?.rawText || ""

  const profileText = [
    (profile as any)?.summary,
    (profile as any)?.desiredRole,
    (profile as any)?.currentTitle,
    ...((profile as any)?.experiences || []).map(
      (e: any) => `${e.role || ""} ${e.company || ""} ${e.description || ""}`,
    ),
    ...((profile as any)?.projects || []).map(
      (p: any) => `${p.title || ""} ${p.description || ""} ${(p.tags || []).join(" ")}`,
    ),
  ]
    .filter(Boolean)
    .join("\n")

  const allSkills = Array.from(new Set([...profileSkills, ...resumeSkills]))
  const combinedText = [resumeText, profileText, allSkills.join(", ")].filter(Boolean).join("\n\n")

  return {
    resumeText,
    profileText,
    combinedText,
    profileSkills: allSkills,
    hasResume: !!latestResume,
    resumeFileName: (latestResume as any)?.fileName || null,
    desiredRole: (profile as any)?.desiredRole || "",
    currentTitle: (profile as any)?.currentTitle || "",
  }
}

function formatAnalysis(doc: any) {
  return {
    analysisId: doc._id?.toString(),
    jobTitle: doc.jobTitle,
    jobDescription: doc.jobDescription,
    matchScore: doc.matchScore,
    readinessLevel: doc.readinessLevel,
    currentSkills: doc.currentSkills || [],
    requiredSkills: doc.requiredSkills || [],
    missingSkills: doc.missingSkills || [],
    learningPath: doc.learningPath || [],
    summary: doc.summary || "",
    createdAt: doc.createdAt,
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const SkillGapAnalysis = getSkillGapModel()
    const body = await request.json()
    const { action = "analyze" } = body

    if (action === "analyze") {
      const {
        jobTitle,
        jobDescription = "",
        resumeText: providedResume = "",
        useProfile = true,
      } = body

      if (!jobTitle?.trim()) {
        return NextResponse.json({ message: "jobTitle is required" }, { status: 400 })
      }

      const context = await loadCandidateContext(session.userId)
      let resumeText = providedResume?.trim() || ""
      if (!resumeText && useProfile) {
        resumeText = context.combinedText
      }

      if (!resumeText) {
        return NextResponse.json(
          {
            message: "No resume or profile data found. Upload a resume or paste your skills.",
            needsResume: true,
          },
          { status: 400 },
        )
      }

      const analysis = await performSkillGapAnalysis(jobTitle.trim(), jobDescription, resumeText, context.profileSkills)

      const saved = await (SkillGapAnalysis as any).create({
        userId: session.userId,
        jobTitle: jobTitle.trim(),
        jobDescription,
        resumeText: resumeText.slice(0, 8000),
        ...analysis,
      })

      return NextResponse.json({
        ...formatAnalysis(saved.toObject()),
        contextUsed: {
          hasResume: context.hasResume,
          resumeFileName: context.resumeFileName,
          profileSkillsCount: context.profileSkills.length,
        },
      })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Skill gap analysis error:", error)
    return NextResponse.json({ message: "Skill gap analysis failed" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const SkillGapAnalysis = getSkillGapModel()
    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get("id")

    if (analysisId) {
      const doc = await (SkillGapAnalysis as any).findOne({ _id: analysisId, userId: session.userId }).lean()
      if (!doc) return NextResponse.json({ message: "Analysis not found" }, { status: 404 })
      return NextResponse.json({ analysis: formatAnalysis(doc) })
    }

    const [analyses, context] = await Promise.all([
      (SkillGapAnalysis as any).find({ userId: session.userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      loadCandidateContext(session.userId),
    ])

    const scores = analyses.map((a: any) => a.matchScore || 0).filter(Boolean)
    const avgMatch = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
    const bestMatch = scores.length ? Math.max(...scores) : 0
    const totalGaps = analyses.reduce((n: number, a: any) => n + (a.missingSkills?.length || 0), 0)

    return NextResponse.json({
      stats: {
        totalAnalyses: analyses.length,
        averageMatch: avgMatch,
        bestMatch,
        totalGapsIdentified: totalGaps,
        weeklyAnalyses: analyses.filter((a: any) => {
          return Date.now() - new Date(a.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000
        }).length,
      },
      context: {
        hasResume: context.hasResume,
        resumeFileName: context.resumeFileName,
        profileSkills: context.profileSkills,
        desiredRole: context.desiredRole,
        currentTitle: context.currentTitle,
        combinedPreview: context.combinedText.slice(0, 600),
      },
      analyses: analyses.map((a: any) => ({
        id: a._id.toString(),
        jobTitle: a.jobTitle,
        matchScore: a.matchScore,
        readinessLevel: a.readinessLevel,
        gapsCount: a.missingSkills?.length || 0,
        currentSkillsCount: a.currentSkills?.length || 0,
        createdAt: a.createdAt,
      })),
    })
  } catch (error) {
    console.error("Skill gap GET error:", error)
    return NextResponse.json({ message: "Failed to fetch analyses" }, { status: 500 })
  }
}

async function performSkillGapAnalysis(
  jobTitle: string,
  jobDescription: string,
  resumeText: string,
  profileSkills: string[] = [],
) {
  try {
    const mdl = await (aiService as any).ensureModel?.()
    if (mdl?.generateText && mdl?.model) {
      const prompt = `You are a career coach and skill gap analyst. Analyze the gap between this candidate and the target job.

Job Title: ${jobTitle}
Job Description: ${jobDescription.slice(0, 1500)}

Candidate Resume/Profile:
${resumeText.slice(0, 3000)}

Known profile skills: ${profileSkills.join(", ")}

Return ONLY valid JSON:
{
  "matchScore": <0-100>,
  "readinessLevel": "Ready|Almost Ready|Needs Work|Major Gap",
  "currentSkills": ["skill1", "skill2"],
  "requiredSkills": ["skill1", "skill2"],
  "missingSkills": [
    {
      "skill": "skill name",
      "importance": "critical|important|nice-to-have",
      "estimatedWeeks": 4,
      "resources": [{"title": "Resource Name", "type": "course|book|practice|certification", "url": ""}]
    }
  ],
  "learningPath": [
    {"week": 1, "focus": "focus area", "skills": ["skill1"], "resources": ["resource1"]},
    {"week": 2, "focus": "...", "skills": ["skill2"], "resources": ["resource2"]}
  ],
  "summary": "2-3 sentence overview"
}`

      const result = await mdl.generateText({ model: mdl.model, prompt, maxTokens: 1400 })
      const parsed = JSON.parse(result.text.replace(/```json\n?|\n?```/g, "").trim())
      return normalizeAnalysis(parsed)
    }
  } catch (e) {
    console.warn("AI skill gap failed, using heuristic:", e)
  }

  return heuristicSkillGap(jobTitle, jobDescription, resumeText, profileSkills)
}

function normalizeAnalysis(parsed: any) {
  return {
    matchScore: Math.min(100, Math.max(0, parsed.matchScore || 50)),
    readinessLevel: parsed.readinessLevel || "Needs Work",
    currentSkills: parsed.currentSkills || [],
    requiredSkills: parsed.requiredSkills || [],
    missingSkills: (parsed.missingSkills || []).map((s: any) => ({
      skill: s.skill,
      importance: s.importance || "important",
      estimatedWeeks: s.estimatedWeeks || 4,
      resources: (s.resources || []).map((r: any) => ({
        title: r.title || "Learn resource",
        type: r.type || "course",
        url: r.url || "",
      })),
    })),
    learningPath: parsed.learningPath || [],
    summary: parsed.summary || "",
  }
}

function heuristicSkillGap(
  jobTitle: string,
  jobDescription: string,
  resumeText: string,
  profileSkills: string[] = [],
) {
  const combined = `${resumeText} ${profileSkills.join(" ")}`.toLowerCase()
  const jdLower = `${jobTitle} ${jobDescription}`.toLowerCase()

  const skillSets: Record<string, string[]> = {
    frontend: ["React", "TypeScript", "CSS", "HTML", "Next.js", "Testing", "Performance"],
    backend: ["Node.js", "Python", "SQL", "REST APIs", "Docker", "System Design", "Security"],
    fullstack: ["React", "Node.js", "TypeScript", "SQL", "Docker", "Git", "REST APIs"],
    software: ["JavaScript", "TypeScript", "Git", "SQL", "REST APIs", "Problem Solving", "System Design"],
    data: ["Python", "SQL", "Machine Learning", "Data Visualization", "Statistics", "Excel"],
    devops: ["Docker", "Kubernetes", "CI/CD", "AWS", "Linux", "Monitoring"],
    product: ["Roadmapping", "Analytics", "User Research", "Agile", "Stakeholder Management"],
    machine: ["Python", "Machine Learning", "Statistics", "SQL", "TensorFlow", "MLOps"],
  }

  const detected =
    Object.entries(skillSets).find(([k]) => jdLower.includes(k)) ||
    Object.entries(skillSets).find(([k]) => jobTitle.toLowerCase().includes(k))

  let requiredSkills = detected ? detected[1] : extractSkillsFromText(jdLower)
  if (requiredSkills.length < 4) {
    requiredSkills = ["Communication", "Problem Solving", "Teamwork", "Git", "SQL", "JavaScript"]
  }

  const fromProfile = profileSkills.filter(Boolean)
  const matchedFromResume = requiredSkills.filter(s => combined.includes(s.toLowerCase()))
  const currentSkills = Array.from(new Set([
    ...matchedFromResume,
    ...fromProfile.filter(s =>
      requiredSkills.some(r => r.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(r.toLowerCase())),
    ),
  ]))

  const missingSkills = requiredSkills
    .filter(s => !currentSkills.some(c => c.toLowerCase() === s.toLowerCase()))
    .map((s, i) => ({
      skill: s,
      importance: (i < 2 ? "critical" : i < 4 ? "important" : "nice-to-have") as "critical" | "important" | "nice-to-have",
      estimatedWeeks: i < 2 ? 6 : 4,
      resources: [
        { title: `${s} — freeCodeCamp / Coursera`, type: "course", url: `https://www.google.com/search?q=learn+${encodeURIComponent(s)}+course` },
      ],
    }))

  const matchScore = Math.round((currentSkills.length / requiredSkills.length) * 100)

  return {
    matchScore,
    readinessLevel:
      matchScore >= 80 ? "Ready" : matchScore >= 60 ? "Almost Ready" : matchScore >= 40 ? "Needs Work" : "Major Gap",
    currentSkills,
    requiredSkills,
    missingSkills,
    learningPath: missingSkills.slice(0, 5).map((s, i) => ({
      week: (i + 1) * 2,
      focus: `Build proficiency in ${s.skill}`,
      skills: [s.skill],
      resources: s.resources.map(r => r.title),
    })),
    summary: `You match ${matchScore}% of requirements for ${jobTitle}. Close ${missingSkills.length} skill gap(s) to become a stronger candidate.`,
  }
}
