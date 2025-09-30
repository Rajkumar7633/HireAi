import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Notification from "@/models/Notification"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const notifications = await Notification.find({
      userId: session.userId,
      read: false,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    const unreadCount = notifications.length

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch notifications",
        error: error.message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { notificationIds } = await request.json()

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        {
          message: "Invalid notification IDs",
        },
        { status: 400 },
      )
    }

    await connectDB()

    const result = await Notification.deleteMany({
      _id: { $in: notificationIds },
      userId: session.userId,
    })

    console.log(`[v0] Marked ${result.deletedCount} notifications as read for user ${session.userId}`)

    return NextResponse.json({
      success: true,
      markedCount: result.deletedCount,
      message: `${result.deletedCount} notifications marked as read`,
    })
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to mark notifications as read",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
