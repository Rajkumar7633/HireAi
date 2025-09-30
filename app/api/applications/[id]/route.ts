import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import EmailTemplate from "@/models/EmailTemplate"
import User from "@/models/User"
import JobDescription from "@/models/JobDescription"
import { sendEmail, renderTemplate } from "@/lib/email-service"

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

    if (!application) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 })
    }

    // Check authorization
    if (session.role === "job_seeker" && application.jobSeekerId.toString() !== session.userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ application })
  } catch (error) {
    console.error("Error fetching application:", error)
    return NextResponse.json({ message: "Failed to fetch application" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const before = await Application.findById(params.id)
    const application = await Application.findByIdAndUpdate(params.id, body, { new: true })

    if (!application) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 })
    }

    // Auto-email on status changes
    if (process.env.EMAIL_AUTOSEND === "true" && body.status && before && before.status !== body.status) {
      try {
        const appLean = await Application.findById(params.id).lean()
        const user = await User.findById(appLean?.jobSeekerId).select("email name").lean()
        const job = await JobDescription.findById(appLean?.jobDescriptionId).select("title").lean()
        if (user?.email) {
          const vars = {
            candidateName: user.name || "Candidate",
            jobTitle: job?.title || "the role",
            companyName: process.env.COMPANY_NAME || "Our Company",
          }
          let tplName: string | null = null
          if (body.status === "Rejected") tplName = "Application Rejection"
          else if (body.status === "Interview Scheduled") tplName = "Interview Invitation"
          else if (body.status === "Shortlisted") tplName = "Shortlisted for Next Round"

          if (tplName) {
            const tpl = await EmailTemplate.findOne({ name: tplName }).lean()
            if (tpl) {
              const subject = renderTemplate(tpl.subject, vars)
              const htmlRaw = renderTemplate(tpl.content, vars)
              const html = htmlRaw.includes("<") ? htmlRaw : htmlRaw.replaceAll("\n", "<br/>")
              await sendEmail({ to: user.email, subject, html })
            }
          }
        }
      } catch (e) {
        console.error("auto-email on status change failed", e)
      }
    }

    return NextResponse.json({ application })
  } catch (error) {
    console.error("Error updating application:", error)
    return NextResponse.json({ message: "Failed to update application" }, { status: 500 })
  }
}
