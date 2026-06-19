import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)

    if (!session || !session.userId) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const tokenFallback = {
      user: {
        id: session.userId,
        email: session.email,
        name: session.name || session.email,
        role: session.role,
        isProfileComplete: false,
      },
    }

    try {
      await connectDB()
      const user = await User.findById(session.userId).select("-passwordHash")

      if (user) {
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
            subscription: (user as any).subscription || null,
            features: (user as any).features || {},
            limits: (user as any).limits || {},
            skills: (user as any).skills || [],
          },
        })
      }
    } catch (dbErr) {
      console.warn("/api/auth/me DB lookup failed, using JWT claims:", dbErr)
    }

    // Valid JWT but DB slow/unavailable — still allow dashboard to load
    return NextResponse.json(tokenFallback)
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
