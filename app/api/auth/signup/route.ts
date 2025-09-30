import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import { hashPassword, generateToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    console.log("Signup attempt started")
    const body = await request.json()
    const { name, email, password, role } = body

    console.log("Signup request body:", { name, email, role })

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    if (!["job_seeker", "recruiter", "admin"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 })
    }

    await connectDB()
    console.log("Database connected for signup")

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json({ message: "Email already in use" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    console.log("Generated passwordHash:", passwordHash)

    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
    })

    await user.save()
    console.log("User saved:", user)

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    })

    const response = NextResponse.json({
      message: "User created successfully",
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
