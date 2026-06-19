import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import JobDescription from "@/models/JobDescription"
import Application from "@/models/Application"
import { getSession } from "@/lib/auth"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)

    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    if (session.role !== "recruiter") {
      return NextResponse.json({ message: "Only recruiters can view their jobs" }, { status: 403 })
    }

    await connectDB()

    const jobs = await JobDescription.find({ recruiterId: session.userId }).sort({ createdAt: -1 })

    // Aggregate application counts per job
    const jobIds = jobs.map((j) => j._id)
    const appCounts = await Application.aggregate([
      { $match: { $or: [{ jobDescriptionId: { $in: jobIds } }, { jobId: { $in: jobIds } }] } },
      {
        $group: {
          _id: { $ifNull: ["$jobDescriptionId", "$jobId"] },
          total: { $sum: 1 },
          shortlisted: { $sum: { $cond: [{ $in: ["$status", ["Shortlisted", "shortlisted"]] }, 1, 0] } },
          hired: { $sum: { $cond: [{ $in: ["$status", ["Hired", "hired"]] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ["$status", ["Pending", "pending", "Under Review"]] }, 1, 0] } },
        },
      },
    ])

    const countMap = new Map(appCounts.map((c) => [c._id.toString(), c]))

    const transformedJobs = jobs.map((job) => {
      const counts = countMap.get(job._id.toString()) || { total: 0, shortlisted: 0, hired: 0, pending: 0 }
      return {
        _id: job._id,
        title: job.title,
        description: job.description,
        location: job.location,
        salary: job.salary,
        employmentType: job.employmentType || job.jobType,
        experienceLevel: job.experienceLevel,
        remotePolicy: job.remotePolicy,
        skills: job.skills || job.skillsRequired || [],
        requirements: job.requirements || [],
        responsibilities: job.responsibilities || [],
        postedDate: job.postedDate || job.createdAt,
        isActive: typeof job.isActive === "boolean" ? job.isActive : job.status !== "inactive",
        status: job.status || (job.isActive === false ? "inactive" : "active"),
        applicationCount: counts.total,
        shortlistedCount: counts.shortlisted,
        hiredCount: counts.hired,
        pendingCount: counts.pending,
      }
    })

    return NextResponse.json({ jobDescriptions: transformedJobs, jobs: transformedJobs })
  } catch (error) {
    console.error("Error fetching recruiter jobs:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
