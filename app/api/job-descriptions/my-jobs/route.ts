import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import JobDescription from "@/models/JobDescription"
import { getSession } from "@/lib/auth"

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

    console.log("[v0] Fetching jobs for recruiter:", session.userId)

    const jobs = await JobDescription.find({ recruiterId: session.userId }).sort({ createdAt: -1 })

    console.log("[v0] Found jobs:", jobs.length)
    console.log(
      "[v0] Jobs data:",
      jobs.map((job) => ({ id: job._id, title: job.title, skills: job.skills || job.skillsRequired })),
    )

    const transformedJobs = jobs.map((job) => ({
      _id: job._id,
      title: job.title,
      description: job.description,
      location: job.location,
      salary: job.salary,
      employmentType: job.employmentType || job.jobType,
      skills: job.skills || job.skillsRequired || [],
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
      postedDate: job.postedDate || job.createdAt,
    }))

    return NextResponse.json({ jobDescriptions: transformedJobs })
  } catch (error) {
    console.error("Error fetching recruiter jobs:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
