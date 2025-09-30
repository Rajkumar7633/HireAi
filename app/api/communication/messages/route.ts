import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Message from "@/models/Message"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")
    const userId = searchParams.get("userId")

    await connectDB()

    let messages
    if (conversationId) {
      messages = await Message.find({ conversationId })
        .populate("senderId", "name email role")
        .populate("recipientId", "name email role")
        .sort({ createdAt: 1 })
    } else if (userId) {
      messages = await Message.find({
        $or: [
          { senderId: session.userId, recipientId: userId },
          { senderId: userId, recipientId: session.userId },
        ],
      })
        .populate("senderId", "name email role")
        .populate("recipientId", "name email role")
        .sort({ createdAt: 1 })
    } else {
      // Get all conversations for the user
      messages = await Message.find({
        $or: [{ senderId: session.userId }, { recipientId: session.userId }],
      })
        .populate("senderId", "name email role")
        .populate("recipientId", "name email role")
        .sort({ createdAt: -1 })
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json({ message: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { recipientId, content, type = "text", applicationId } = await request.json()

    await connectDB()

    const message = new Message({
      senderId: session.userId,
      recipientId,
      content,
      type,
      applicationId,
      createdAt: new Date(),
      read: false,
    })

    await message.save()
    await message.populate("senderId", "name email role")
    await message.populate("recipientId", "name email role")

    return NextResponse.json({ message }, { status: 201 })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 })
  }
}
