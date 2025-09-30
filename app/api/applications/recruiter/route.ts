import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized. Only recruiters can access this endpoint." }, { status: 401 })
    }

    await connectDB()

    // Find all applications for jobs posted by this recruiter
    const applications = await Application.find()
      .populate({
        path: "jobDescriptionId",
        match: { recruiterId: session.userId },
        select: "title location recruiterId",
      })
      .populate("jobSeekerId", "name email")
      .populate("resumeId", "filename originalName")
      .populate("testId", "title")
      .sort({ applicationDate: -1 })

    // Filter out applications where jobDescriptionId is null (not recruiter's jobs)
    const filteredApplications = applications.filter((app) => app.jobDescriptionId !== null)

    return NextResponse.json({
      applications: filteredApplications,
      count: filteredApplications.length,
    })
  } catch (error) {
    console.error("Error fetching recruiter applications:", error)
    return NextResponse.json({ message: "Failed to fetch applications" }, { status: 500 })
  }
}
