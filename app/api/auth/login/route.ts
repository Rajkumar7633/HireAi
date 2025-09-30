import { NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import { verifyPassword, generateToken } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    console.log("Login attempt started")

    await connectDB()
    console.log("Database connected")

    const { email, password } = await req.json()
    console.log("Login attempt for email:", email)

    if (!email || !password) {
      console.error("Missing email or password")
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    console.log("User found:", !!user)

    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    if (!user.passwordHash) {
      console.error("No password hash found for user")
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    console.log("Password valid:", isPasswordValid)

    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    })

    console.log("✅ Generated token:", token.substring(0, 20) + "...")
    console.log("✅ User role:", user.role)
    console.log("✅ User ID:", user._id.toString())

    const response = NextResponse.json({
      message: "Login successful",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    })

    console.log("✅ Cookie set successfully")
    console.log("Login successful for:", email)

    return response
  } catch (err) {
    console.error("❌ Login error:", err)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
