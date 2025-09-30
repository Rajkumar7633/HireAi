import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import JobDescription from "@/models/JobDescription"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Verify job belongs to recruiter
    const jobDescription = await JobDescription.findById(params.id)
    if (!jobDescription || jobDescription.recruiterId.toString() !== session.userId) {
      return NextResponse.json({ message: "Job not found or unauthorized" }, { status: 404 })
    }

    const apps = await Application.find({ jobDescriptionId: params.id })
      .populate({ path: "jobSeekerId", select: "name email" })
      .populate({ path: "resumeId", select: "filename originalName" })
      .populate({ path: "testId", select: "title" })
      .sort({ applicationDate: -1 })
      .lean()

    const applications = (apps || []).map((a: any) => ({
      _id: String(a._id),
      status: a.status,
      applicationDate: a.applicationDate,
      testScore: a.testScore,
      testCompletedAt: a.testCompletedAt,
      jobSeekerId: a.jobSeekerId ? { _id: String(a.jobSeekerId._id), name: a.jobSeekerId.name, email: a.jobSeekerId.email } : undefined,
      resumeId: a.resumeId ? { _id: String(a.resumeId._id), filename: a.resumeId.filename, originalName: a.resumeId.originalName } : undefined,
      testId: a.testId ? { _id: String(a.testId._id), title: a.testId.title } : undefined,
      screeningAnswers: a.screeningAnswers || [],
      applicationProfile: a.applicationProfile || undefined,
    }))

    return NextResponse.json({ applications, jobTitle: jobDescription.title, applicationMode: jobDescription.applicationMode })
  } catch (error) {
    console.error("Error fetching candidates:", error)
    return NextResponse.json({ message: "Failed to fetch candidates" }, { status: 500 })
  }
}
