import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import JobDescription from "@/models/JobDescription"

// GET /api/job-descriptions/[id]/shortlisted
// Lists shortlisted candidates (status == "Shortlisted" or shortlisted == true) for a job
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const job = await JobDescription.findById(params.id)
    if (!job || job.recruiterId.toString() !== session.userId) {
      return NextResponse.json({ message: "Job not found or unauthorized" }, { status: 404 })
    }

    const apps = await Application.find({
      jobDescriptionId: params.id,
      $or: [{ status: "Shortlisted" }, { shortlisted: true }],
    })
      .populate({ path: "jobSeekerId", select: "name email" })
      .populate({ path: "resumeId", select: "fileName fileUrl" })
      .sort({ aiMatchScore: -1, atsScore: -1, applicationDate: -1 })
      .lean()

    const candidates = (apps || []).map((a: any) => ({
      applicationId: String(a._id),
      jobSeeker: a.jobSeekerId ? { _id: String(a.jobSeekerId._id), name: a.jobSeekerId.name, email: a.jobSeekerId.email } : undefined,
      resume: a.resumeId ? { _id: String(a.resumeId._id), fileName: a.resumeId.fileName, fileUrl: a.resumeId.fileUrl } : undefined,
      status: a.status,
      aiMatchScore: a.aiMatchScore ?? null,
      atsScore: a.atsScore ?? null,
      skillsMatched: a.skillsMatched || [],
      missingSkills: a.missingSkills || [],
      aiExplanation: a.aiExplanation || "",
      applicationDate: a.applicationDate,
    }))

    return NextResponse.json({ jobId: String(job._id), total: candidates.length, candidates })
  } catch (error) {
    console.error("Shortlisted fetch error:", error)
    return NextResponse.json({ message: "Failed to fetch shortlisted candidates" }, { status: 500 })
  }
}
