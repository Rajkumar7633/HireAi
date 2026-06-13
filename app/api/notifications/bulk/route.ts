import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Notification from "@/models/Notification"

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, notificationIds } = body as {
      action?: "mark_read" | "mark_unread" | "delete"
      notificationIds?: string[]
    }

    if (!action || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json({ message: "action and notificationIds are required" }, { status: 400 })
    }

    await connectDB()

    const filter = { userId: session.userId, _id: { $in: notificationIds } }

    if (action === "delete") {
      const result = await Notification.deleteMany(filter)
      return NextResponse.json({
        success: true,
        modifiedCount: result.deletedCount,
        message: `${result.deletedCount} notification(s) deleted`,
      })
    }

    const readValue = action === "mark_read"
    const result = await Notification.updateMany(filter, { $set: { read: readValue } })

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `${result.modifiedCount} notification(s) updated`,
    })
  } catch (error) {
    console.error("Bulk notification action failed:", error)
    return NextResponse.json({ message: "Bulk action failed" }, { status: 500 })
  }
}
