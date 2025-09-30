import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Notification from "@/models/Notification"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { userId, type, message, relatedEntity } = await request.json()

    if (!userId || !type || !message) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const notification = new Notification({
      userId,
      type,
      message,
      relatedEntity,
      read: false,
      createdAt: new Date(),
    })

    await notification.save()

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ message: "Failed to create notification" }, { status: 500 })
  }
}
