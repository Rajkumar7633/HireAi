import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import JobSeekerProfile from "@/models/JobSeekerProfile"
export { dynamic } from "@/lib/api-dynamic"


export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const profileData = await req.json()

    // Forward to the real profile PUT endpoint
    const origin = req.nextUrl.origin
    const response = await fetch(`${origin}/api/job-seeker/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify(profileData),
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ message: data.message || "Profile setup failed" }, { status: response.status })
    }

    return NextResponse.json({
      message: "Profile setup completed successfully",
      profile: data,
    })
  } catch (error) {
    console.error("Profile setup error:", error)
    return NextResponse.json({ message: "Failed to complete profile setup" }, { status: 500 })
  }
}
