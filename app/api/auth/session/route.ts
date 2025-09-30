import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or Authorization header
    let token = request.cookies.get("auth-token")?.value

    if (!token) {
      const authHeader = request.headers.get("Authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return NextResponse.json({ message: "No token provided" }, { status: 401 })
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any

    await connectDB()
    const user = await User.findById(decoded.userId)

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 401 })
    }

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (error) {
    console.error("Session error:", error)
    return NextResponse.json({ message: "Invalid token" }, { status: 401 })
  }
}
