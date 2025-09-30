import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Resume from "@/models/Resume"
import JobDescription from "@/models/JobDescription"
import { aiService } from "@/lib/ai-service"

// POST /api/job-descriptions/[id]/auto-screen
// Triggers AI-based screening for all applications to a given job.
// Supports batching to handle 1000+ applications efficiently.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Verify job belongs to recruiter
    const job = await JobDescription.findById(params.id)
    if (!job || job.recruiterId.toString() !== session.userId) {
      return NextResponse.json({ message: "Job not found or unauthorized" }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    let {
      batchSize = 50,
      maxBatches = 100,
      shortlistThreshold = 70, // overall AI match score threshold
      minAtsScore = 60, // minimum ATS score
      dryRun = false, // if true, no DB updates; just compute preview
      targetStatuses = ["Pending", "Under Review"],
    } = body

    // Prefer per-job thresholds over env and request body
    const jobShortlist = Number(job.aiShortlistThreshold)
    const jobAts = Number(job.aiMinAtsScore)
    if (!Number.isNaN(jobShortlist)) shortlistThreshold = jobShortlist
    if (!Number.isNaN(jobAts)) minAtsScore = jobAts

    // Then allow env variables to override request body defaults (if job not set)
    if (Number.isNaN(jobShortlist)) {
      const envShortlist = Number(process.env.AI_SHORTLIST_THRESHOLD)
      if (!Number.isNaN(envShortlist)) shortlistThreshold = envShortlist
    }
    if (Number.isNaN(jobAts)) {
      const envAts = Number(process.env.AI_MIN_ATS_SCORE)
      if (!Number.isNaN(envAts)) minAtsScore = envAts
    }

    // Collect applications for this job that need screening
    const query: any = { jobDescriptionId: params.id, status: { $in: targetStatuses } }
    const total = await Application.countDocuments(query)

    let processed = 0
    let shortlisted = 0
    let rejected = 0
    const preview: any[] = []

    // Precompute job text and required skills
    const jobText: string = [job.title, job.description, (job.requirements || []).join("\n"), (job.skillsRequired || []).join(", ")]
      .filter(Boolean)
      .join("\n\n")

    const requiredSkills: string[] = Array.isArray(job.skillsRequired) && job.skillsRequired.length > 0
      ? job.skillsRequired
      : extractSkillsFromText(`${job.description}\n${(job.requirements || []).join("\n")}`)

    for (let batchIndex = 0; batchIndex < maxBatches; batchIndex++) {
      const apps = await Application.find(query)
        .sort({ applicationDate: 1 })
        .skip(batchIndex * batchSize)
        .limit(batchSize)
        .lean()

      if (!apps || apps.length === 0) break

      // Fetch resumes in one go
      const resumeIds = apps.map((a: any) => a.resumeId).filter(Boolean)
      const resumeMap = new Map<string, any>()
      if (resumeIds.length > 0) {
        const resumes = await Resume.find({ _id: { $in: resumeIds } }, { rawText: 1 }).lean()
        for (const r of resumes) resumeMap.set(String(r._id), r)
      }

      for (const app of apps) {
        const resume = app.resumeId ? resumeMap.get(String(app.resumeId)) : null
        const resumeText = resume?.rawText || ""

        // If the job requires resume and there's none, auto reject
        if (!resumeText && (job.applicationMode === "resume_only" || job.applicationMode === "resume_plus_form")) {
          processed++
          if (!dryRun) {
            await Application.updateOne(
              { _id: app._id },
              {
                $set: {
                  status: "Rejected",
                  shortlisted: false,
                  rejectionReason: "Missing resume",
                  aiMatchScore: 0,
                  atsScore: 0,
                },
              },
            )
          }
          rejected++
          preview.push({ applicationId: String(app._id), decision: "Rejected", reason: "Missing resume" })
          continue
        }

        // Run AI analysis with robust fallback (handled inside aiService)
        const analysis = await aiService.analyzeResume(resumeText, jobText, requiredSkills)

        const aiMatchScore = analysis.score
        const atsScore = analysis.atsScore
        const shouldShortlist = aiMatchScore >= shortlistThreshold && atsScore >= minAtsScore

        if (!dryRun) {
          await Application.updateOne(
            { _id: app._id },
            {
              $set: {
                aiMatchScore,
                atsScore,
                skillsMatched: analysis.skillsMatch || [],
                aiExplanation: buildExplanation(analysis),
                status: shouldShortlist ? "Shortlisted" : "Rejected",
                shortlisted: shouldShortlist,
                missingSkills: (requiredSkills || []).filter((s) => !(analysis.skillsMatch || []).includes(s)),
                ...(shouldShortlist ? { rejectionReason: undefined } : { rejectionReason: suggestRejectionReason(analysis) }),
              },
            },
          )
        }

        processed++
        if (shouldShortlist) shortlisted++
        else rejected++

        preview.push({
          applicationId: String(app._id),
          aiMatchScore,
          atsScore,
          decision: shouldShortlist ? "Shortlisted" : "Rejected",
        })
      }

      // If fewer than batchSize processed in this loop, we've reached the end
      if (apps.length < batchSize) break
    }

    return NextResponse.json(
      {
        jobId: String(job._id),
        total,
        processed,
        shortlisted,
        rejected,
        dryRun,
        preview: preview.slice(0, 100), // do not return massive payloads
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Auto-screen error:", error)
    return NextResponse.json({ message: "Failed to auto-screen applications" }, { status: 500 })
  }
}

function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    "JavaScript",
    "TypeScript",
    "React",
    "Angular",
    "Vue",
    "Node.js",
    "Python",
    "Java",
    "C++",
    "C#",
    "AWS",
    "Azure",
    "GCP",
    "Docker",
    "Kubernetes",
    "Git",
    "SQL",
    "MongoDB",
    "PostgreSQL",
    "Redis",
    "HTML",
    "CSS",
    "REST",
    "GraphQL",
    "Microservices",
    "Agile",
    "Scrum",
    "CI/CD",
    "Testing",
    "DevOps",
  ]
  return commonSkills.filter((s) => text.toLowerCase().includes(s.toLowerCase()))
}

function buildExplanation(a: any): string {
  const parts: string[] = []
  if (Array.isArray(a.strengths) && a.strengths.length) parts.push(`Strengths: ${a.strengths.slice(0, 3).join(", ")}`)
  if (Array.isArray(a.weaknesses) && a.weaknesses.length) parts.push(`Weaknesses: ${a.weaknesses.slice(0, 3).join(", ")}`)
  if (Array.isArray(a.recommendations) && a.recommendations.length)
    parts.push(`Recommendations: ${a.recommendations.slice(0, 2).join(", ")}`)
  return parts.join(" | ")
}

function suggestRejectionReason(a: any): string {
  if (Array.isArray(a.missingSkills) && a.missingSkills.length) return `Missing skills: ${a.missingSkills.slice(0, 3).join(", ")}`
  if (Array.isArray(a.weaknesses) && a.weaknesses.length) return a.weaknesses[0]
  if (Array.isArray(a.suggestions) && a.suggestions.length) return a.suggestions[0]
  return "Does not meet minimum requirements"
}
