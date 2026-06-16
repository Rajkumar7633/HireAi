import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import {
  getApplicationCompletedAt,
  getApplicationTestScore,
  isApplicationTestCompleted,
} from "@/lib/test-submission"
import { getCollegeAssignmentModel, getFlexTestModel } from "@/lib/flex-test"

type CollegeAssignmentLean = {
  _id: unknown
  testId?: unknown
  testTitle?: string
  dueDate?: Date
  assignedAt?: Date
  completions?: Array<{
    studentId?: string
    status?: string
    score?: number
    completedAt?: Date
  }>
}

// GET: all tests assigned to this job seeker (recruiter applications + college assignments)
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const userId = session.userId

    const applications = await (Application as any)
      .find({ jobSeekerId: userId, testId: { $exists: true, $ne: null } })
      .populate({ path: "testId", select: "title description timeLimit durationMinutes passingScore questions" })
      .populate({ path: "jobDescriptionId", select: "title companyName" })
      .lean()

    const recruiterTests = applications
      .filter((a: { testId?: unknown }) => a.testId)
      .map((a: any) => {
        const t = a.testId as any
        const completed = isApplicationTestCompleted(a)
        const score = getApplicationTestScore(a)
        const completedAt = getApplicationCompletedAt(a)
        const isInProgress = String(a.status) === "in_progress" && !completed

        return {
          _id: t._id,
          testId: t._id,
          title: t.title || "Assessment",
          description: t.description || "",
          timeLimit: t.timeLimit || t.durationMinutes || 30,
          passingScore: t.passingScore || 60,
          questionCount: (t.questions || []).length,
          source: "recruiter",
          companyName: a.jobDescriptionId?.companyName || "Recruiter",
          jobTitle: a.jobDescriptionId?.title || "",
          applicationId: a._id,
          assignmentId: null,
          status: completed ? "completed" : isInProgress ? "in_progress" : "pending",
          score,
          completedAt,
          assignedAt: a.testAssignedAt || a.assignedAt || a.updatedAt,
        }
      })

    const AssignmentModel = getCollegeAssignmentModel()
    const assignments = await AssignmentModel.find({
      studentIds: { $in: [userId, String(userId)] },
    }).lean() as CollegeAssignmentLean[]

    const testIds = assignments.map((a) => a.testId).filter(Boolean)
    const FlexTest = getFlexTestModel()
    const collegeTestDocs = testIds.length
      ? await FlexTest.find({ _id: { $in: testIds } })
          .select("title description timeLimit durationMinutes passingScore questions")
          .lean()
      : []

    const testMap: Record<string, Record<string, unknown>> = {}
    for (const t of collegeTestDocs) {
      testMap[String((t as { _id: unknown })._id)] = t as Record<string, unknown>
    }

    const collegeDrivenTests = assignments.map((a) => {
      const tid = String(a.testId)
      const t = testMap[tid] || {}
      const completion = (a.completions || []).find(
        (c: { studentId?: string }) => String(c.studentId) === userId,
      )
      const completed = completion?.status === "completed"
      const inProgress = completion?.status === "in_progress"
      return {
        _id: a.testId,
        testId: a.testId,
        title: a.testTitle || (t.title as string) || "College Assessment",
        description: (t.description as string) || "",
        timeLimit: (t.timeLimit as number) || (t.durationMinutes as number) || 30,
        passingScore: (t.passingScore as number) || 60,
        questionCount: ((t.questions as unknown[]) || []).length,
        source: "college",
        companyName: "College",
        jobTitle: "",
        applicationId: null,
        assignmentId: a._id,
        dueDate: a.dueDate,
        status: completed ? "completed" : inProgress ? "in_progress" : "pending",
        score: completion?.score ?? null,
        completedAt: completion?.completedAt || null,
        assignedAt: a.assignedAt,
      }
    })

    const seen = new Map<string, any>()
    for (const t of [...recruiterTests, ...collegeDrivenTests]) {
      const key = `${t.source}:${t.assignmentId || t.applicationId || t.testId}`
      const existing = seen.get(key)
      if (!existing || (existing.status !== "completed" && t.status === "completed")) {
        seen.set(key, t)
      }
    }

    const tests = Array.from(seen.values()).sort(
      (a, b) => new Date(b.assignedAt || 0).getTime() - new Date(a.assignedAt || 0).getTime(),
    )

    return NextResponse.json({ tests })
  } catch (error) {
    console.error("GET job-seeker tests error:", error)
    return NextResponse.json({ tests: [] })
  }
}
