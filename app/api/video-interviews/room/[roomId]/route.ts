import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import VideoRoom from "@/models/VideoRoom"

export async function GET(request: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { roomId } = params

    const room = await VideoRoom.findOne({ roomId })
      .populate("participants.userId", "name email")
      .populate("hostId", "name email")

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    const isParticipant = room.participants.some((p) => p.userId._id.toString() === session.userId)
    if (!isParticipant && room.hostId._id.toString() !== session.userId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({
      room: {
        roomId: room.roomId,
        roomState: room.roomState,
        recordingState: room.recordingState,
        participants: room.participants.map((p) => ({
          userId: p.userId._id,
          name: p.userId.name,
          peerId: p.peerId,
          joinedAt: p.joinedAt,
          leftAt: p.leftAt,
          isHost: p.isHost,
          mediaState: p.mediaState,
        })),
        host: {
          userId: room.hostId._id,
          name: room.hostId.name,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching room details:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
