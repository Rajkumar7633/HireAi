import { type NextRequest, NextResponse } from "next/server"
import { createSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { role = "job_seeker" } = await req.json()

    // Create a demo session
    const sessionCookie = await createSession("demo_user_123", "demo@example.com", role)

    const nextResponse = NextResponse.json({
      message: "Demo login successful",
      user: { id: "demo_user_123", email: "demo@example.com", role },
    })
    nextResponse.headers.set("Set-Cookie", sessionCookie)

    return nextResponse
  } catch (error) {
    console.error("Demo login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
