import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import CollegeStudentRegistration from "@/models/CollegeStudentRegistration"
import User from "@/models/User"
import Notification from "@/models/Notification"
import {
  createCollegeStudentAccount,
  sendCollegeStudentWelcomeEmail,
} from "@/lib/college-onboard-student"

function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

async function getApplicationForCollege(id: string, collegeId: string) {
  return CollegeStudentRegistration.findOne({ _id: id, collegeId })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(_request)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const app = await getApplicationForCollege(params.id, session!.userId)
    if (!app) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 })
    }
    return NextResponse.json(app)
  } catch (error) {
    return NextResponse.json({ message: "Failed to load application" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(request)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const action = body.action as "approve" | "reject"
    if (!action) {
      return NextResponse.json({ message: "action is required" }, { status: 400 })
    }

    await connectDB()
    const application = await getApplicationForCollege(params.id, session!.userId)
    if (!application) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 })
    }

    if (application.status !== "pending") {
      return NextResponse.json({ message: `Application already ${application.status}` }, { status: 400 })
    }

    if (action === "reject") {
      application.status = "rejected"
      application.reviewedAt = new Date()
      application.reviewedBy = session!.userId as unknown as typeof application.reviewedBy
      application.rejectionReason = body.reason?.trim() || "Not approved by placement cell"
      await application.save()

      return NextResponse.json({ message: "Application rejected", application })
    }

    const collegeUser = await User.findById(session!.userId).lean() as { collegeName?: string; name?: string } | null
    const collegeName = collegeUser?.collegeName || collegeUser?.name || "Your College"

    const { student, temporaryPassword } = await createCollegeStudentAccount({
      collegeId: session!.userId,
      collegeName,
      name: application.name,
      email: application.email,
      phone: application.phone,
      department: application.department,
      batch: application.batch,
      skills: application.skills,
      cgpa: application.cgpa,
      marks10th: application.marks10th,
      marks12th: application.marks12th,
      backlogs: application.backlogs,
      linkedinUrl: application.linkedinUrl,
    })

    application.status = "approved"
    application.reviewedAt = new Date()
    application.reviewedBy = session!.userId as unknown as typeof application.reviewedBy
    application.createdUserId = student._id
    await application.save()

    const emailSent = await sendCollegeStudentWelcomeEmail({
      to: application.email,
      name: application.name,
      collegeName,
      email: application.email,
      temporaryPassword,
    })

    await Notification.create({
      userId: session!.userId,
      type: "application_status_update",
      message: `${application.name} approved and onboarded as job seeker.`,
      relatedEntity: { id: student._id, type: "user" },
    }).catch(() => null)

    return NextResponse.json({
      message: "Student approved and account created",
      emailSent,
      temporaryPassword,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
      },
      application,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process application"
    console.error("[student-applications POST]", error)
    return NextResponse.json({ message }, { status: 500 })
  }
}
