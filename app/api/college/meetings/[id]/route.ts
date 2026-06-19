import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { CollegeMeeting } from "@/models/CollegeMeeting"
import { computeMeetingStatus, formatDuration } from "@/lib/college-meeting-utils"
export { dynamic } from "@/lib/api-dynamic"


function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

function enrichAttendees(meeting: Record<string, unknown>) {
  const attendees = ((meeting.attendees as Array<Record<string, unknown>>) || []).map((a) => ({
    ...a,
    durationLabel: formatDuration(Number(a.totalDurationSeconds || 0)),
    joinTime: a.joinTime || null,
    leaveTime: a.leaveTime || null,
    sessionCount: ((a.sessions as unknown[]) || []).length,
  }))
  return { ...meeting, attendees }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!requireCollege(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const meeting = await CollegeMeeting.findOne({
      _id: params.id,
      collegeId: session!.userId,
    }).lean()

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    const shaped = enrichAttendees(meeting as Record<string, unknown>)
    shaped.status = computeMeetingStatus(
      meeting.startTime,
      meeting.endTime,
      meeting.status,
    )

    return NextResponse.json({ meeting: shaped })
  } catch (error) {
    console.error("[college/meetings/id GET]", error)
    return NextResponse.json({ error: "Failed to load meeting" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!requireCollege(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const body = await req.json()
    const updates: Record<string, unknown> = {}

    if (body.title) updates.title = String(body.title).trim()
    if (body.description != null) updates.description = body.description
    if (body.meetingLink != null) updates.meetingLink = body.meetingLink
    if (body.venue != null) updates.venue = body.venue
    if (body.startTime) updates.startTime = new Date(body.startTime)
    if (body.endTime) updates.endTime = new Date(body.endTime)
    if (body.status === "cancelled") updates.status = "cancelled"

    const meeting = await CollegeMeeting.findOneAndUpdate(
      { _id: params.id, collegeId: session!.userId },
      { $set: updates },
      { new: true },
    ).lean()

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    return NextResponse.json({ meeting: enrichAttendees(meeting as Record<string, unknown>) })
  } catch (error) {
    console.error("[college/meetings/id PATCH]", error)
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!requireCollege(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const result = await CollegeMeeting.deleteOne({
      _id: params.id,
      collegeId: session!.userId,
    })
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
