import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { CollegeMeeting } from "@/models/CollegeMeeting"
import { computeMeetingStatus } from "@/lib/college-meeting-utils"
export { dynamic } from "@/lib/api-dynamic"


type AttendeeDoc = {
  studentId: string
  studentName?: string
  email?: string
  status: string
  joinTime?: Date
  leaveTime?: Date
  totalDurationSeconds: number
  sessions: Array<{ joinedAt: Date; leftAt?: Date; durationSeconds?: number }>
  lastHeartbeatAt?: Date
}

function findAttendee(attendees: AttendeeDoc[], userId: string) {
  return attendees.find((a) => String(a.studentId) === userId)
}

function closeOpenSession(attendee: AttendeeDoc, at: Date) {
  const sessions = attendee.sessions || []
  const open = sessions[sessions.length - 1]
  if (open && !open.leftAt) {
    open.leftAt = at
    const dur = Math.max(0, Math.floor((at.getTime() - new Date(open.joinedAt).getTime()) / 1000))
    open.durationSeconds = dur
    attendee.totalDurationSeconds = (attendee.totalDurationSeconds || 0) + dur
  }
}

type MeetingLean = {
  _id: unknown
  title: string
  description?: string
  meetingType: string
  startTime: Date
  endTime: Date
  meetingLink?: string
  roomId?: string
  venue?: string
  status: string
  invitedStudentIds?: string[]
  attendees?: AttendeeDoc[]
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const meeting = await CollegeMeeting.findById(params.id).lean() as MeetingLean | null
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    const userId = session.userId
    const invited = (meeting.invitedStudentIds || []).some((id: string) => String(id) === userId)
    if (!invited) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const attendee = findAttendee(meeting.attendees as AttendeeDoc[], userId)
    const status = computeMeetingStatus(meeting.startTime, meeting.endTime, meeting.status)

    return NextResponse.json({
      meeting: {
        _id: meeting._id,
        title: meeting.title,
        description: meeting.description,
        meetingType: meeting.meetingType,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        meetingLink: meeting.meetingLink,
        venue: meeting.venue,
        roomId: meeting.roomId,
        status,
        myStatus: attendee?.status || "invited",
        myJoinTime: attendee?.joinTime,
        myLeaveTime: attendee?.leaveTime,
        myDurationSeconds: attendee?.totalDurationSeconds || 0,
      },
    })
  } catch (error) {
    console.error("[job-seeker/meetings/id GET]", error)
    return NextResponse.json({ error: "Failed to load meeting" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { action?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const action = body.action || "join"
  const userId = session.userId
  const now = new Date()

  try {
    await connectDB()
    const meeting = await CollegeMeeting.findById(params.id)
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    const invited = (meeting.invitedStudentIds || []).some((id: string) => String(id) === userId)
    if (!invited) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (meeting.status === "cancelled") {
      return NextResponse.json({ error: "Meeting was cancelled" }, { status: 400 })
    }

    const attendees = (meeting.attendees || []) as AttendeeDoc[]
    let attendee = findAttendee(attendees, userId)

    if (!attendee) {
      attendee = {
        studentId: userId,
        status: "invited",
        totalDurationSeconds: 0,
        sessions: [],
      }
      attendees.push(attendee)
    }

    if (action === "join" || action === "heartbeat") {
      const open = attendee.sessions?.[attendee.sessions.length - 1]
      if (!open || open.leftAt) {
        if (action === "join") {
          attendee.sessions = attendee.sessions || []
          attendee.sessions.push({ joinedAt: now })
          if (!attendee.joinTime) attendee.joinTime = now
          attendee.status = "joined"
        }
      }
      attendee.lastHeartbeatAt = now
      attendee.leaveTime = undefined
    } else if (action === "leave") {
      closeOpenSession(attendee, now)
      attendee.leaveTime = now
      attendee.status = "left"
      attendee.lastHeartbeatAt = now
    }

    meeting.attendees = attendees as never
    meeting.markModified("attendees")
    await meeting.save()

    return NextResponse.json({
      success: true,
      status: attendee.status,
      joinTime: attendee.joinTime,
      leaveTime: attendee.leaveTime,
      totalDurationSeconds: attendee.totalDurationSeconds,
    })
  } catch (error) {
    console.error("[job-seeker/meetings/attendance]", error)
    return NextResponse.json({ error: "Attendance update failed" }, { status: 500 })
  }
}
