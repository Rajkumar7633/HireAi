import { type NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Test from "@/models/Test"
import User from "@/models/User"
import Application from "@/models/Application"
import Resume from "@/models/Resume"
import Notification from "@/models/Notification"
import { sendEmail } from "@/lib/email-service"
import { getAssignedApplicationsForTest } from "@/lib/test-assignment-stats"
export { dynamic } from "@/lib/api-dynamic"


type InviteStatus = "notified" | "not_registered" | "already_assigned" | "error"

interface InviteInput {
  email: string
  name?: string
}

function getPendingInviteModel() {
  const schema = new mongoose.Schema(
    {
      testId: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      name: String,
      recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      message: String,
      deadline: Date,
      invitedAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
  )
  schema.index({ testId: 1, email: 1 }, { unique: true })
  return mongoose.models.TestPendingInvite || mongoose.model("TestPendingInvite", schema)
}

function getTestOwnerId(test: any): string | null {
  return test.recruiterId?.toString() || test.createdBy?.toString() || null
}

async function assignTestToJobSeeker(
  user: any,
  test: any,
  session: { userId: string },
  message?: string,
  deadline?: string,
) {
  const existing = await Application.findOne({
    jobSeekerId: user._id,
    testId: test._id,
  })

  if (existing) {
    return { application: existing, alreadyAssigned: true }
  }

  let application = await Application.findOne({
    jobSeekerId: user._id,
    $or: [{ testId: { $exists: false } }, { testId: null }],
  })

  const roundStage = "test_round"
  const roundName = "Coding Test"
  const now = new Date()

  if (!application) {
    const latestResume = (await Resume.findOne({ userId: user._id, status: "processed" })
      .sort({ uploadedAt: -1 })
      .select("_id")
      .lean()) as any

    application = await Application.create({
      jobSeekerId: user._id,
      applicantId: user._id,
      resumeId: latestResume?._id,
      status: "Test Assigned",
      applicationDate: now,
      appliedAt: now,
      testId: test._id,
      assignedBy: session.userId,
      assignedAt: now,
      currentStage: roundStage,
      rounds: [
        {
          roundName,
          stageKey: roundStage,
          testId: test._id,
          submissions: [],
          status: "in_progress",
        },
      ],
    })
  } else {
    application.testId = test._id
    application.status = "Test Assigned" as any
    application.assignedBy = session.userId as any
    application.assignedAt = now
    if (!(application as any).currentStage) {
      ;(application as any).currentStage = roundStage
    }

    const rounds: any[] = Array.isArray((application as any).rounds) ? (application as any).rounds : []
    let round = rounds.find((r: any) => r?.stageKey === roundStage)
    if (!round) {
      round = { roundName, stageKey: roundStage, testId: test._id, submissions: [], status: "in_progress" }
      rounds.push(round)
    } else {
      round.roundName = round.roundName || roundName
      round.testId = test._id
      round.status = "in_progress"
    }
    ;(application as any).rounds = rounds
    await application.save()
  }

  const customMsg = message?.trim()
    ? message.trim()
    : `You have been assigned the coding test: "${test.title}".`

  const deadlineNote = deadline
    ? ` Please complete it by ${new Date(deadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}.`
    : " Please complete it at your earliest convenience."

  await Notification.create({
    userId: user._id,
    type: "test_assigned",
    message: `${customMsg}${deadlineNote}`,
    relatedEntity: { id: test._id, type: "test" },
  }).catch(() => {})

  return { application, alreadyAssigned: false }
}

function normalizeInvites(body: any): InviteInput[] {
  if (Array.isArray(body.invites) && body.invites.length > 0) {
    return body.invites
      .map((item: any) => ({
        email: String(item.email || "").trim().toLowerCase(),
        name: item.name?.trim() || undefined,
      }))
      .filter((item: InviteInput) => item.email)
  }

  if (Array.isArray(body.emails) && body.emails.length > 0) {
    const names: Record<string, string> = body.names || {}
    return body.emails
      .map((raw: string) => {
        const email = String(raw || "").trim().toLowerCase()
        return { email, name: names[email]?.trim() || undefined }
      })
      .filter((item: InviteInput) => item.email)
  }

  return []
}

// POST /api/tests/[id]/invite
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const testId = params.id
    const body = await request.json()
    const { message, deadline } = body
    const invites = normalizeInvites(body)

    if (invites.length === 0) {
      return NextResponse.json({ message: "At least one email is required" }, { status: 400 })
    }

    const test: any = await Test.findById(testId)
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    const ownerId = getTestOwnerId(test)
    if (ownerId && ownerId !== session.userId) {
      return NextResponse.json({ message: "You can only assign your own tests" }, { status: 403 })
    }

    const PendingInvite = getPendingInviteModel()
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const results: Array<{
      email: string
      status: InviteStatus
      userId?: string
      name?: string
      message?: string
    }> = []

    for (const invite of invites) {
      const email = invite.email
      if (!email) continue

      try {
        const user: any = await User.findOne({ email: email.toLowerCase() })

        if (user?.role === "job_seeker") {
          const { alreadyAssigned, application } = await assignTestToJobSeeker(
            user,
            test,
            session,
            message,
            deadline,
          )

          if (alreadyAssigned) {
            results.push({
              email,
              status: "already_assigned",
              userId: user._id.toString(),
              name: user.name || invite.name,
              message: "This candidate already has this test assigned.",
            })
            continue
          }

          results.push({
            email,
            status: "notified",
            userId: user._id.toString(),
            name: user.name || invite.name,
          })

          // Best-effort email notification
          try {
            await sendEmail({
              to: email,
              subject: `Coding test assigned: ${test.title}`,
              html: `
                <p>Hi ${invite.name || user.name || "there"},</p>
                <p>You have been assigned a coding test on HireAI: <strong>${test.title}</strong>.</p>
                <p><a href="${appBaseUrl}/dashboard/job-seeker/tests">Open your tests dashboard</a></p>
              `,
            })
          } catch {
            // In-app notification is the primary channel
          }

          void application
        } else if (user) {
          results.push({
            email,
            status: "not_registered",
            name: invite.name,
            message: "This email belongs to a non job-seeker account.",
          })
        } else {
          await PendingInvite.findOneAndUpdate(
            { testId: test._id, email },
            {
              $set: {
                name: invite.name,
                recruiterId: session.userId,
                message: message?.trim() || undefined,
                deadline: deadline ? new Date(deadline) : undefined,
                invitedAt: new Date(),
              },
            },
            { upsert: true, new: true },
          )

          results.push({
            email,
            status: "not_registered",
            name: invite.name,
            message: "Invite saved. Candidate will see it after they register with this email.",
          })
        }
      } catch (err: any) {
        console.error("Invite error for", email, err)
        results.push({
          email,
          status: "error",
          name: invite.name,
          message: err?.message || "Failed to process invite",
        })
      }
    }

    const notified = results.filter(r => r.status === "notified").length
    const notRegistered = results.filter(r => r.status === "not_registered").length
    const alreadyAssigned = results.filter(r => r.status === "already_assigned").length
    const errors = results.filter(r => r.status === "error").length

    return NextResponse.json({
      message: `Processed ${invites.length} invite(s): ${notified} assigned, ${alreadyAssigned} already assigned, ${notRegistered} pending registration, ${errors} failed.`,
      results,
      summary: { notified, notRegistered, alreadyAssigned, errors, total: invites.length },
    })
  } catch (error) {
    console.error("Error sending test invites:", error)
    return NextResponse.json({ message: "Failed to send invites" }, { status: 500 })
  }
}

// GET /api/tests/[id]/invite — return list of candidates already assigned to this test
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const applications = await getAssignedApplicationsForTest(params.id)

    const assigned = applications.map(app => {
      const seeker = app.jobSeekerId as any
      const seekerObj = seeker && typeof seeker === "object" ? seeker : null
      return {
        _id: app._id,
        candidateName: seekerObj?.name || app.candidateName || "Unknown",
        candidateEmail: seekerObj?.email || app.candidateEmail || "",
        jobTitle: app.jobTitle || "",
        status: app.status,
        testScore: app.testScore ?? null,
        testCompletedAt: app.testCompletedAt || app.completedAt || null,
        testAssignedAt: app.assignedAt || app.updatedAt,
        jobSeekerId: seekerObj?._id?.toString() || app.jobSeekerId?.toString(),
      }
    })

    return NextResponse.json({ assigned })
  } catch (error) {
    console.error("Error fetching assigned candidates:", error)
    return NextResponse.json({ message: "Failed to fetch assigned candidates" }, { status: 500 })
  }
}
