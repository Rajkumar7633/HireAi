// import { type NextRequest, NextResponse } from "next/server"
// import { getSession } from "@/lib/auth"
// import { connectDB } from "@/lib/mongodb"
// import VideoInterview from "@/backend/models/VideoInterview"
// import VideoRoom from "@/models/VideoRoom"

// export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     const session = await getSession(request)
//     if (!session) {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
//     }

//     await connectDB()
//     const { id } = params

//     const room = await VideoRoom.findOne({ interviewId: id })
//     if (!room) {
//       return NextResponse.json({ message: "Room not found" }, { status: 404 })
//     }

//     const participant = room.participants.find((p) => p.userId.toString() === session.userId)
//     if (participant) {
//       participant.leftAt = new Date()
//       await room.save()
//     }

//     const activeParticipants = room.participants.filter((p) => !p.leftAt)
//     if (activeParticipants.length === 0) {
//       room.roomState = "ended"
//       await room.save()

//       const interview = await VideoInterview.findById(id)
//       if (interview && interview.status === "in-progress") {
//         interview.status = "completed"
//         await interview.save()
//       }
//     }

//     return NextResponse.json({ message: "Left interview successfully" })
//   } catch (error) {
//     console.error("Error leaving video interview:", error)
//     return NextResponse.json({ message: "Internal server error" }, { status: 500 })
//   }
// }


import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import VideoInterview from "@/models/VideoInterview"
import VideoRoom from "@/models/VideoRoom"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { id } = params

    const room = await VideoRoom.findOne({ interviewId: id })
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    const participant = room.participants.find((p) => p.userId.toString() === session.userId)
    if (participant) {
      participant.leftAt = new Date()
      await room.save()
    }

    const activeParticipants = room.participants.filter((p) => !p.leftAt)
    if (activeParticipants.length === 0) {
      room.roomState = "ended"
      await room.save()

      const interview = await VideoInterview.findById(id)
      if (interview && interview.status === "in-progress") {
        interview.status = "completed"
        await interview.save()
      }
    }

    return NextResponse.json({ message: "Left interview successfully" })
  } catch (error) {
    console.error("Error leaving video interview:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
