import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import User from "@/models/User"
import VideoInterview from "@/models/VideoInterview"
import Notification from "@/models/Notification"

type Provider = "in_app" | "external"

function nanoid(len = 10) {
  const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  let id = ""
  for (let i = 0; i < len; i++) id += alphabet[(Math.random() * alphabet.length) | 0]
  return id
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    await connectDB()

    if (session.role === "recruiter") {
      const items = await VideoInterview.find({ recruiterId: session.userId })
        .populate("candidateId", "name email")
        .populate("jobId", "title")
        .sort({ scheduledDate: 1 })
        .limit(50)
        .lean()

      const enriched = items.map((it: any) => ({
        ...it,
        candidateName: it.candidateId?.name || "",
        candidateEmail: it.candidateId?.email || "",
        position: it.jobId?.title || "",
      }))
      return NextResponse.json({ success: true, interviews: enriched })
    }

    // job_seeker view
    const items = await VideoInterview.find({ candidateId: session.userId })
      .populate("candidateId", "name email")
      .populate("jobId", "title")
      .sort({ scheduledDate: 1 })
      .limit(50)
      .lean()

    const enriched = items.map((it: any) => ({
      ...it,
      candidateName: it.candidateId?.name || "",
      candidateEmail: it.candidateId?.email || "",
      position: it.jobId?.title || "",
    }))
    return NextResponse.json({ success: true, interviews: enriched })
  } catch (error) {
    console.error("[video-interviews][GET] error", error)
    return NextResponse.json({ success: false, message: "Failed to load interviews" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    let applicationId = body.applicationId
    const provider: Provider = (body.provider || "in_app").toLowerCase()
    const scheduledAt = body.scheduledAt || body.scheduledDate
    const duration = Number(body.duration || 45)
    const notes = body.notes || ""
    const meetingLink = body.meetingUrl || body.meetingLink || ""
    const candidateEmail: string | undefined = body.candidateEmail
    const jobIdFromBody: string | undefined = body.jobId

    await connectDB()

    // Backward compatibility: allow scheduling by candidateEmail (+ optional jobId)
    if (!applicationId && candidateEmail) {
      const user = await User.findOne({ email: candidateEmail }).select("_id email").lean()
      if (!user) {
        return NextResponse.json({ message: `No user found for ${candidateEmail}` }, { status: 404 })
      }
      // Find most recent application (relaxed filter to reduce 404s from UI scheduling)
      const query: any = { jobSeekerId: user._id }
      if (jobIdFromBody) query.jobDescriptionId = jobIdFromBody
      const recentApp: any = await Application.findOne(query).sort({ updatedAt: -1 }).lean()
      if (!recentApp) {
        return NextResponse.json({ message: "No eligible application found for this candidate" }, { status: 404 })
      }
      applicationId = String(recentApp._id)
    }

    if (!applicationId) return NextResponse.json({ message: "applicationId or candidateEmail is required" }, { status: 400 })
    if (!scheduledAt) return NextResponse.json({ message: "scheduledAt is required" }, { status: 400 })
    if (provider === "external" && !meetingLink) {
      return NextResponse.json({ message: "meetingLink is required for external provider" }, { status: 400 })
    }

    // Load application and derive identities
    const app: any = await Application.findById(applicationId)
      .populate("jobSeekerId", "_id email")
      .populate("jobDescriptionId", "_id title")

    if (!app) return NextResponse.json({ message: "Application not found" }, { status: 404 })

    const candidateId = app.jobSeekerId?._id || app.jobSeekerId
    const jobId = app.jobDescriptionId?._id || app.jobDescriptionId

    const interviewDoc: any = {
      applicationId: app._id,
      recruiterId: session.userId,
      candidateId,
      jobId,
      scheduledDate: new Date(scheduledAt),
      duration,
      status: "scheduled",
      notes,
    }

    if (provider === "in_app") {
      interviewDoc.roomId = `room-${nanoid(12)}`
    } else {
      interviewDoc.meetingLink = meetingLink
    }

    const created = await VideoInterview.create(interviewDoc)

    // Update application pipeline status
    await Application.findByIdAndUpdate(app._id, { $set: { status: "Interview Scheduled" } })

    // Notify candidate
    await Notification.create({
      userId: candidateId,
      type: "application_status_update",
      message: `Interview scheduled for ${new Date(scheduledAt).toLocaleString()}`,
      relatedEntity: { id: created._id, type: "interview" },
    })

    return NextResponse.json({ success: true, interview: created })
  } catch (error) {
    console.error("[video-interviews][POST] error", error)
    return NextResponse.json({ success: false, message: "Failed to schedule interview" }, { status: 500 })
  }
}