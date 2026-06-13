import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { CollegeMeeting } from "@/models/CollegeMeeting"
import { buildCollegeMeetingJoinPath, generateHireAiRoomId } from "@/lib/hireai-room"

function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

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

    const roomId = await ensureRoomId(String(meeting._id), meeting.roomId as string | undefined)
    const name = session!.name || session!.email?.split("@")[0] || "College Admin"
    const joinUrl = buildCollegeMeetingJoinPath(roomId, params.id, true, name)

    return NextResponse.json({ joinUrl, roomId })
  } catch (error) {
    console.error("[college/meetings/join GET]", error)
    return NextResponse.json({ error: "Failed to build join link" }, { status: 500 })
  }
}
