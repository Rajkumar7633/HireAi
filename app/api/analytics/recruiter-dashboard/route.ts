import { type NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import JobDescription from "@/models/JobDescription"
import Application from "@/models/Application"
import { cacheGet, cacheSet, cacheKey } from "@/lib/redis-cache"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const recruiterId = session.userId

    // Try cache first (optional)
    try {
      const key = cacheKey({ route: "recruiter-dashboard", recruiterId })
      const hit = await cacheGet(key)
      if (hit) return NextResponse.json(JSON.parse(hit))
    } catch {}

    console.log("[v0] Fetching analytics for recruiter:", recruiterId)

    // Total Job Descriptions Posted
    const totalJobDescriptions = await JobDescription.countDocuments({
      recruiterId,
    })

    console.log("[v0] Total job descriptions:", totalJobDescriptions)

    // Get job description IDs for this recruiter
    const jobDescriptions = await JobDescription.find({ recruiterId }).select("_id")
    const jobDescriptionIds = jobDescriptions.map((jd) => jd._id)

    console.log("[v0] Job description IDs:", jobDescriptionIds)

    // Total Applications Received
    const totalApplications = await Application.countDocuments({
      jobDescriptionId: { $in: jobDescriptionIds },
    })

    console.log("[v0] Total applications:", totalApplications)

    let applicationsByStatus = await Application.aggregate([
      { $match: { jobDescriptionId: { $in: jobDescriptionIds } } },
      {
        $group: {
          _id: { $toLower: "$status" },
          count: { $sum: 1 },
          originalStatus: { $first: "$status" },
        },
      },
    ])

    console.log("[v0] Applications by status:", applicationsByStatus)

    // Top Skills from job descriptions (use skillsRequired field)
    let topSkills = await JobDescription.aggregate([
      { $match: { recruiterId } },
      { $unwind: "$skillsRequired" },
      { $group: { _id: "$skillsRequired", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])

    // Calculate average match score (placeholder metric retained at zero until computed from matches)
    const averageMatchScore = 0

    const analyticsData = {
      totalJobDescriptions,
      totalApplications,
      applicationsByStatus,
      topSkills,
      averageMatchScore,
    }

    console.log("[v0] Analytics data generated:", analyticsData)

    try {
      const key = cacheKey({ route: "recruiter-dashboard", recruiterId })
      await cacheSet(key, JSON.stringify(analyticsData), 60)
    } catch {}

    // ETag + Cache-Control
    const body = JSON.stringify(analyticsData)
    const etag = '"' + createHash('sha1').update(body).digest('base64') + '"'
    const inm = request.headers.get('if-none-match')
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      "ETag": etag,
    }
    if (inm && inm === etag) {
      return new NextResponse(null, { status: 304, headers })
    }
    return new NextResponse(body, { status: 200, headers })
  } catch (error) {
    console.error("[v0] Analytics API Error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Failed to fetch analytics data",
      },
      { status: 500 },
    )
  }
}
