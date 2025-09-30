import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { aiService } from "@/lib/ai-service"
import Application from "@/models/Application"
import Resume from "@/models/Resume"
import JobDescription from "@/models/JobDescription"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized. Only job seekers can apply for jobs." }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { jobDescriptionId, resumeId, screeningAnswers, applicationProfile } = body

    if (!jobDescriptionId) {
      return NextResponse.json({ message: "Job ID is required" }, { status: 400 })
    }

    const jobDescription = await JobDescription.findById(jobDescriptionId)
    if (!jobDescription) {
      return NextResponse.json({ message: "Job description not found" }, { status: 404 })
    }

    // Determine whether resume is required based on applicationMode
    const requireResume = (jobDescription.applicationMode || "resume_plus_form") === "resume_only" ||
      (jobDescription.applicationMode || "resume_plus_form") === "resume_plus_form"

    let resume: any = null
    if (requireResume) {
      if (!resumeId) {
        return NextResponse.json({ message: "Resume ID is required for this job" }, { status: 400 })
      }
      resume = await Resume.findById(resumeId)
      if (!resume || resume.userId.toString() !== session.userId) {
        return NextResponse.json({ message: "Resume not found or unauthorized" }, { status: 404 })
      }
    }

    const existingApplication = await Application.findOne({
      jobSeekerId: session.userId,
      jobDescriptionId,
      ...(resumeId ? { resumeId } : {}),
    })

    if (existingApplication) {
      return NextResponse.json({ message: "You have already applied for this job with this resume" }, { status: 400 })
    }

    const application = new Application({
      jobSeekerId: session.userId,
      applicantId: session.userId,
      jobId: jobDescriptionId,
      jobDescriptionId,
      ...(resumeId ? { resumeId } : {}),
      applicationDate: new Date(),
      appliedAt: new Date(),
      status: "Pending",
      screeningAnswers: Array.isArray(screeningAnswers) ? screeningAnswers : undefined,
      applicationProfile: applicationProfile || undefined,
    })

    await application.save()

    // Immediately run AI screening to auto-shortlist at submit time
    try {
      const requiredSkills: string[] = Array.isArray(jobDescription.skillsRequired) && jobDescription.skillsRequired.length > 0
        ? jobDescription.skillsRequired
        : []

      const jobText = [jobDescription.title, jobDescription.description, (jobDescription.requirements || []).join("\n"), (jobDescription.skillsRequired || []).join(", ")]
        .filter(Boolean)
        .join("\n\n")

      let resumeText = ""
      if (resume) {
        // Prefer extracted rawText field
        resumeText = resume.rawText || ""
      }

      // If resume is required but missing text, leave as Pending
      if (resumeText || (jobDescription.applicationMode === "form_only")) {
        const analysis = await aiService.analyzeResume(resumeText, jobText, requiredSkills)
        const aiMatchScore = analysis.score
        const atsScore = analysis.atsScore
        // Prefer per-job thresholds when available, otherwise env, otherwise defaults
        const jobShortlist = Number((jobDescription as any).aiShortlistThreshold)
        const jobAts = Number((jobDescription as any).aiMinAtsScore)
        let shortlistThreshold = 70
        let minAtsScore = 60
        if (!Number.isNaN(jobShortlist)) shortlistThreshold = jobShortlist
        if (!Number.isNaN(jobAts)) minAtsScore = jobAts
        if (Number.isNaN(jobShortlist)) {
          const envShortlist = Number(process.env.AI_SHORTLIST_THRESHOLD)
          if (!Number.isNaN(envShortlist)) shortlistThreshold = envShortlist
        }
        if (Number.isNaN(jobAts)) {
          const envAts = Number(process.env.AI_MIN_ATS_SCORE)
          if (!Number.isNaN(envAts)) minAtsScore = envAts
        }
        const shouldShortlist = aiMatchScore >= shortlistThreshold && atsScore >= minAtsScore

        await Application.updateOne(
          { _id: application._id },
          {
            $set: {
              aiMatchScore,
              atsScore,
              skillsMatched: analysis.skillsMatch || [],
              aiExplanation: (analysis.recommendations || []).slice(0, 2).join(" | "),
              status: shouldShortlist ? "Shortlisted" : "Rejected",
              shortlisted: shouldShortlist,
              missingSkills: (requiredSkills || []).filter((s) => !(analysis.skillsMatch || []).includes(s)),
              ...(shouldShortlist ? { rejectionReason: undefined } : { rejectionReason: (analysis.weaknesses || [])[0] || "Does not meet requirements" }),
            },
          },
        )

        // Reflect updated fields for response (optional freshness)
        ;(application as any).aiMatchScore = aiMatchScore
        ;(application as any).atsScore = atsScore
        ;(application as any).status = shouldShortlist ? "Shortlisted" : "Rejected"
        ;(application as any).shortlisted = shouldShortlist
      }
    } catch (e) {
      console.error("Inline AI screening error (non-fatal):", e)
      // Keep application as-is if AI analysis fails
    }

    return NextResponse.json({ message: "Application submitted successfully", application }, { status: 201 })
  } catch (error) {
    console.error("Error submitting application:", error)
    return NextResponse.json({ message: "Failed to submit application" }, { status: 500 })
  }
}
