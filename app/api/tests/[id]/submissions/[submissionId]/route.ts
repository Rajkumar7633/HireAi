import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { enrichSubmissionRecord, populateSubmissionPeople } from "@/lib/enrich-submission"
import { getTestSubmissionModel } from "@/lib/test-submission"
import mongoose from "mongoose"
import Application from "@/models/Application"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; submissionId: string } },
) {
  const session = await getSession(request)
  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id: testId, submissionId } = params

  try {
    await connectDB()
    const TestSubmissionModel = getTestSubmissionModel()

    let submission: any =
      (mongoose.Types.ObjectId.isValid(submissionId)
        ? await TestSubmissionModel.findOne({ _id: submissionId, testId }).lean()
        : null) ||
      (mongoose.Types.ObjectId.isValid(submissionId)
        ? await Application.findOne({ _id: submissionId, testId }).lean()
        : null)

    if (!submission) {
      return NextResponse.json({ message: "Submission not found" }, { status: 404 })
    }

    if (submission.testScore != null && !submission.percentage) {
      submission = {
        _id: submission._id,
        testId,
        applicationId: submission._id,
        candidateId: submission.jobSeekerId,
        percentage: submission.testScore,
        totalScore: submission.testScore,
        submittedAt: submission.testCompletedAt || submission.completedAt,
        answers: submission.testAnswers || submission.answers || [],
      }
    }

    const [populated] = await populateSubmissionPeople([submission])
    const enriched = await enrichSubmissionRecord(populated, testId)
    return NextResponse.json(enriched, { status: 200 })
  } catch (error) {
    console.error("GET submission detail error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
