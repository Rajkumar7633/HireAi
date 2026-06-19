import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { CollegeMeeting } from "@/models/CollegeMeeting"
import { computeMeetingStatus } from "@/lib/college-meeting-utils"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const userId = session.userId

    const meetings = await CollegeMeeting.find({
      invitedStudentIds: { $in: [userId, String(userId)] },
      status: { $ne: "cancelled" },
    })
      .sort({ startTime: -1 })
      .lean()

    const shaped = meetings.map((m) => {
      const attendee = (m.attendees || []).find(
        (a) => String(a.studentId) === userId,
      )
      const status = computeMeetingStatus(m.startTime, m.endTime, m.status)
      return {
        _id: m._id,
        title: m.title,
        description: m.description,
        meetingType: m.meetingType,
        startTime: m.startTime,
        endTime: m.endTime,
        meetingLink: m.meetingLink,
        venue: m.venue,
        roomId: m.roomId,
        status,
        myStatus: attendee?.status || "invited",
        myJoinTime: attendee?.joinTime,
        myLeaveTime: attendee?.leaveTime,
        myDurationSeconds: attendee?.totalDurationSeconds || 0,
      }
    })

    return NextResponse.json({ meetings: shaped })
  } catch (error) {
    console.error("[job-seeker/meetings GET]", error)
    return NextResponse.json({ meetings: [] })
  }
}
