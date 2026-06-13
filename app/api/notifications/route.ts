import { type NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Notification from "@/models/Notification"
import { NOTIFICATION_CATEGORIES } from "@/lib/notification-utils"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const userId = new mongoose.Types.ObjectId(session.userId)
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "all"
    const category = searchParams.get("category") || "all"
    const search = searchParams.get("search")?.trim() || ""
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 200)

    const query: Record<string, unknown> = { userId }
    if (status === "unread") query.read = false
    if (status === "read") query.read = true

    if (category !== "all") {
      const cat = NOTIFICATION_CATEGORIES.find(c => c.id === category)
      if (cat?.types.length) query.type = { $in: cat.types }
    }

    if (search) {
      query.message = { $regex: search, $options: "i" }
    }

    const [notifications, unreadCount, totalCount, todayCount, typeAgg] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ userId, read: false }),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({
        userId,
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
      Notification.aggregate([
        { $match: { userId } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
    ])

    const byType = Object.fromEntries(typeAgg.map((row: { _id: string; count: number }) => [row._id, row.count]))

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      stats: {
        total: totalCount,
        unread: unreadCount,
        today: todayCount,
        read: Math.max(0, totalCount - unreadCount),
        byType,
      },
    })
  } catch (error: any) {
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
      return NextResponse.json({ message: "Invalid notification IDs" }, { status: 400 })
    }

    await connectDB()

    const result = await Notification.updateMany(
      { _id: { $in: notificationIds }, userId: session.userId },
      { $set: { read: true } },
    )

    return NextResponse.json({
      success: true,
      markedCount: result.modifiedCount,
      message: `${result.modifiedCount} notifications marked as read`,
    })
  } catch (error) {
    console.error("Error marking notifications as read:", error)
    return NextResponse.json(
      { success: false, message: "Failed to mark notifications as read" },
      { status: 500 },
    )
  }
}
