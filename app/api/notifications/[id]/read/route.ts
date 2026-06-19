import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Notification from "@/models/Notification"
export { dynamic } from "@/lib/api-dynamic"


export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const updated = await Notification.findOneAndUpdate(
      { _id: params.id, userId: session.userId },
      { $set: { read: true } },
      { new: true },
    )

    if (!updated) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Notification marked as read" })
  } catch (error) {
    return NextResponse.json({ error: "Failed to mark notification as read" }, { status: 500 })
  }
}
