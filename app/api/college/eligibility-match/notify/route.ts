import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import CampusDrive from "@/models/CampusDrive"
import Notification from "@/models/Notification"
import { sendEmail } from "@/lib/email-service"

function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

type NotifyType = "eligible" | "update_profile" | "invite_external"

function buildEmailHtml(opts: {
  studentName: string
  collegeName: string
  companyName: string
  role: string
  type: NotifyType
  driveLink: string
  customNote?: string
}) {
  const { studentName, collegeName, companyName, role, type, driveLink, customNote } = opts
  const title =
    type === "eligible"
      ? "You are shortlisted for a campus drive"
      : type === "update_profile"
        ? "Action required: update your placement profile"
        : "Invitation to join HireAI placement portal"

  const body =
    type === "eligible"
      ? `<p>You have been shortlisted by <strong>${collegeName}</strong> for the campus drive at <strong>${companyName}</strong> (${role}).</p>
         <p>Please log in to HireAI and check your dashboard for drive details and next steps.</p>`
      : type === "update_profile"
        ? `<p>Your placement cell at <strong>${collegeName}</strong> is preparing shortlists for <strong>${companyName}</strong> (${role}).</p>
         <p>Your profile is missing academic details (CGPA, 10th/12th marks, or backlog info). Please update your profile so you can be considered.</p>`
        : `<p><strong>${collegeName}</strong> has invited you to register on HireAI for campus placement opportunities with <strong>${companyName}</strong>.</p>
           <p>Create your account to be included in future drive shortlists.</p>`

  return `
    <div style="font-family:Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;padding:24px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;font-size:20px;">${title}</h1>
        <p style="margin:8px 0 0;opacity:0.9;">${collegeName}</p>
      </div>
      <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;">
        <p>Hi ${studentName},</p>
        ${body}
        ${customNote ? `<p style="background:#fff;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">${customNote}</p>` : ""}
        <p style="margin-top:20px;">
          <a href="${driveLink}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;">
            Open HireAI
          </a>
        </p>
      </div>
    </div>`
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!requireCollege(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const {
      studentIds = [],
      externalEmails = [],
      notifyType = "eligible",
      driveId,
      companyName: companyOverride,
      role: roleOverride,
      customNote,
    } = body as {
      studentIds?: string[]
      externalEmails?: string[]
      notifyType?: NotifyType
      driveId?: string
      companyName?: string
      role?: string
      customNote?: string
    }

    await connectDB()

    const collegeUser = await User.findById(session!.userId).lean() as any
    const collegeName = collegeUser?.collegeName || collegeUser?.name || "Your College"

    let companyName = companyOverride || "Recruiter"
    let role = roleOverride || "Open role"
    let driveLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/job-seeker/campus-drives`

    if (driveId) {
      const drive = await CampusDrive.findOne({ _id: driveId, collegeId: session!.userId }).lean() as any
      if (drive) {
        companyName = drive.companyName || companyName
        role = drive.role || role
        driveLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/job-seeker/campus-drives`
      }
    }

    const students =
      studentIds.length > 0
        ? await User.find({
            _id: { $in: studentIds },
            onboardedByCollege: session!.userId,
            role: "job_seeker",
          }).select("name email").lean()
        : []

    const results = {
      notifications: 0,
      emailsSent: 0,
      emailsFailed: 0,
      externalInvites: 0,
    }

    for (const s of students) {
      const message =
        notifyType === "eligible"
          ? `Shortlisted for ${companyName} — ${role}. Check campus drives on your dashboard.`
          : `Update your profile (CGPA/marks) to be considered for ${companyName} drive.`

      await Notification.create({
        userId: s._id,
        type: "campus_drive_published",
        message,
        relatedEntity: driveId
          ? { id: driveId, type: "campus_drive" }
          : { type: "campus_drive" },
        read: false,
      }).catch(() => {})
      results.notifications++

      try {
        await sendEmail({
          to: s.email,
          subject:
            notifyType === "eligible"
              ? `Shortlisted: ${companyName} campus drive`
              : `Action required: ${companyName} drive eligibility`,
          html: buildEmailHtml({
            studentName: s.name || "Student",
            collegeName,
            companyName,
            role,
            type: notifyType as NotifyType,
            driveLink,
            customNote,
          }),
        })
        results.emailsSent++
      } catch {
        results.emailsFailed++
      }
    }

    const signupLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/signup`
    for (const email of externalEmails) {
      const trimmed = String(email).trim().toLowerCase()
      if (!trimmed || !trimmed.includes("@")) continue

      const exists = await User.findOne({ email: trimmed }).lean()
      if (exists) continue

      try {
        await sendEmail({
          to: trimmed,
          subject: `${collegeName} invites you to HireAI for ${companyName}`,
          html: buildEmailHtml({
            studentName: "Student",
            collegeName,
            companyName,
            role,
            type: "invite_external",
            driveLink: signupLink,
            customNote,
          }),
        })
        results.externalInvites++
        results.emailsSent++
      } catch {
        results.emailsFailed++
      }
    }

    return NextResponse.json({
      message: "Notifications processed",
      results,
      note:
        results.emailsFailed > 0
          ? "Some emails could not be sent (check SMTP config). In-app notifications were still created."
          : undefined,
    })
  } catch (error) {
    console.error("eligibility notify error:", error)
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 })
  }
}
