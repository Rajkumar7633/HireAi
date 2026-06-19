import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import {
export { dynamic } from "@/lib/api-dynamic"

  getCollegeAssignmentModel,
  getFlexTestModel,
  sanitizeTestForCandidate,
} from "@/lib/flex-test"

export async function GET(
  req: NextRequest,
  { params }: { params: { assignmentId: string } },
) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const AssignmentModel = getCollegeAssignmentModel()
    const assignment = await AssignmentModel.findById(params.assignmentId).lean() as Record<string, unknown> | null

    if (!assignment) {
      return NextResponse.json({ message: "Assignment not found" }, { status: 404 })
    }

    const studentIds = (assignment.studentIds as string[]) || []
    const userId = session.userId
    const isAssigned = studentIds.some((sid) => String(sid) === userId)
    if (!isAssigned) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const testId = assignment.testId
    if (!testId) {
      return NextResponse.json({ message: "No test linked" }, { status: 400 })
    }

    const FlexTest = getFlexTestModel()
    const test = await FlexTest.findById(testId).lean() as Record<string, unknown> | null
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    const completions = (assignment.completions as Array<Record<string, unknown>>) || []
    const completion = completions.find((c) => String(c.studentId) === userId)

    const safeTest = sanitizeTestForCandidate(test)

    return NextResponse.json({
      assignment: {
        _id: assignment._id,
        testTitle: assignment.testTitle,
        dueDate: assignment.dueDate,
        assignedAt: assignment.assignedAt,
        status: completion?.status || "assigned",
        testScore: completion?.score ?? null,
        completedAt: completion?.completedAt ?? null,
      },
      test: safeTest,
    })
  } catch (error) {
    console.error("[college-tests GET]", error)
    return NextResponse.json({ message: "Failed to load test" }, { status: 500 })
  }
}
