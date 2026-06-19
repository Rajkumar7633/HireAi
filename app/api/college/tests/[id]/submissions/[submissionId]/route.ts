import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { enrichSubmissionRecord, populateSubmissionPeople } from "@/lib/enrich-submission"
import { getTestSubmissionModel } from "@/lib/test-submission"
import { assertCollegeOwnsTest, getCollegeAssignedCandidates } from "@/lib/college-test-stats"
import mongoose from "mongoose"
export { dynamic } from "@/lib/api-dynamic"


function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; submissionId: string } },
) {
  const session = await getSession(request)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id: testId, submissionId } = params

  try {
    await connectDB()
    const owned = await assertCollegeOwnsTest(testId, session!.userId)
    if (!owned) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    const TestSubmissionModel = getTestSubmissionModel()
    let submission: Record<string, unknown> | null = null

    if (mongoose.Types.ObjectId.isValid(submissionId)) {
      submission = await TestSubmissionModel.findOne({
        _id: submissionId,
        testId,
      }).lean() as Record<string, unknown> | null
    }

    if (!submission) {
      const assigned = await getCollegeAssignedCandidates(testId, session!.userId)
      const appRow = assigned.find(
        (a) => String(a.applicationId) === submissionId || String(a._id) === submissionId,
      )
      if (appRow) {
        submission = {
          ...appRow,
          _id: appRow._id,
          applicationId: appRow.applicationId,
          percentage: appRow.testScore,
          totalScore: appRow.testScore,
          submittedAt: appRow.testCompletedAt,
          status: appRow.testScore != null ? "completed" : "assigned",
        }
      }
    }

    if (!submission) {
      return NextResponse.json({ message: "Submission not found" }, { status: 404 })
    }

    const [populated] = await populateSubmissionPeople([submission])
    const enriched = await enrichSubmissionRecord(populated, testId)
    return NextResponse.json(enriched, { status: 200 })
  } catch (error) {
    console.error("[college submission detail GET]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
