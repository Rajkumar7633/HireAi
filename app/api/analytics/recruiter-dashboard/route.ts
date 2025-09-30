import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import JobDescription from "@/models/JobDescription"
import Application from "@/models/Application"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const recruiterId = session.userId

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

    const applicationsByStatus = await Application.aggregate([
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

    // Top Skills from job descriptions
    const topSkills = await JobDescription.aggregate([
      { $match: { recruiterId } },
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ])

    // Calculate average match score (mock for now)
    const averageMatchScore = 75.5

    const analyticsData = {
      totalJobDescriptions,
      totalApplications,
      applicationsByStatus,
      topSkills,
      averageMatchScore,
    }

    console.log("[v0] Analytics data generated:", analyticsData)

    return NextResponse.json(analyticsData)
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
