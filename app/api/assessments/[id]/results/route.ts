import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Assessment from "@/models/Assessment"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const assessmentId = params.id
    const session = await getSession(request)

    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const applicationDoc = await Application.findOne({
      jobSeekerId: session.userId,
      assessmentId,
      status: { $in: ["Assessment Completed", "completed", "test_completed"] },
    })
      .populate("assessmentId", "title totalPoints questions durationMinutes")
      .lean()

    if (!applicationDoc) {
      return NextResponse.json({ success: false, message: "No completed results found" }, { status: 404 })
    }

    const application: any = applicationDoc as any
    const assessment: any = application.assessmentId
    const totalQuestions = assessment?.questions?.length || 0
    const correctAnswers = (application.answers || []).filter((a: any) => a.isCorrect).length

    // Build a lookup for question metadata
    const questionMeta: Record<string, any> = {}
    ;(assessment?.questions || []).forEach((q: any) => {
      questionMeta[q._id?.toString?.() || String(q._id)] = q
    })

    const results = {
      assessmentId,
      title: assessment?.title || "Assessment",
      score: application.score || 0,
      maxScore: assessment?.totalPoints || 100,
      percentage: application.score || 0,
      passingScore: 70,
      passed: (application.score || 0) >= 70,
      completedAt: application.completedAt,
      duration: application.timeSpent || 0,
      totalQuestions,
      correctAnswers,
      proctoringScore: application.proctoringData?.score ?? 100,
      proctoringReport: application.proctoringData?.report || null,
      questionResults: (application.answers || []).map((a: any) => {
        const meta = questionMeta[a.questionId] || {}
        return {
          questionId: a.questionId,
          questionText: meta.questionText || "",
          type: meta.type || "",
          userAnswer: a.answer,
          correctAnswer: meta.correctAnswer || "",
          isCorrect: !!a.isCorrect,
          points: a.points || 0,
          maxPoints: meta.points || 0,
          difficulty: meta.difficulty || "Medium",
        }
      }),
      candidateReview: application.candidateReview || null,
      // Simple placeholder benchmark until we compute real aggregates
      benchmarkData: {
        averageScore: 70,
        percentile: Math.min(99, Math.max(1, Math.round((application.score || 0) / 1.2))),
        topPercentile: 95,
        industryAverage: 68,
      },
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error("[v0] Error fetching assessment results:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch results" }, { status: 500 })
  }
}
