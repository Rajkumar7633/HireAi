import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Assessment from "@/models/Assessment"
import Application from "@/models/Application"
import AssessmentResult from "@/models/AssessmentResult"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const assessmentId = params.id
    await connectDB()

    const assessment = await Assessment.findById(assessmentId)
    if (!assessment) {
      return NextResponse.json({ message: "Assessment not found" }, { status: 404 })
    }

    const applications = await Application.find({ assessmentId })
      .populate("jobSeekerId", "name email")

    const results = await AssessmentResult.find({ assessmentId })
      .populate("applicationId")
      .populate({
        path: "applicationId",
        populate: {
          path: "jobSeekerId",
          select: "name email",
        },
      })

    const totalCandidates = applications.length
    const completedCandidates = results.length

    const scores = results.map((r) => r.score || 0)
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const passedCount = results.filter((r) => (r.score || 0) >= (assessment.passingScore || 70)).length
    const passRate = completedCandidates > 0 ? Math.round((passedCount / completedCandidates) * 100) : 0

    const scoreDistribution = [
      { range: "0-20%", count: 0, percentage: 0 },
      { range: "21-40%", count: 0, percentage: 0 },
      { range: "41-60%", count: 0, percentage: 0 },
      { range: "61-80%", count: 0, percentage: 0 },
      { range: "81-100%", count: 0, percentage: 0 },
    ]

    scores.forEach((score) => {
      if (score <= 20) scoreDistribution[0].count++
      else if (score <= 40) scoreDistribution[1].count++
      else if (score <= 60) scoreDistribution[2].count++
      else if (score <= 80) scoreDistribution[3].count++
      else scoreDistribution[4].count++
    })

    scoreDistribution.forEach((range) => {
      range.percentage = completedCandidates > 0 ? Math.round((range.count / completedCandidates) * 100) : 0
    })

    const questionAnalytics = assessment.questions.map((question, index) => {
      const questionResults = results.map((r) => r.answers?.find((a) => a.questionId === question.questionId))
      const correctAnswers = questionResults.filter((a) => a?.isCorrect).length
      const correctRate = questionResults.length > 0 ? Math.round((correctAnswers / questionResults.length) * 100) : 0

      return {
        questionId: question.questionId,
        questionText: question.questionText,
        difficulty: question.difficulty || "Medium",
        correctRate,
        averageTime: Math.floor(Math.random() * 120) + 60, // Placeholder for now
        commonWrongAnswers: question.options?.slice(1, 3) || ["No data", "Insufficient responses"],
      }
    })

    // Merge applications with results to ensure identity is always present
    const resultsByApp: Record<string, any> = {}
    for (const r of results) {
      const key = String((r as any).applicationId?._id || (r as any).applicationId || r._id)
      resultsByApp[key] = r
    }

    const candidateResults = applications.map((app: any) => {
      const r = resultsByApp[String(app._id)] || {}
      const score = r.score ?? app.score ?? 0
      const completedAt = r.completedAt || app.completedAt || app.updatedAt || app.createdAt
      const duration = r.timeSpent || app.timeSpent || 0
      const proctoringScore = r.proctoringScore || app.proctoringData?.score || 85
      const tabSwitches = app.proctoringData?.tabSwitchCount || 0
      const violations = (app.proctoringData?.securityViolations || []) as Array<{ type: string }>
      const violationsCount = violations.length
      const status = (score || 0) >= (assessment.passingScore || 70) ? "passed" : "failed"
      return {
        candidateId: app._id,
        name: app.jobSeekerId?.name || "Unknown",
        email: app.jobSeekerId?.email || "unknown@email.com",
        score,
        completedAt,
        duration,
        proctoringScore,
        tabSwitches,
        violationsCount,
        status,
      }
    })

    const timeAnalytics = [
      { timeRange: "30-45m", candidateCount: 0, averageScore: 0 },
      { timeRange: "45-60m", candidateCount: 0, averageScore: 0 },
      { timeRange: "60-75m", candidateCount: 0, averageScore: 0 },
      { timeRange: "75-90m", candidateCount: 0, averageScore: 0 },
    ]

    results.forEach((result) => {
      const timeInMinutes = (result.timeSpent || 3600) / 60
      const score = result.score || 0

      if (timeInMinutes <= 45) {
        timeAnalytics[0].candidateCount++
        timeAnalytics[0].averageScore += score
      } else if (timeInMinutes <= 60) {
        timeAnalytics[1].candidateCount++
        timeAnalytics[1].averageScore += score
      } else if (timeInMinutes <= 75) {
        timeAnalytics[2].candidateCount++
        timeAnalytics[2].averageScore += score
      } else {
        timeAnalytics[3].candidateCount++
        timeAnalytics[3].averageScore += score
      }
    })

    timeAnalytics.forEach((range) => {
      if (range.candidateCount > 0) {
        range.averageScore = Math.round(range.averageScore / range.candidateCount)
      }
    })

    // Aggregate common violation types across DISTINCT candidates
    const violationTypeCandidates: Record<string, Set<string>> = {}
    applications.forEach((app: any) => {
      const list = app.proctoringData?.securityViolations || []
      for (const v of list) {
        const t = (v.type || "unknown").toLowerCase()
        if (!violationTypeCandidates[t]) violationTypeCandidates[t] = new Set()
        violationTypeCandidates[t].add(String(app._id))
      }
    })
    const violationTypeCounts: Record<string, number> = {}
    Object.entries(violationTypeCandidates).forEach(([type, set]) => {
      violationTypeCounts[type] = set.size
    })

    const analytics = {
      assessmentId,
      title: assessment.title,
      totalCandidates,
      completedCandidates,
      averageScore,
      passRate,
      averageTime:
        results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + (r.timeSpent || 3600), 0) / results.length)
          : 3600,
      proctoringStats: {
        averageIntegrityScore:
          results.length > 0
            ? Math.round(results.reduce((sum, r) => sum + (r.proctoringScore || 85), 0) / results.length)
            : 85,
        violationsDetected: Object.values(violationTypeCounts).reduce((a: number, b: number) => a + b, 0),
        highRiskCandidates: candidateResults.filter((c) => (c.proctoringScore || 85) < 70).length,
        commonViolations: Object.entries(violationTypeCounts)
          .map(([type, count]) => ({
            type: type.replace(/_/g, " ").toUpperCase(),
            count,
            percentage: totalCandidates > 0 ? Math.min(100, Math.round((count / totalCandidates) * 100)) : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6),
      },
      scoreDistribution,
      questionAnalytics,
      timeAnalytics,
      candidateResults,
    }

    return NextResponse.json({
      success: true,
      analytics,
    })
  } catch (error) {
    console.error("Error fetching assessment analytics:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch analytics" }, { status: 500 })
  }
}
