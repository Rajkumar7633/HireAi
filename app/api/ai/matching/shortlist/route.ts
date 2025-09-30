import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import EmailTemplate from "@/models/EmailTemplate"
import User from "@/models/User"
import JobDescription from "@/models/JobDescription"
import { sendEmail, renderTemplate } from "@/lib/email-service"
import Resume from "@/models/Resume"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { jobId, candidates } = await request.json()
    if (!jobId || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ message: "jobId and candidates[] are required" }, { status: 400 })
    }

    await connectDB()

    let updated = 0
    let created = 0

    const job = (await JobDescription.findById(jobId).select("title recruiterId").lean()) as any
    const defaultTpl = (await EmailTemplate.findOne({ name: "Shortlisted for Next Round" }).lean().catch(() => null)) as any

    for (const c of candidates) {
      const userId = c.userId || c.jobSeekerId
      if (!userId) continue

      const existing = await Application.findOne({ jobDescriptionId: jobId, jobSeekerId: userId })

      // Try to fetch latest resume to link
      const latestResume = (await Resume.findOne({ userId, status: "processed" }).sort({ uploadedAt: -1 }).select("_id").lean()) as any

      if (existing) {
        await Application.updateOne(
          { _id: existing._id },
          {
            $set: {
              status: "Shortlisted",
              shortlisted: true,
              aiMatchScore: c.aiMatchScore ?? existing.aiMatchScore,
              atsScore: c.atsScore ?? existing.atsScore,
              skillsMatched: c.skillsMatched ?? existing.skillsMatched,
              aiExplanation: c.aiExplanation ?? existing.aiExplanation,
              ...(latestResume?._id ? { resumeId: latestResume._id } : {}),
            },
          },
        )
        updated += 1
      } else {
        await Application.create({
          jobDescriptionId: jobId,
          jobSeekerId: userId,
          applicantId: userId,
          resumeId: latestResume?._id,
          status: "Shortlisted",
          shortlisted: true,
          applicationDate: new Date(),
          appliedAt: new Date(),
          aiMatchScore: c.aiMatchScore ?? undefined,
          atsScore: c.atsScore ?? undefined,
          skillsMatched: c.skillsMatched ?? [],
          aiExplanation: c.aiExplanation ?? undefined,
        })
        created += 1
      }

      // Auto-email if enabled
      if (process.env.EMAIL_AUTOSEND === "true") {
        try {
          const u = (await User.findById(userId).select("email name").lean()) as any
          if (u?.email) {
            const vars = {
              candidateName: u.name || "Candidate",
              jobTitle: job?.title || "the role",
              companyName: process.env.COMPANY_NAME || "Our Company",
            }
            const subject = (defaultTpl?.subject && renderTemplate(defaultTpl.subject, vars)) || `Shortlisted - ${vars.jobTitle}`
            const html = (defaultTpl?.content && renderTemplate(defaultTpl.content, vars)).replaceAll("\n", "<br/>") || `Hi ${vars.candidateName},<br/><br/>You have been shortlisted for ${vars.jobTitle}.<br/><br/>Best,<br/>${vars.companyName}`
            await sendEmail({ to: u.email, subject, html })
          }
        } catch (e) {
          console.error("auto-email shortlist failed", e)
        }
      }
    }

    return NextResponse.json({ updated, created })
  } catch (e) {
    console.error("bulk shortlist error", e)
    return NextResponse.json({ message: "Failed to shortlist candidates" }, { status: 500 })
  }
}
