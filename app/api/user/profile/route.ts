// import { type NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic";
// import { getSession } from "@/lib/auth"

// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

// export async function GET(req: NextRequest) {
//   const session = await getSession(req)

//   if (!session) {
//     return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
//   }

//   const { searchParams } = new URL(req.url)
//   const userId = searchParams.get("userId") || session.userId

//   try {
//     console.log("[v0] Fetching profile from backend:", `${BACKEND_URL}/api/user/profile`)

//     const response = await fetch(`${BACKEND_URL}/api/user/profile?userId=${userId}`, {
//       headers: {
//         Authorization: `Bearer ${session.userId}`,
//       },
//       cache: "no-store",
//     })

//     if (!response.ok) {
//       console.error("[v0] Backend profile fetch failed:", response.status, response.statusText)

//       return NextResponse.json(
//         {
//           firstName: "John",
//           lastName: "Doe",
//           email: session.email || "jobseeker@example.com",
//           phone: "",
//           location: "",
//           currentTitle: "",
//           experienceLevel: "entry",
//           industry: "",
//           skills: [],
//           yearsOfExperience: 0,
//           education: "",
//           university: "",
//           graduationYear: "",
//           gpa: "",
//           linkedinUrl: "",
//           portfolioUrl: "",
//           githubUrl: "",
//           desiredRole: "",
//           salaryExpectation: "",
//           workPreference: "",
//           summary: "",
//           profileCompleteness: 25,
//           atsScore: 65,
//           skillsVerified: 0,
//           lastUpdated: new Date().toISOString(),
//           message: "Using fallback data - backend unavailable",
//         },
//         { status: 200 },
//       )
//     }

//     const data = await response.json()
//     console.log("[v0] Profile data from backend:", data)
//     return NextResponse.json(data, { status: 200 })
//   } catch (error) {
//     console.error("[v0] Error fetching user profile:", error)

//     return NextResponse.json(
//       {
//         firstName: "John",
//         lastName: "Doe",
//         email: session.email || "jobseeker@example.com",
//         phone: "",
//         location: "",
//         currentTitle: "",
//         experienceLevel: "entry",
//         industry: "",
//         skills: [],
//         yearsOfExperience: 0,
//         education: "",
//         university: "",
//         graduationYear: "",
//         gpa: "",
//         linkedinUrl: "",
//         portfolioUrl: "",
//         githubUrl: "",
//         desiredRole: "",
//         salaryExpectation: "",
//         workPreference: "",
//         summary: "",
//         profileCompleteness: 25,
//         atsScore: 65,
//         skillsVerified: 0,
//         lastUpdated: new Date().toISOString(),
//         message: "Using fallback data - connection error",
//       },
//       { status: 200 },
//     )
//   }
// }

// export async function PUT(req: NextRequest) {
//   const session = await getSession(req)

//   if (!session) {
//     return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
//   }

//   try {
//     const body = await req.json()
//     const { userId, profileData, section } = body

//     console.log("[v0] Profile update request:", { userId: userId || session.userId, section })

//     if (!profileData) {
//       return NextResponse.json({ message: "Profile data is required" }, { status: 400 })
//     }

//     // Calculate profile completeness based on filled fields
//     const calculateCompleteness = (profile: any) => {
//       const fields = [
//         "firstName",
//         "lastName",
//         "email",
//         "phone",
//         "location",
//         "currentTitle",
//         "experienceLevel",
//         "industry",
//         "yearsOfExperience",
//         "education",
//         "university",
//         "graduationYear",
//         "summary",
//         "desiredRole",
//         "salaryExpectation",
//         "workPreference",
//       ]

//       const filledFields = fields.filter((field) => profile[field] && profile[field].toString().trim() !== "").length

//       const skillsBonus = profile.skills && profile.skills.length > 0 ? 1 : 0
//       const linksBonus =
//         [profile.linkedinUrl, profile.portfolioUrl, profile.githubUrl].filter((url) => url && url.trim() !== "")
//           .length > 0
//           ? 1
//           : 0

//       return Math.round(((filledFields + skillsBonus + linksBonus) / (fields.length + 2)) * 100)
//     }

//     const updatedProfile = {
//       ...profileData,
//       profileCompleteness: calculateCompleteness(profileData),
//       lastUpdated: new Date().toISOString(),
//     }

//     console.log("[v0] Attempting backend update to:", `${BACKEND_URL}/api/user/profile`)

//     try {
//       const response = await fetch(`${BACKEND_URL}/api/user/profile`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${session.userId}`,
//         },
//         body: JSON.stringify({
//           userId: userId || session.userId,
//           profileData: updatedProfile,
//           section,
//         }),
//       })

//       if (!response.ok) {
//         console.error("[v0] Backend profile update failed:", response.status, response.statusText)
//         console.log("[v0] Using fallback - returning updated profile locally")
//         return NextResponse.json(updatedProfile, { status: 200 })
//       }

//       const data = await response.json()
//       console.log("[v0] Backend update successful:", data)
//       return NextResponse.json(data.profileData || updatedProfile, { status: 200 })
//     } catch (backendError) {
//       console.error("[v0] Backend connection error:", backendError)
//       console.log("[v0] Backend unreachable - returning updated profile locally")
//       return NextResponse.json(updatedProfile, { status: 200 })
//     }
//   } catch (error) {
//     console.error("[v0] Error updating user profile:", error)
//     return NextResponse.json(
//       {
//         message: "Failed to update profile",
//         error: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 },
//     )
//   }
// }


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

