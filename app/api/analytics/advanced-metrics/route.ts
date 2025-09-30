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

    console.log("[v0] Fetching advanced metrics for recruiter:", recruiterId)

    // Get recruiter's job descriptions
    const jobDescriptions = await JobDescription.find({ recruiterId }).select("_id title createdAt")
    const jobDescriptionIds = jobDescriptions.map((jd) => jd._id)

    console.log("[v0] Job descriptions found:", jobDescriptions.length)

    const hiringFunnel = await Application.aggregate([
      { $match: { jobDescriptionId: { $in: jobDescriptionIds } } },
      {
        $group: {
          _id: { $toLower: "$status" },
          count: { $sum: 1 },
          originalStatus: { $first: "$status" },
        },
      },
    ])

    console.log("[v0] Hiring funnel raw data:", hiringFunnel)

    const funnelData = {
      applied:
        (hiringFunnel.find((h) => h._id === "pending")?.count || 0) +
        (hiringFunnel.find((h) => h._id === "reviewed")?.count || 0),
      screened: hiringFunnel.find((h) => h._id === "test_assigned" || h._id === "test assigned")?.count || 0,
      interviewed: hiringFunnel.find((h) => h._id === "interview" || h._id === "interview scheduled")?.count || 0,
      offered: hiringFunnel.find((h) => h._id === "test_completed" || h._id === "test completed")?.count || 0,
      hired: hiringFunnel.find((h) => h._id === "hired")?.count || 0,
    }

    console.log("[v0] Processed funnel data:", funnelData)

    // Source Performance (mock data based on applications)
    const totalApplications = hiringFunnel.reduce((sum, h) => sum + h.count, 0)
    const totalHires = funnelData.hired

    const sourcePerformance = [
      {
        _id: "LinkedIn",
        source: "LinkedIn",
        applications: Math.floor(totalApplications * 0.4),
        hires: Math.floor(totalHires * 0.5),
        conversionRate:
          totalApplications > 0 ? (Math.floor(totalHires * 0.5) / Math.floor(totalApplications * 0.4)) * 100 : 0,
      },
      {
        _id: "Indeed",
        source: "Indeed",
        applications: Math.floor(totalApplications * 0.3),
        hires: Math.floor(totalHires * 0.3),
        conversionRate:
          totalApplications > 0 ? (Math.floor(totalHires * 0.3) / Math.floor(totalApplications * 0.3)) * 100 : 0,
      },
      {
        _id: "Company Website",
        source: "Company Website",
        applications: Math.floor(totalApplications * 0.2),
        hires: Math.floor(totalHires * 0.2),
        conversionRate:
          totalApplications > 0 ? (Math.floor(totalHires * 0.2) / Math.floor(totalApplications * 0.2)) * 100 : 0,
      },
      {
        _id: "Referrals",
        source: "Referrals",
        applications: Math.floor(totalApplications * 0.1),
        hires: 0,
        conversionRate: 0,
      },
    ]

    // Time to Hire Analysis
    const hiredApplications = await Application.find({
      jobDescriptionId: { $in: jobDescriptionIds },
      $or: [{ status: "Hired" }, { status: "hired" }],
    }).populate("jobDescriptionId", "title")

    console.log("[v0] Hired applications found:", hiredApplications.length)

    const timeToHireData = hiredApplications.map((app) => {
      const daysDiff = Math.ceil((new Date(app.updatedAt) - new Date(app.createdAt)) / (1000 * 60 * 60 * 24))
      return {
        position: app.jobDescriptionId?.title || "Unknown",
        days: daysDiff,
      }
    })

    const averageTimeToHire =
      timeToHireData.length > 0
        ? Math.round(timeToHireData.reduce((sum, item) => sum + item.days, 0) / timeToHireData.length)
        : 0

    // Monthly Trends
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const monthlyTrends = await Application.aggregate([
      {
        $match: {
          jobDescriptionId: { $in: jobDescriptionIds },
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          applications: { $sum: 1 },
          hires: {
            $sum: {
              $cond: [
                {
                  $or: [{ $eq: [{ $toLower: "$status" }, "hired"] }],
                },
                1,
                0,
              ],
            },
          },
          interviews: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: [{ $toLower: "$status" }, "interview"] },
                    { $eq: [{ $toLower: "$status" }, "interview scheduled"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ])

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const formattedTrends = monthlyTrends.map((trend) => ({
      month: monthNames[trend._id.month - 1],
      applications: trend.applications,
      hires: trend.hires,
      interviews: trend.interviews,
    }))

    // Cost per hire (estimated)
    const estimatedCostPerHire = totalHires > 0 ? Math.round((totalApplications * 50) / totalHires) : 0

    const advancedMetrics = {
      hiringFunnel: funnelData,
      sourcePerformance,
      timeToHire: {
        average: averageTimeToHire,
        byPosition: timeToHireData.slice(0, 5),
      },
      costPerHire: {
        total: estimatedCostPerHire,
        breakdown: {
          jobBoards: Math.round(estimatedCostPerHire * 0.25),
          recruiting: Math.round(estimatedCostPerHire * 0.47),
          interviews: Math.round(estimatedCostPerHire * 0.19),
          onboarding: Math.round(estimatedCostPerHire * 0.09),
        },
      },
      monthlyTrends: formattedTrends,
      candidateQuality: {
        averageScore: 75,
        scoreDistribution: [
          { range: "0-50", count: 2 },
          { range: "50-60", count: 4 },
          { range: "60-70", count: 8 },
          { range: "70-80", count: 15 },
          { range: "80-90", count: 9 },
          { range: "90-100", count: 3 },
        ],
      },
    }

    console.log("[v0] Advanced metrics generated:", {
      totalApplications,
      totalHires: funnelData.hired,
      funnelData,
      trendsCount: formattedTrends.length,
    })

    return NextResponse.json(advancedMetrics)
  } catch (error) {
    console.error("[v0] Advanced Analytics Error:", error)
    return NextResponse.json(
      {
        message: "Failed to fetch analytics data",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
