import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import Notification from "@/models/Notification"
import User from "@/models/User"
import { getCollegeAssignmentModel, getFlexTestModel } from "@/lib/flex-test"
import { getTestSubmissionModel } from "@/lib/test-submission"
import { scoreTestAnswers } from "@/lib/score-test-answers"

export async function POST(
  req: NextRequest,
  { params }: { params: { assignmentId: string } },
) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let body: {
    answers?: unknown[]
    tabSwitches?: number
    integrityAudit?: Record<string, unknown>
    activityLog?: unknown[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }

  try {
    await connectDB()
    const AssignmentModel = getCollegeAssignmentModel()
    const assignment = await AssignmentModel.findById(params.assignmentId)

    if (!assignment) {
      return NextResponse.json({ message: "Assignment not found" }, { status: 404 })
    }

    const studentIds = (assignment.studentIds as string[]) || []
    const userId = session.userId
    if (!studentIds.some((sid) => String(sid) === userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const completions = assignment.completions || []
    const existing = completions.find((c: { studentId?: string; status?: string }) =>
      String(c.studentId) === userId && c.status === "completed",
    )
    if (existing) {
      return NextResponse.json({ message: "Test already completed" }, { status: 400 })
    }

    const FlexTest = getFlexTestModel()
    const test = await FlexTest.findById(assignment.testId).lean() as Record<string, unknown> | null
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    const answers = (body.answers || []) as Array<{
      questionId: string
      answer: string | string[]
      language?: string
    }>

    const { score, passedOverall, breakdown } = await scoreTestAnswers(test, answers)
    const submittedAt = new Date()

    const student = await User.findById(userId).select("name").lean() as { name?: string } | null
    const studentName = student?.name || "Student"

    const updatedCompletions = completions.map((c: { studentId?: string }) =>
      String(c.studentId) === userId
        ? {
            ...c,
            studentId: userId,
            studentName,
            status: "completed",
            score,
            completedAt: submittedAt,
          }
        : c,
    )

    if (!updatedCompletions.some((c: { studentId?: string }) => String(c.studentId) === userId)) {
      updatedCompletions.push({
        studentId: userId,
        studentName,
        status: "completed",
        score,
        completedAt: submittedAt,
      })
    }

    assignment.completions = updatedCompletions
    assignment.markModified("completions")
    await assignment.save()

    const TestSubmissionModel = getTestSubmissionModel()
    const submissionDoc = await TestSubmissionModel.create({
      testId: test._id,
      collegeAssignmentId: assignment._id,
      applicationId: assignment._id,
      candidateId: userId,
      collegeId: assignment.collegeId,
      answers,
      totalScore: score,
      percentage: score,
      status: "completed",
      submittedAt,
      integrityAudit: body.integrityAudit || {
        score: 100,
        summary: "College test submission.",
        flags: [],
        logs: body.activityLog || [],
        tabSwitches: body.tabSwitches || 0,
      },
      tabSwitches: body.tabSwitches || 0,
    })

    const collegeId = assignment.collegeId
    if (collegeId) {
      try {
        await Notification.create({
          userId: new mongoose.Types.ObjectId(String(collegeId)),
          type: "test_completed",
          message: `${studentName} completed "${assignment.testTitle || test.title}" with ${score}%.`,
          relatedEntity: {
            id: assignment.testId,
            type: "test",
          },
        })
      } catch {
        // non-blocking
      }
    }

    return NextResponse.json({
      message: "Test submitted successfully",
      score,
      passed: passedOverall,
      submissionId: submissionDoc._id.toString(),
      breakdown,
      status: passedOverall ? "Test Passed" : "Test Failed",
    })
  } catch (error) {
    console.error("[college-tests submit]", error)
    return NextResponse.json({ message: "Submission failed" }, { status: 500 })
  }
}
