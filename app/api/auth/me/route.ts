import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)

    if (!session || !session.userId) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    await connectDB()
    const user = await User.findById(session.userId).select("-passwordHash")

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isProfileComplete: user.isProfileComplete || false,
        phone: user.phone,
        address: user.address,
        profileImage: user.profileImage,
        companyName: user.companyName,
        companyLogo: user.companyLogo,
        companyDescription: user.companyDescription,
        website: user.website,
        linkedinUrl: user.linkedinUrl,
        twitterUrl: user.twitterUrl,
        professionalSummary: user.professionalSummary,
        businessLocation: user.businessLocation,
        lastManualUpdate: user.lastManualUpdate,
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
