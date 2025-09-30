import { type NextRequest, NextResponse } from "next/server"
export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import JobSeekerProfile from "@/models/JobSeekerProfile"
import { computeProfileScore } from "@/lib/scoring"

export async function GET(req: NextRequest) {
  try {
    console.log("[v0] GET /api/job-seeker/profile - Starting request")

    const session = await getSession(req)
    console.log("[v0] Session:", session)

    if (!session || session.role !== "job_seeker") {
      console.log("[v0] Unauthorized access attempt")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Connecting to database...")
    await connectDB()
    console.log("[v0] Database connected successfully")

    console.log("[v0] Searching for profile with userId:", session.userId)
    let profile = await JobSeekerProfile.findOne({ userId: session.userId })
    console.log("[v0] Profile search result:", profile ? "FOUND" : "NOT FOUND")

    if (profile) {
      console.log("[v0] Found profile ID:", profile._id)
      console.log("[v0] Profile data keys:", Object.keys(profile.toObject()))
      console.log("[v0] Profile firstName:", profile.firstName)
      console.log("[v0] Profile completeness:", profile.profileCompleteness)
    }

    if (!profile) {
      // Create default profile from user data
      const user = await User.findById(session.userId)
      if (!user) {
        console.log("[v0] User not found:", session.userId)
        return NextResponse.json({ message: "User not found" }, { status: 404 })
      }

      console.log("[v0] Creating default profile for user:", user.email)

      // Create default profile
      profile = new JobSeekerProfile({
        userId: session.userId,
        firstName: user.name?.split(" ")[0] || "",
        lastName: user.name?.split(" ").slice(1).join(" ") || "",
        email: user.email,
        phone: user.phone || "",
        location: "",
        currentTitle: "",
        experienceLevel: "entry",
        industry: "",
        skills: [],
        yearsOfExperience: 0,
        education: "",
        university: "",
        graduationYear: "",
        gpa: "",
        linkedinUrl: user.linkedinUrl || "",
        portfolioUrl: "",
        githubUrl: "",
        desiredRole: "",
        salaryExpectation: "",
        workPreference: "remote",
        summary: user.professionalSummary || "",
        profileCompleteness: 0,
        atsScore: 0,
        skillsVerified: 0,
        lastUpdated: new Date(),
        // Newly added arrays so frontend never sees undefined
        projects: [],
        achievements: [],
        experiences: [],
      })

      await profile.save()
      console.log("[v0] Default profile created successfully")
    }

    // Ensure arrays exist in response to avoid runtime errors and perceived data loss
    const obj = profile.toObject()
    const responseData = {
      ...obj,
      skills: Array.isArray(obj.skills) ? obj.skills : [],
      projects: Array.isArray((obj as any).projects) ? (obj as any).projects : [],
      achievements: Array.isArray((obj as any).achievements) ? (obj as any).achievements : [],
      experiences: Array.isArray((obj as any).experiences) ? (obj as any).experiences : [],
    }
    console.log("[v0] Returning profile data with keys:", Object.keys(responseData))
    console.log("[v0] GET request completed successfully")

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in GET /api/job-seeker/profile:", error)
    return NextResponse.json(
      {
        message: "Failed to fetch profile",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    console.log("[v0] PUT /api/job-seeker/profile - Starting request")

    const session = await getSession(req)
    console.log("[v0] Session:", session)

    if (!session || session.role !== "job_seeker") {
      console.log("[v0] Unauthorized access attempt")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const profileData = await req.json()
    console.log("[v0] Profile data received:", profileData)

    console.log("[v0] Connecting to database...")
    await connectDB()
    console.log("[v0] Database connected successfully")

    const cleanedData = Object.entries(profileData).reduce((acc, [key, value]) => {
      // Keep all values including empty strings, but exclude null and undefined
      if (value !== null && value !== undefined) {
        acc[key] = value
      }
      return acc
    }, {} as any)

    // Calculate profile completeness
    const calculateCompleteness = (data: any): number => {
      const requiredFields = ["firstName", "lastName", "email"]
      const optionalFields = [
        "phone",
        "location",
        "currentTitle",
        "experienceLevel",
        "industry",
        "education",
        "university",
        "graduationYear",
        "linkedinUrl",
        "portfolioUrl",
        "githubUrl",
        "desiredRole",
        "salaryExpectation",
        "workPreference",
        "summary",
      ]

      let score = 0
      let totalWeight = 0

      // Required fields (50% weight)
      requiredFields.forEach((field) => {
        totalWeight += 5
        if (data[field] && data[field].toString().trim() !== "") score += 5
      })

      // Skills (special required field - 20% weight)
      totalWeight += 2
      if (data.skills && data.skills.length > 0) score += 2

      // Optional fields (30% weight)
      optionalFields.forEach((field) => {
        totalWeight += 3
        if (data[field] && data[field].toString().trim() !== "") score += 3
      })

      return Math.round((score / totalWeight) * 100)
    }

    // Derive yearsOfExperience from experiences array if present
    const deriveYearsFromExperiences = (experiences: any[]): number => {
      if (!Array.isArray(experiences) || experiences.length === 0) return 0
      const now = new Date()
      let totalMonths = 0
      for (const exp of experiences) {
        const start = typeof exp?.startDate === "string" ? new Date(exp.startDate + "-01") : null
        const end = exp?.current
          ? now
          : typeof exp?.endDate === "string" && exp.endDate
            ? new Date(exp.endDate + "-01")
            : now
        if (start && !isNaN(start as any) && end && !isNaN(end as any) && end > start) {
          const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
          totalMonths += Math.max(0, months)
        }
      }
      const years = totalMonths / 12
      return Math.max(0, Math.min(40, Math.round(years)))
    }

    // Normalize arrays to avoid undefined
    if (!Array.isArray(cleanedData.skills)) cleanedData.skills = []
    if (!Array.isArray(cleanedData.projects)) cleanedData.projects = []
    if (!Array.isArray(cleanedData.achievements)) cleanedData.achievements = []
    if (!Array.isArray(cleanedData.experiences)) cleanedData.experiences = []

    const derivedYears = deriveYearsFromExperiences(cleanedData.experiences)

    const updatedData = {
      ...cleanedData,
      userId: session.userId,
      yearsOfExperience: typeof cleanedData.yearsOfExperience === "number" && cleanedData.yearsOfExperience > derivedYears
        ? cleanedData.yearsOfExperience
        : derivedYears,
      profileCompleteness: calculateCompleteness(cleanedData),
      lastUpdated: new Date(),
    }

    console.log("[v0] Updating profile for user:", session.userId)
    console.log("[v0] Updated data keys:", Object.keys(updatedData))
    console.log("[v0] Profile completeness calculated:", updatedData.profileCompleteness)

    const profile = await JobSeekerProfile.findOneAndUpdate({ userId: session.userId }, updatedData, {
      new: true,
      upsert: true,
      runValidators: false, // Disable validators to allow empty strings
      setDefaultsOnInsert: true, // Set defaults when creating new document
    })

    console.log("[v0] Profile updated successfully, ID:", profile._id)
    console.log("[v0] Profile data after save:", {
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      completeness: profile.profileCompleteness,
    })

    // Mirror key fields into User for Talent Pool scoring and recompute immediately
    try {
      const userDoc = await User.findById(session.userId)
      if (userDoc) {
        // Mirror fields (only non-empty values)
        const fullName = [profile.firstName || "", profile.lastName || ""].join(" ").trim()
        if (fullName) (userDoc as any).name = fullName
        // Mirror derived years into User
        if (typeof updatedData.yearsOfExperience === "number") (userDoc as any).yearsOfExperience = updatedData.yearsOfExperience
        if (Array.isArray(profile.skills)) (userDoc as any).skills = profile.skills
        if (profile.summary !== undefined) (userDoc as any).professionalSummary = profile.summary
        if (profile.linkedinUrl) (userDoc as any).linkedinUrl = profile.linkedinUrl
        if (profile.location) (userDoc as any).businessLocation = profile.location
        if (Array.isArray((profile as any).projects)) (userDoc as any).projects = (profile as any).projects
        if (Array.isArray((profile as any).achievements)) (userDoc as any).achievements = (profile as any).achievements
        // Mark profile as complete if completeness >= 60
        if (typeof profile.profileCompleteness === "number") (userDoc as any).isProfileComplete = profile.profileCompleteness >= 60

        // Recompute profile score
        const breakdown = await computeProfileScore(userDoc as any)
          ; (userDoc as any).scores = breakdown as any
          ; (userDoc as any).profileScore = breakdown.total
          ; (userDoc as any).scoreVersion = 1
          ; (userDoc as any).lastScoreComputedAt = new Date()
        await userDoc.save()
        console.log("[v0] User score recomputed:", breakdown)
      }
    } catch (e) {
      console.warn("[v0] Warning: failed to mirror to User or recompute score", e)
    }

    // Normalize arrays in response
    const putObj = profile.toObject()
    const putResponse = {
      message: "Profile updated successfully",
      ...putObj,
      skills: Array.isArray(putObj.skills) ? putObj.skills : [],
      projects: Array.isArray((putObj as any).projects) ? (putObj as any).projects : [],
      achievements: Array.isArray((putObj as any).achievements) ? (putObj as any).achievements : [],
      experiences: Array.isArray((putObj as any).experiences) ? (putObj as any).experiences : [],
    }

    return NextResponse.json(putResponse)
  } catch (error) {
    console.error("[v0] Error in PUT /api/job-seeker/profile:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")

    return NextResponse.json(
      {
        message: "Failed to update profile",
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : "No details available",
      },
      { status: 500 },
    )
  }
}
