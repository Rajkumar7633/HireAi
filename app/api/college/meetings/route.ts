import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import { CollegeMeeting } from "@/models/CollegeMeeting"
import Notification from "@/models/Notification"
import {
export { dynamic } from "@/lib/api-dynamic"

  computeMeetingStatus,
  resolveCollegeMeetingInvitees,
} from "@/lib/college-meeting-utils"
import { generateHireAiRoomId } from "@/lib/hireai-room"

function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

function shapeMeeting(m: Record<string, unknown>) {
  const attendees = (m.attendees as Array<Record<string, unknown>>) || []
  const joined = attendees.filter((a) => a.status === "joined" || a.status === "left").length
  const left = attendees.filter((a) => a.status === "left").length
  const status = computeMeetingStatus(
    m.startTime as Date,
    m.endTime as Date,
    String(m.status || "scheduled"),
  )

  return {
    ...m,
    status,
    stats: {
      invited: attendees.length,
      joined: joined,
      left: left,
      absent: attendees.filter((a) => a.status === "invited" || a.status === "absent").length,
    },
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!requireCollege(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const query: Record<string, unknown> = { collegeId: session!.userId }
    if (from || to) {
      query.startTime = {}
      if (from) (query.startTime as Record<string, Date>).$gte = new Date(from)
      if (to) (query.startTime as Record<string, Date>).$lte = new Date(to)
    }

    const meetings = await CollegeMeeting.find(query).sort({ startTime: -1 }).lean()
    return NextResponse.json({ meetings: meetings.map((m) => shapeMeeting(m as Record<string, unknown>)) })
  } catch (error) {
    console.error("[college/meetings GET]", error)
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!requireCollege(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  const title = String(body.title || "").trim()
  const startTime = body.startTime ? new Date(String(body.startTime)) : null
  const endTime = body.endTime ? new Date(String(body.endTime)) : null

  if (!title || !startTime || !endTime || endTime <= startTime) {
    return NextResponse.json({ error: "Title, valid start and end times are required" }, { status: 400 })
  }

  try {
    await connectDB()

    const audienceMode = (body.audienceMode as string) || "all"
    const students = await resolveCollegeMeetingInvitees(session!.userId, audienceMode as any, {
      department: body.targetDepartment as string,
      year: body.targetYear ? Number(body.targetYear) : null,
      batch: body.targetBatch as string,
      studentIds: body.studentIds as string[],
    })

    if (students.length === 0) {
      return NextResponse.json({ error: "No students match the selected audience" }, { status: 400 })
    }

    const now = new Date()
    const attendees = students.map((s) => ({
      studentId: String(s._id),
      studentName: s.name || "Student",
      email: s.email || "",
      department: s.department || "",
      batch: s.batch || "",
      status: "invited" as const,
      invitedAt: now,
      totalDurationSeconds: 0,
      sessions: [],
    }))

    const roomId = generateHireAiRoomId()

    const meeting = await CollegeMeeting.create({
      collegeId: session!.userId,
      title,
      description: body.description || "",
      meetingType: body.meetingType || "general",
      startTime,
      endTime,
      roomId,
      meetingLink: "",
      venue: body.venue || "",
      audienceMode,
      targetDepartment: body.targetDepartment || "",
      targetYear: body.targetYear ? Number(body.targetYear) : undefined,
      targetBatch: body.targetBatch || "",
      invitedStudentIds: attendees.map((a) => a.studentId),
      attendees,
      status: "scheduled",
      createdBy: new mongoose.Types.ObjectId(session!.userId),
    })

    const startLabel = startTime.toLocaleString()
    const venuePart = body.venue ? ` Venue: ${body.venue}.` : ""

    await Promise.all(
      attendees.map((a) =>
        Notification.create({
          userId: a.studentId,
          type: "interview_scheduled",
          message: `College meeting "${title}" on ${startLabel}.${venuePart} Join from Calendar → College Meetings.`,
          relatedEntity: {
            id: meeting._id,
            type: "interview",
          },
        }),
      ),
    )

    return NextResponse.json({
      meeting: shapeMeeting(meeting.toObject() as Record<string, unknown>),
      invitedCount: attendees.length,
    }, { status: 201 })
  } catch (error) {
    console.error("[college/meetings POST]", error)
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 })
  }
}
