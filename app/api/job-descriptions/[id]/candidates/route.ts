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

    const jobDescription = await JobDescription.findById(params.id)
    if (!jobDescription || jobDescription.recruiterId.toString() !== session.userId) {
      return NextResponse.json({ message: "Job not found or unauthorized" }, { status: 404 })
    }

    const apps = await Application.find({ jobDescriptionId: params.id })
      .populate({ path: "jobSeekerId", select: "name email" })
      .populate({ path: "resumeId", select: "filename originalName" })
      .populate({ path: "testId", select: "title _id" })
      .sort({ applicationDate: -1 })
      .lean()

    const applications = (apps || []).map((a: any) => ({
      _id: String(a._id),
      status: a.status,
      applicationDate: a.applicationDate,
      // Test system fields
      testId: a.testId ? { _id: String(a.testId._id), title: a.testId.title } : undefined,
      testScore: a.testScore ?? null,
      testCompletedAt: a.testCompletedAt ?? null,
      // Assessment system fields
      assessmentId: a.assessmentId ? String(a.assessmentId) : undefined,
      score: a.score ?? null,
      completedAt: a.completedAt ?? null,
      startedAt: a.startedAt ?? null,
      // Candidate info
      jobSeekerId: a.jobSeekerId
        ? { _id: String(a.jobSeekerId._id), name: a.jobSeekerId.name, email: a.jobSeekerId.email }
        : undefined,
      resumeId: a.resumeId
        ? { _id: String(a.resumeId._id), filename: a.resumeId.filename, originalName: a.resumeId.originalName }
        : undefined,
      screeningAnswers: a.screeningAnswers || [],
      applicationProfile: a.applicationProfile || undefined,
      // AI screening
      aiMatchScore: a.aiMatchScore ?? null,
      atsScore: a.atsScore ?? null,
      skillsMatched: a.skillsMatched || [],
      missingSkills: a.missingSkills || [],
      aiExplanation: a.aiExplanation || "",
      shortlisted: a.shortlisted ?? false,
      // Multi-round workflow
      currentStage: a.currentStage || "application",
      rounds: (a.rounds || []).map((r: any) => ({
        roundName: r.roundName,
        stageKey: r.stageKey,
        status: r.status,
        latestScore: r.latestScore ?? null,
        testId: r.testId ? String(r.testId) : undefined,
      })),
    }))

    return NextResponse.json({
      applications,
      jobTitle: jobDescription.title,
      applicationMode: jobDescription.applicationMode,
    })
  } catch (error) {
    console.error("Error fetching candidates:", error)
    return NextResponse.json({ message: "Failed to fetch candidates" }, { status: 500 })
  }
}
