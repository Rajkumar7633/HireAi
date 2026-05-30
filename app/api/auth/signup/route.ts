import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Signup attempt started")
    const body = await request.json()
    const { name, email, password, role } = body

    console.log("Signup request body:", { name, email, role })

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    if (!["job_seeker", "recruiter", "admin", "college_admin"].includes(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 })
    }

    // Call backend API
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5001"
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password, role }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Backend signup error:", data)
      return NextResponse.json({ message: data.message || "Signup failed" }, { status: response.status })
    }

    console.log("User created successfully:", data)

    const apiResponse = NextResponse.json({
      message: "User created successfully",
      token: data.token,
      user: data.user,
    })

    apiResponse.cookies.set("auth-token", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    return apiResponse
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
