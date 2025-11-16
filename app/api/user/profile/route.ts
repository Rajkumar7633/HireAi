
export const dynamic = "force-dynamic";


import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import { computeProfileScore } from "@/lib/scoring"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
  const session = await getSession(req)

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    let user = await User.findById(session.userId).select("-passwordHash")

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    try {
      console.log("[profile] userId=", session.userId, "subStatus=", (user as any)?.subscription?.status, "features=", Object.keys((user as any)?.features || {}).length)
    } catch { }

    if (!((user as any)?.subscription?.status)) {
      try {
        const bearer = req.headers.get("authorization") || req.headers.get("Authorization") || ""
        const cookieToken = req.cookies.get("auth-token")?.value
        const authHeader = bearer || (cookieToken ? `Bearer ${cookieToken}` : "")
        if (authHeader) {
          await fetch(`${BACKEND_URL}/api/billing/sync`, {
            method: "GET",
            headers: { Authorization: authHeader },
            cache: "no-store",
          })
          user = await User.findById(session.userId).select("-passwordHash")
        }
      } catch { }
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
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
        isProfileComplete: user.isProfileComplete || false,
        lastManualUpdate: user.lastManualUpdate,
        subscription: (user as any).subscription || null,
        features: (user as any).features || {},
        limits: (user as any).limits || {},
        skills: (user as any).skills || [],
      },
    })
  } catch (error) {
    console.error("[v0] Error fetching user profile:", error)
    return NextResponse.json({ message: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req)

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const profileData = await req.json()
    console.log("[v0] Profile update request:", profileData)

    await connectDB()
    const user = await User.findById(session.userId)

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    const updateFields = {
      name: profileData.name || user.name,
      email: profileData.email || user.email,
      phone: profileData.phone,
      address: profileData.address,
      profileImage: profileData.profileImage,
      companyName: profileData.companyName,
      companyLogo: profileData.companyLogo,
      companyDescription: profileData.companyDescription,
      website: profileData.website,
      linkedinUrl: profileData.linkedinUrl,
      twitterUrl: profileData.twitterUrl,
      professionalSummary: profileData.professionalSummary,
      businessLocation: profileData.businessLocation,
      isProfileComplete: profileData.isProfileComplete || false,
      lastManualUpdate: profileData.lastManualUpdate || new Date().toISOString(),
    }

    let updatedUser = await User.findByIdAndUpdate(session.userId, updateFields, {
      new: true,
      runValidators: true,
    }).select("-passwordHash")

    // Recompute Talent Pool score after profile update
    try {
      const breakdown = await computeProfileScore(updatedUser as any)
      updatedUser = await User.findByIdAndUpdate(
        session.userId,
        {
          $set: {
            scores: breakdown as any,
            profileScore: breakdown.total,
            scoreVersion: 1,
            lastScoreComputedAt: new Date(),
          },
        },
        { new: true },
      ).select("-passwordHash")
    } catch (e) {
      console.warn("[v0] Failed to recompute profile score (non-fatal)", e)
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
        profileImage: updatedUser.profileImage,
        companyName: updatedUser.companyName,
        companyLogo: updatedUser.companyLogo,
        companyDescription: updatedUser.companyDescription,
        website: updatedUser.website,
        linkedinUrl: updatedUser.linkedinUrl,
        twitterUrl: updatedUser.twitterUrl,
        professionalSummary: updatedUser.professionalSummary,
        businessLocation: updatedUser.businessLocation,
        isProfileComplete: updatedUser.isProfileComplete,
        lastManualUpdate: updatedUser.lastManualUpdate,
        profileScore: updatedUser.profileScore,
        scores: updatedUser.scores,
        lastScoreComputedAt: updatedUser.lastScoreComputedAt,
      },
    })
  } catch (error) {
    console.error("[v0] Error updating user profile:", error)
    return NextResponse.json({ message: "Failed to update profile" }, { status: 500 })
  }
}

