import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const profileData = await req.json()

    // In a real app, you would save this to your database
    // For now, we'll simulate a successful profile creation
    const mockProfile = {
      id: session.userId,
      ...profileData,
      profileCompleteness: 100,
      isProfileComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Simulate database save delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return NextResponse.json({
      message: "Profile setup completed successfully",
      profile: mockProfile,
    })
  } catch (error) {
    console.error("Profile setup error:", error)
    return NextResponse.json({ message: "Failed to complete profile setup" }, { status: 500 })
  }
}
