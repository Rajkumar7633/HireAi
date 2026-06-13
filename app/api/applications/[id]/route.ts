import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Notification from "@/models/Notification"
import EmailTemplate from "@/models/EmailTemplate"
import User from "@/models/User"
import JobDescription from "@/models/JobDescription"
import { sendEmail } from "@/lib/email-service"
import { renderTemplate } from "@/lib/template-render"

function getIdString(value: unknown): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id)
  }
  return String(value)
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const application = await Application.findById(params.id)
      .populate("jobDescriptionId", "title location")
      .populate("resumeId", "filename")
      .populate("testId")
      .populate("jobSeekerId", "name email")
      .populate("assessmentId", "title questions durationMinutes totalQuestions totalPoints")

    if (!application) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 })
    }

    if (session.role === "job_seeker" && getIdString(application.jobSeekerId) !== session.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ application })
  } catch (error) {
    console.error("Error fetching application:", error)
    return NextResponse.json({ message: "Failed to fetch application" }, { status: 500 })
  }
}

// Allowlisted fields a recruiter can update
const ALLOWED_STATUS_VALUES = [
  "Pending", "Under Review", "Shortlisted", "Rejected",
  "Interview Scheduled", "Hired", "Test Assigned", "Test Passed", "Test Failed",
] as const

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json().catch(() => ({}))
    const { status, notes } = body

    // Validate the status value if provided
    if (status && !ALLOWED_STATUS_VALUES.includes(status)) {
      return NextResponse.json({ message: "Invalid status value" }, { status: 400 })
    }

    const before = await Application.findById(params.id).lean() as any
    if (!before) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 })
    }

    // Only update allowed fields — never the raw body
    const updateFields: Record<string, unknown> = {}
    if (status) updateFields.status = status
    if (typeof notes === "string") updateFields.notes = notes.trim()

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ message: "No valid fields to update" }, { status: 400 })
    }

    const application = await Application.findByIdAndUpdate(
      params.id,
      { $set: updateFields },
      { new: true },
    )

    // In-app notification to candidate on status change
    if (status && before.status !== status) {
      await Notification.create({
        userId: before.jobSeekerId,
        type: "application_status_update",
        message: `Your application status has been updated to "${status}".`,
        relatedEntity: { id: before._id, type: "job_application" },
      }).catch(() => {})

      // Auto-email on selected status changes
      if (process.env.EMAIL_AUTOSEND === "true") {
        try {
          const user = await User.findById(before.jobSeekerId).select("email name").lean() as any
          const job = await JobDescription.findById(before.jobDescriptionId).select("title").lean() as any
          if (user?.email) {
            const vars = {
              candidateName: (user as any).name || "Candidate",
              jobTitle: (job as any)?.title || "the role",
              companyName: process.env.COMPANY_NAME || "Our Company",
            }
            let tplName: string | null = null
            if (status === "Rejected") tplName = "Application Rejection"
            else if (status === "Interview Scheduled") tplName = "Interview Invitation"
            else if (status === "Shortlisted") tplName = "Shortlisted for Next Round"

            if (tplName) {
              const tpl = await EmailTemplate.findOne({ name: tplName }).lean()
              if (tpl) {
                const subject = renderTemplate((tpl as any).subject, vars)
                const htmlRaw = renderTemplate((tpl as any).content, vars)
                const html = htmlRaw.includes("<") ? htmlRaw : htmlRaw.replaceAll("\n", "<br/>")
                await sendEmail({ to: (user as any).email, subject, html })
              }
            }
          }
        } catch (e) {
          console.error("auto-email on status change failed", e)
        }
      }
    }

    return NextResponse.json({ application })
  } catch (error) {
    console.error("Error updating application:", error)
    return NextResponse.json({ message: "Failed to update application" }, { status: 500 })
  }
}
