import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { CollegeMeeting } from "@/models/CollegeMeeting"
import { buildCollegeMeetingJoinPath, generateHireAiRoomId } from "@/lib/hireai-room"
export { dynamic } from "@/lib/api-dynamic"


async function ensureRoomId(meetingId: string, existingRoomId?: string) {
  if (existingRoomId) return existingRoomId
  const roomId = generateHireAiRoomId()
  await CollegeMeeting.updateOne({ _id: meetingId }, { $set: { roomId } })
  return roomId
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
    const meeting = await CollegeMeeting.findById(params.id).lean()

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    const userId = session.userId
    const invited = (meeting.invitedStudentIds || []).some(
      (id: string) => String(id) === userId,
    )
    if (!invited) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const roomId = await ensureRoomId(String(meeting._id), meeting.roomId as string | undefined)
    const name = session.name || session.email?.split("@")[0] || "Student"
    const joinUrl = buildCollegeMeetingJoinPath(roomId, params.id, false, name)

    return NextResponse.json({ joinUrl, roomId })
  } catch (error) {
    console.error("[job-seeker/meetings/join GET]", error)
    return NextResponse.json({ error: "Failed to build join link" }, { status: 500 })
  }
}
