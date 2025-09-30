import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { ensureConnection } from "@/lib/mongodb"
import VideoInterview from "@/models/VideoInterview"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    await ensureConnection()

    const interview: any = await VideoInterview.findById(id).lean().exec()
    if (!interview) return NextResponse.json({ message: "Interview not found" }, { status: 404 })

    // Authorization: recruiter or candidate attached to the interview
    const allowed =
      String(interview.recruiterId) === session.userId || String(interview.candidateId) === session.userId
    if (!allowed) return NextResponse.json({ message: "Access denied" }, { status: 403 })

    return NextResponse.json({ success: true, interview })
  } catch (error) {
    console.error("[video-interviews][GET/:id] error", error)
    return NextResponse.json({ success: false, message: "Failed to load interview" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { action, ...data } = body

    await ensureConnection()

    if (action === "join") {
      // Handle join action locally for room access
      return NextResponse.json({
        roomId: `room-${id}`,
        isHost: session.role === "recruiter",
        participantName: session.name || session.email?.split("@")[0] || "User",
      })
    }

    // Find the interview first
    const interview = await VideoInterview.findById(id).setOptions({ maxTimeMS: 15000 }).exec()

    if (!interview) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 })
    }

    // Check permissions
    if (interview.recruiterId.toString() !== session.userId && interview.candidateId.toString() !== session.userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    let updateData = {}

    if (action === "status") {
      updateData = { status: data.status, updatedAt: new Date() }
    } else if (action === "feedback") {
      updateData = {
        feedback: data.feedback,
        rating: data.rating,
        notes: data.notes,
        updatedAt: new Date(),
      }
    } else {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    const updatedInterview = await VideoInterview.findByIdAndUpdate(id, updateData, {
      new: true,
      maxTimeMS: 15000,
    }).exec()

    console.log(`✅ Interview ${id} updated with action: ${action}`)

    return NextResponse.json({
      message: "Interview updated successfully",
      interview: updatedInterview,
    })
  } catch (error) {
    console.error("Error updating video interview:", error)

    if (error.message.includes("buffering timed out") || error.message.includes("timeout")) {
      return NextResponse.json(
        {
          message: "Database operation timed out. Please try again.",
          code: "DB_TIMEOUT",
          retryAfter: 5000,
        },
        { status: 503 },
      )
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { status, notes, duration, scheduledDate, reason } = body || {}

    await ensureConnection()

    const interview = await VideoInterview.findById(id).exec()
    if (!interview) return NextResponse.json({ message: "Interview not found" }, { status: 404 })

    // Authorization: recruiter or candidate attached to the interview
    if (interview.recruiterId.toString() !== session.userId && interview.candidateId.toString() !== session.userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    const updateData: any = { updatedAt: new Date() }

    if (typeof status === "string") {
      updateData.status = status
      // Auto-mark completion time if recruiter ends call
      if (status === "completed") {
        updateData.endedAt = new Date()
        if (!interview.startedAt) updateData.startedAt = interview.startedAt || new Date()
      }
    }
    if (typeof notes === "string") updateData.notes = notes
    if (typeof duration === "number") updateData.duration = duration
    if (typeof scheduledDate === "string" && scheduledDate) {
      updateData.scheduledDate = new Date(scheduledDate)
      // On explicit reschedule, reset session fields and status -> scheduled
      if (reason === "reschedule") {
        updateData.status = "scheduled"
        updateData.startedAt = undefined
        updateData.endedAt = undefined
        updateData.hostJoinedAt = undefined
        updateData.candidateJoinedAt = undefined
      }
    }

    const updated = await VideoInterview.findByIdAndUpdate(
      id,
      { $set: updateData, ...(reason === "reschedule" ? { $unset: { startedAt: "", endedAt: "", hostJoinedAt: "", candidateJoinedAt: "" } } : {}) },
      { new: true }
    ).exec()

    return NextResponse.json({ success: true, interview: updated })
  } catch (error) {
    console.error("[video-interviews][PATCH/:id] error", error)
    return NextResponse.json({ success: false, message: "Failed to update interview" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    await ensureConnection()

    const interview = await VideoInterview.findById(id).setOptions({ maxTimeMS: 15000 }).exec()

    if (!interview) {
      return NextResponse.json({ message: "Interview not found" }, { status: 404 })
    }

    // Check if user is the recruiter who created this interview
    if (interview.recruiterId.toString() !== session.userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    await VideoInterview.findByIdAndUpdate(
      id,
      { status: "cancelled", updatedAt: new Date() },
      { maxTimeMS: 15000 },
    ).exec()

    console.log(`✅ Interview ${id} cancelled by recruiter ${session.userId}`)

    return NextResponse.json({ message: "Interview cancelled successfully" })
  } catch (error) {
    console.error("Error cancelling video interview:", error)

    if (error.message.includes("buffering timed out") || error.message.includes("timeout")) {
      return NextResponse.json(
        {
          message: "Database operation timed out. Please try again.",
          code: "DB_TIMEOUT",
          retryAfter: 5000,
        },
        { status: 503 },
      )
    }

    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
