import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Application from "@/models/Application"
import mongoose from "mongoose"
export { dynamic } from "@/lib/api-dynamic"


const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || (session.role !== "college" && session.role !== "college_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const studentId = params.id

  try {
    await connectDB()

    // Fetch base user — verify it belongs to this college
    let user: any = null
    try {
      user = await (User as any)
        .findOne({ _id: studentId, onboardedByCollege: session.userId })
        .select("-passwordHash")
        .lean()
    } catch {
      // fallback: find without college check (older records)
      user = await (User as any).findById(studentId).select("-passwordHash").lean()
    }

    if (!user) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Applications
    const applications = await (Application as any)
      .find({ jobSeekerId: studentId })
      .populate({ path: "jobDescriptionId", select: "title companyName location jobType salary" })
      .sort({ appliedAt: -1 })
      .lean()

    // Resume
    let resumeUrl: string | null = null
    try {
      const Resume = mongoose.models.Resume || mongoose.model("Resume", new mongoose.Schema({}, { strict: false }))
      const resume = await (Resume as any).findOne({ userId: studentId }).sort({ createdAt: -1 }).lean()
      resumeUrl = (resume as any)?.fileUrl || (resume as any)?.url || null
    } catch { /**/ }

    // Test assignments by this college
    const AssignmentModel = mongoose.models.CollegeTestAssignment ||
      mongoose.model("CollegeTestAssignment", new mongoose.Schema({}, { strict: false }))
    const assignments = await (AssignmentModel as any)
      .find({ collegeId: session.userId, "completions.studentId": studentId })
      .lean()

    const testResults = assignments.map((a: any) => {
      const completion = a.completions?.find((c: any) => String(c.studentId) === studentId)
      return {
        testId: String(a.testId),
        testTitle: a.testTitle || "Untitled Test",
        assignedAt: a.assignedAt,
        dueDate: a.dueDate || null,
        status: completion?.status || "assigned",
        score: completion?.score ?? null,
        completedAt: completion?.completedAt ?? null,
      }
    })

    // Profile completeness score
    const profileFields = [
      user.name, user.email, user.phone, user.department, user.batch,
      user.cgpa, (user.skills || []).length > 0, user.professionalSummary,
      resumeUrl, user.linkedinUrl,
    ]
    const profileCompleteness = Math.round(
      (profileFields.filter(Boolean).length / profileFields.length) * 100
    )

    return NextResponse.json({
      student: {
        _id: studentId,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        department: user.department || "",
        batch: user.batch || "",
        cgpa: user.cgpa ?? null,
        skills: user.skills || [],
        placementStatus: user.placementStatus || "unplaced",
        companyPlacedAt: user.companyPlacedAt || "",
        packageLPA: user.packageLPA ?? null,
        avatar: user.profileImage || null,
        resumeUrl,
        linkedIn: user.linkedinUrl || "",
        github: user.twitterUrl || "",
        bio: user.professionalSummary || "",
        yearsOfExperience: user.yearsOfExperience || 0,
        projects: user.projects || [],
        achievements: user.achievements || [],
        profileScore: user.profileScore || 0,
        profileCompleteness,
        scores: user.scores || null,
        createdAt: user.createdAt,
        placementReadiness: null,
        testResults,
        applications: applications.map((a: any) => ({
          _id: String(a._id),
          jobTitle: a.jobDescriptionId?.title || "Unknown Role",
          companyName: a.jobDescriptionId?.companyName || "Unknown Company",
          location: a.jobDescriptionId?.location || "",
          status: a.status,
          appliedAt: a.appliedAt,
          testScore: a.testScore ?? null,
          aiMatchScore: a.aiMatchScore ?? null,
        })),
      },
    })
  } catch (err: any) {
    console.error("[students/[id]]", err)
    return NextResponse.json({ error: "Failed to fetch student" }, { status: 500 })
  }
}
