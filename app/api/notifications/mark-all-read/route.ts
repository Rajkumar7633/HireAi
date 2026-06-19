import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Notification from "@/models/Notification"
export { dynamic } from "@/lib/api-dynamic"


export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const result = await Notification.updateMany(
      { userId: session.userId, read: false },
      { $set: { read: true } },
    )

    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 })
  }
}
