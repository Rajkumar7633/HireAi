import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any

    // Mock response - in real implementation, update all notifications in database
    return NextResponse.json({
      success: true,
      message: "All notifications marked as read",
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to mark notifications as read" }, { status: 500 })
  }
}
