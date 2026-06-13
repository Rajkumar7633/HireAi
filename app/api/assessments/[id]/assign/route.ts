import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Assessment from "@/models/Assessment"
import Application from "@/models/Application"
import Notification from "@/models/Notification"
import User from "@/models/User"
import { sendAssessmentEmail } from "@/lib/email-service"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.role !== "recruiter" && session.role !== "admin") {
      return NextResponse.json({ error: "Only recruiters can assign assessments" }, { status: 403 })
    }

    await connectDB()

    const assessment = await Assessment.findById(params.id)
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    }

    // Only the creator (or admin) can assign
    if (session.role === "recruiter" && assessment.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { candidateEmail, candidateName, scheduledDate } = body

    if (!candidateEmail) {
      return NextResponse.json({ error: "candidateEmail is required" }, { status: 400 })
    }

    const candidate = await User.findOne({ email: candidateEmail.toLowerCase().trim() })
    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found. They must be registered." }, { status: 404 })
    }

    // Create or update Application record
    let application = await Application.findOne({
      jobSeekerId: candidate._id,
      assessmentId: assessment._id,
    })

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    if (application) {
      // Re-assign if previously completed/expired
      if (!["in_progress", "Assessment Assigned"].includes(application.status)) {
        await Application.findByIdAndUpdate(application._id, {
          status: "Assessment Assigned",
          assignedBy: session.userId,
          assignedAt: new Date(),
          expiresAt,
        })
      }
    } else {
      application = await Application.create({
        jobSeekerId: candidate._id,
        applicantId: candidate._id,
        assessmentId: assessment._id,
        assignedBy: session.userId,
        assignedAt: new Date(),
        expiresAt,
        status: "Assessment Assigned",
      })
    }

    // Send notification to candidate
    await Notification.create({
      userId: candidate._id,
      type: "assessment_assigned",
      message: `You have been assigned a new assessment: "${assessment.title}". Complete it before ${expiresAt.toDateString()}.`,
      relatedEntity: { id: assessment._id, type: "assessment" },
    }).catch(() => {})

    // Send email
    const testLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/job-seeker/assessments/${params.id}/take`
    const emailPayload = {
      to: candidateEmail,
      subject: `Assessment Invitation: ${assessment.title}`,
      template: "assessment-invitation",
      data: {
        candidateName: candidateName || candidate.name || "Candidate",
        assessmentTitle: assessment.title,
        assessmentDescription: assessment.description,
        testLink,
        scheduledDate,
        duration: assessment.durationMinutes,
        company: "HireAI",
        instructions: "Please complete the assessment before the deadline.",
      },
    }
    await sendAssessmentEmail(emailPayload).catch(() => {})

    // Track in assignedCandidates array on the Assessment
    await Assessment.findByIdAndUpdate(params.id, {
      $push: {
        assignedCandidates: {
          candidateId: candidate._id,
          candidateEmail,
          candidateName: candidateName || candidate.name,
          assignedAt: new Date(),
          scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
          status: "assigned",
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: "Assessment assigned successfully",
      testLink,
      candidateName: candidateName || candidate.name,
      candidateEmail,
    })
  } catch (error) {
    console.error("Error assigning assessment:", error)
    return NextResponse.json({ error: "Failed to assign assessment" }, { status: 500 })
  }
}
