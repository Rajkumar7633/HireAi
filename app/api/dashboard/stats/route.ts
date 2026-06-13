import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Application from "@/models/Application"
import JobDescription from "@/models/JobDescription"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    if (session.role === "admin") {
      const [
        totalUsers, lastMonthUsers,
        activeJobs, lastMonthJobs,
        totalApplications, lastMonthApplications,
        hiredCount, totalClosed,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
        JobDescription.countDocuments({ status: "active" }),
        JobDescription.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
        Application.countDocuments(),
        Application.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
        Application.countDocuments({ status: { $in: ["hired", "Hired"] } }),
        Application.countDocuments({ status: { $in: ["hired", "Hired", "rejected", "Rejected"] } }),
      ])

      const successRate = totalClosed > 0 ? Math.round((hiredCount / totalClosed) * 100) : 0
      const thisMonthUsers = await User.countDocuments({ createdAt: { $gte: startOfMonth } })
      const userGrowth = lastMonthUsers > 0 ? Math.round(((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100) : 0
      const thisMonthApps = await Application.countDocuments({ createdAt: { $gte: startOfMonth } })
      const appGrowth = lastMonthApplications > 0 ? Math.round(((thisMonthApps - lastMonthApplications) / lastMonthApplications) * 100) : 0

      return NextResponse.json({
        role: "admin",
        stats: [
          { label: "Total Users", value: totalUsers.toLocaleString(), change: `${userGrowth >= 0 ? "+" : ""}${userGrowth}% from last month` },
          { label: "Active Jobs", value: activeJobs.toLocaleString(), change: `${lastMonthJobs} posted last month` },
          { label: "Applications", value: totalApplications.toLocaleString(), change: `${appGrowth >= 0 ? "+" : ""}${appGrowth}% from last month` },
          { label: "Success Rate", value: `${successRate}%`, change: `${hiredCount} hired total` },
        ],
      })
    }

    if (session.role === "recruiter") {
      const [
        myJobs, activeMyJobs,
        totalApps, newApps,
        shortlisted, hired,
      ] = await Promise.all([
        JobDescription.countDocuments({ recruiterId: session.userId }),
        JobDescription.countDocuments({ recruiterId: session.userId, status: "active" }),
        Application.countDocuments({ recruiterId: session.userId }),
        Application.countDocuments({ recruiterId: session.userId, createdAt: { $gte: startOfMonth } }),
        Application.countDocuments({ recruiterId: session.userId, status: { $in: ["shortlisted", "Shortlisted"] } }),
        Application.countDocuments({ recruiterId: session.userId, status: { $in: ["hired", "Hired"] } }),
      ])

      return NextResponse.json({
        role: "recruiter",
        stats: [
          { label: "My Job Posts", value: myJobs.toLocaleString(), change: `${activeMyJobs} currently active` },
          { label: "Total Applications", value: totalApps.toLocaleString(), change: `${newApps} this month` },
          { label: "Shortlisted", value: shortlisted.toLocaleString(), change: "Candidates in pipeline" },
          { label: "Hired", value: hired.toLocaleString(), change: "Successful placements" },
        ],
      })
    }

    if (session.role === "job_seeker") {
      const [
        totalApps, pendingApps,
        interviewApps, hiredApps,
      ] = await Promise.all([
        Application.countDocuments({ jobSeekerId: session.userId }),
        Application.countDocuments({ jobSeekerId: session.userId, status: { $in: ["pending", "Pending", "applied"] } }),
        Application.countDocuments({ jobSeekerId: session.userId, status: { $in: ["interview", "Interview Scheduled", "technical_interview"] } }),
        Application.countDocuments({ jobSeekerId: session.userId, status: { $in: ["hired", "Hired", "offer"] } }),
      ])

      const activeJobs = await JobDescription.countDocuments({ status: "active" })

      return NextResponse.json({
        role: "job_seeker",
        stats: [
          { label: "Applications Sent", value: totalApps.toLocaleString(), change: `${pendingApps} under review` },
          { label: "Interviews", value: interviewApps.toLocaleString(), change: "Scheduled or upcoming" },
          { label: "Offers", value: hiredApps.toLocaleString(), change: "Successful outcomes" },
          { label: "Open Jobs", value: activeJobs.toLocaleString(), change: "Available right now" },
        ],
      })
    }

    if (session.role === "college" || session.role === "college_admin") {
      const collegeUser = await User.findById(session.userId).select("collegeName totalStudents placementRate").lean()
      const recentApps = await Application.countDocuments({ createdAt: { $gte: startOfMonth } })

      return NextResponse.json({
        role: "college",
        stats: [
          { label: "College", value: (collegeUser as any)?.collegeName || "Your College", change: "Registered institution" },
          { label: "Total Students", value: ((collegeUser as any)?.totalStudents || 0).toLocaleString(), change: "Enrolled students" },
          { label: "Placement Rate", value: `${(collegeUser as any)?.placementRate || 0}%`, change: "Overall placement" },
          { label: "This Month Apps", value: recentApps.toLocaleString(), change: "Platform-wide applications" },
        ],
      })
    }

    return NextResponse.json({ stats: [] })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ message: "Failed to fetch stats" }, { status: 500 })
  }
}
