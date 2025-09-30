import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export async function POST(req: NextRequest) {
  const session = await getSession(req)

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // Only allow recruiters to auto-update their profiles
  if (session.role !== "recruiter") {
    return NextResponse.json({ message: "Only recruiters can auto-update profiles" }, { status: 403 })
  }

  try {
    // First, get the current profile to check what needs updating
    const currentProfileResponse = await fetch(`${BACKEND_URL}/api/user/profile`, {
      headers: {
        Authorization: `Bearer ${session.userId}`,
      },
      cache: "no-store",
    })

    let currentProfile = {}
    if (currentProfileResponse.ok) {
      const profileData = await currentProfileResponse.json()
      currentProfile = profileData
    }

    // Prepare enhanced profile data for recruiters
    const enhancedProfile = {
      ...currentProfile,
      name: session.name || currentProfile.name,
      email: session.email || currentProfile.email,
      role: session.role,
      // Auto-populate professional fields if they're empty
      companyName: currentProfile.companyName || "Professional Recruiting Services",
      companyDescription:
        currentProfile.companyDescription ||
        "We are dedicated to connecting top talent with exceptional opportunities. Our team specializes in identifying the perfect match between candidates and companies, ensuring mutual success and growth.",
      professionalSummary:
        currentProfile.professionalSummary ||
        `Experienced recruiter with a passion for matching talented professionals with their ideal career opportunities. I specialize in understanding both candidate aspirations and company culture to create lasting, successful placements.`,
      businessLocation: currentProfile.businessLocation || "Remote/Global",
      // Only update if fields are completely empty
      profileImage: currentProfile.profileImage || "/recruiter-avatar.png",
      companyLogo: currentProfile.companyLogo || "/professional-company-logo.png",
      // Set default professional status
      isProfileComplete: true,
      lastLoginUpdate: new Date().toISOString(),
    }

    // Update the profile with enhanced data
    const updateResponse = await fetch(`${BACKEND_URL}/api/user/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.userId}`,
      },
      body: JSON.stringify(enhancedProfile),
    })

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json()
      console.warn("Profile auto-update failed:", errorData)
      return NextResponse.json(
        { message: "Profile auto-update completed with warnings", success: false },
        { status: 200 },
      )
    }

    const updatedData = await updateResponse.json()
    return NextResponse.json(
      {
        message: "Profile auto-updated successfully",
        success: true,
        user: updatedData.user,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error in profile auto-update:", error)
    // Don't fail the login process, just log the error
    return NextResponse.json(
      {
        message: "Profile auto-update completed with errors",
        success: false,
      },
      { status: 200 },
    )
  }
}
