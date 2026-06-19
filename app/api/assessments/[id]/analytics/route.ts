import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Assessment from "@/models/Assessment"
import Application from "@/models/Application"
export { dynamic } from "@/lib/api-dynamic"


function computeMedian(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

function computeStdDev(arr: number[], mean: number): number {
  if (arr.length < 2) return 0
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length
  return Math.round(Math.sqrt(variance))
}

function computePercentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1
  return sortedArr[Math.max(0, idx)]
}

function getPercentileRank(sortedArr: number[], value: number): number {
  if (sortedArr.length === 0) return 0
  const below = sortedArr.filter((s) => s < value).length
  return Math.round((below / sortedArr.length) * 100)
}

function getRiskLevel(score: number): "low" | "medium" | "high" | "critical" {
  if (score >= 90) return "low"
  if (score >= 70) return "medium"
  if (score >= 50) return "high"
  return "critical"
}

function getPerformanceTier(score: number, passingScore: number): string {
  if (score >= 90) return "Elite"
  if (score >= 75) return "Strong"
  if (score >= 60) return "Good"
  if (score >= passingScore) return "Average"
  return "Below Average"
}

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

    if (session.role === "recruiter" && assessment.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const applications = await Application.find({ assessmentId }).populate("jobSeekerId", "name email")

    // Include all statuses that indicate the test was finished.
    // The backend route (test.js) sets "Reviewed" on completion; the frontend
    // Next.js route sets "Assessment Completed". Statuses like interview/hired
    // also come AFTER completion, so those candidates must be visible too.
    const COMPLETED_STATUSES = new Set([
      "Assessment Completed",
      "completed",
      "test_completed",
      "Reviewed",
      "reviewed",
      "Test Passed",
      "Test Failed",
      "Shortlisted",
      "Under Review",
      "interview",
      "Interview Scheduled",
      "hired",
      "Hired",
    ])
    const completedApps = applications.filter((app: any) => COMPLETED_STATUSES.has(app.status))
    const inProgressApps = applications.filter((app: any) =>
      ["Assessment Started", "in_progress", "started"].includes(app.status)
    )

    const totalCandidates = applications.length
    const completedCandidates = completedApps.length
    const inProgressCount = inProgressApps.length
    const notStartedCount = Math.max(0, totalCandidates - completedCandidates - inProgressCount)
    const completionRate = totalCandidates > 0 ? Math.round((completedCandidates / totalCandidates) * 100) : 0
    const dropoffRate = totalCandidates > 0 ? Math.round((inProgressCount / totalCandidates) * 100) : 0

    // score lives in app.score (Next.js submit route) or app.testScore (backend test.js route)
    const getScore = (app: any): number => app.score ?? app.testScore ?? 0

    const scores = completedApps.map((app: any) => getScore(app))
    const sortedScores = [...scores].sort((a, b) => a - b)
    const averageScore =
      scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0
    const medianScore = computeMedian(scores)
    const stdDevScore = computeStdDev(scores, averageScore)
    const p25 = computePercentile(sortedScores, 25)
    const p75 = computePercentile(sortedScores, 75)
    const p90 = computePercentile(sortedScores, 90)

    const passingScore = assessment.passingScore || assessment.settings?.passingScore || 70
    const passedCount = completedApps.filter((app: any) => getScore(app) >= passingScore).length
    const passRate = completedCandidates > 0 ? Math.round((passedCount / completedCandidates) * 100) : 0

    const scoreDistribution = [
      { range: "0-20%", count: 0, percentage: 0 },
      { range: "21-40%", count: 0, percentage: 0 },
      { range: "41-60%", count: 0, percentage: 0 },
      { range: "61-80%", count: 0, percentage: 0 },
      { range: "81-100%", count: 0, percentage: 0 },
    ]
    scores.forEach((score: number) => {
      if (score <= 20) scoreDistribution[0].count++
      else if (score <= 40) scoreDistribution[1].count++
      else if (score <= 60) scoreDistribution[2].count++
      else if (score <= 80) scoreDistribution[3].count++
      else scoreDistribution[4].count++
    })
    scoreDistribution.forEach((range) => {
      range.percentage = completedCandidates > 0 ? Math.round((range.count / completedCandidates) * 100) : 0
    })

    // ── Question analytics ─────────────────────────────────────────────
    const questionAnalytics = assessment.questions.map((question: any) => {
      const qId = String(question.questionId || question._id)
      const answered = completedApps
        .map((app: any) => (app.answers || []).find((a: any) => String(a.questionId) === qId))
        .filter(Boolean)
      const correctAnswers = answered.filter((a: any) => a?.isCorrect).length
      const correctRate = answered.length > 0 ? Math.round((correctAnswers / answered.length) * 100) : 0
      const timesForQuestion = answered
        .map((a: any) => (typeof a?.timeSpent === "number" ? a.timeSpent : null))
        .filter((t: any): t is number => t !== null)
      const averageTime =
        timesForQuestion.length > 0
          ? Math.round(timesForQuestion.reduce((s: number, t: number) => s + t, 0) / timesForQuestion.length)
          : 0
      const wrongAnswers = answered.filter((a: any) => !a?.isCorrect && a?.answer).map((a: any) => a.answer)
      const wrongFreq: Record<string, number> = {}
      wrongAnswers.forEach((w: string) => { wrongFreq[w] = (wrongFreq[w] || 0) + 1 })
      const commonWrongAnswers = Object.entries(wrongFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([opt]) => opt)
      return {
        questionId: qId,
        questionText: question.questionText,
        difficulty: question.difficulty || "Medium",
        correctRate,
        averageTime,
        tags: question.tags || [],
        respondentCount: answered.length,
        commonWrongAnswers,
      }
    })

    // ── Per-candidate per-tag performance ──────────────────────────────
    const candidateTagPerf: Record<string, Record<string, { correct: number; total: number }>> = {}
    completedApps.forEach((app: any) => {
      const appId = String(app._id)
      candidateTagPerf[appId] = {}
      const answers = app.answers || []
      assessment.questions.forEach((question: any) => {
        const qId = String(question.questionId || question._id)
        const ans = answers.find((a: any) => String(a.questionId) === qId)
        ;(question.tags || []).forEach((tag: string) => {
          if (!candidateTagPerf[appId][tag]) candidateTagPerf[appId][tag] = { correct: 0, total: 0 }
          candidateTagPerf[appId][tag].total++
          if (ans?.isCorrect) candidateTagPerf[appId][tag].correct++
        })
      })
    })

    // ── Skill analytics ────────────────────────────────────────────────
    const tagStats: Record<string, { correctRateSum: number; count: number }> = {}
    questionAnalytics.forEach((q: any) => {
      ;(q.tags || []).forEach((tag: string) => {
        if (!tagStats[tag]) tagStats[tag] = { correctRateSum: 0, count: 0 }
        tagStats[tag].correctRateSum += q.correctRate
        tagStats[tag].count++
      })
    })
    const skillAnalytics = Object.entries(tagStats)
      .map(([skill, stats]) => {
        let passingCount = 0
        let attemptedCount = 0
        Object.values(candidateTagPerf).forEach((tagPerf) => {
          if (tagPerf[skill] && tagPerf[skill].total > 0) {
            attemptedCount++
            if ((tagPerf[skill].correct / tagPerf[skill].total) * 100 >= 70) passingCount++
          }
        })
        const skillQuestions = questionAnalytics
          .filter((q: any) => (q.tags || []).includes(skill))
          .map((q: any) => ({
            questionId: q.questionId,
            questionText: q.questionText,
            correctRate: q.correctRate,
            difficulty: q.difficulty,
          }))
        return {
          skill,
          averageCorrectRate: stats.count > 0 ? Math.round(stats.correctRateSum / stats.count) : 0,
          questionCount: stats.count,
          passingCount,
          attemptedCount,
          skillPassRate: attemptedCount > 0 ? Math.round((passingCount / attemptedCount) * 100) : 0,
          questions: skillQuestions,
        }
      })
      .sort((a, b) => b.averageCorrectRate - a.averageCorrectRate)

    // ── Violation aggregation ──────────────────────────────────────────
    const violationTypeCandidates: Record<string, Set<string>> = {}
    completedApps.forEach((app: any) => {
      const list = (app.proctoringData?.securityViolations || []) as Array<{ type: string }>
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

    const avgIntegrityScore =
      completedApps.length > 0
        ? Math.round(
            completedApps.reduce((sum: number, app: any) => sum + (app.proctoringData?.score ?? 100), 0) /
              completedApps.length
          )
        : 100

    // ── Candidate results (enhanced) ───────────────────────────────────
    const candidateResults = completedApps.map((app: any) => {
      const score = getScore(app)
      const proctoringScore = app.proctoringData?.score ?? 100
      const tabSwitches = app.proctoringData?.tabSwitchCount ?? app.proctoringFlags?.tabSwitchCount ?? 0
      const violations = (app.proctoringData?.securityViolations || []) as Array<{ type: string }>
      const duration = app.timeSpent || 0
      const multiFaceCount = app.proctoringData?.multiFaceDetected ?? app.proctoringFlags?.multiFaceCount ?? 0
      const noFaceDuration = app.proctoringData?.noFaceDetected ?? app.proctoringFlags?.noFaceLongest ?? 0
      const riskLevel = getRiskLevel(proctoringScore)
      const status: "passed" | "failed" | "flagged" =
        proctoringScore < 70 ? "flagged" : score >= passingScore ? "passed" : "failed"
      const violationTypeSet = new Set(violations.map((v: any) => v.type || "unknown"))
      const violationTypes = Array.from(violationTypeSet) as string[]
      const timeUsedPct =
        assessment.durationMinutes > 0
          ? Math.min(100, Math.round((duration / 60 / assessment.durationMinutes) * 100))
          : 0

      // Score by difficulty
      const answers = app.answers || []
      const byDiff: Record<string, { correct: number; total: number }> = {
        Easy: { correct: 0, total: 0 },
        Medium: { correct: 0, total: 0 },
        Hard: { correct: 0, total: 0 },
      }
      answers.forEach((ans: any) => {
        const q = assessment.questions.find(
          (q: any) => String(q.questionId || q._id) === String(ans.questionId)
        )
        if (q) {
          const d = (q.difficulty || "Medium") as string
          if (byDiff[d]) {
            byDiff[d].total++
            if (ans.isCorrect) byDiff[d].correct++
          }
        }
      })
      const scoreByDifficulty = {
        easy: byDiff.Easy.total > 0 ? Math.round((byDiff.Easy.correct / byDiff.Easy.total) * 100) : null,
        medium: byDiff.Medium.total > 0 ? Math.round((byDiff.Medium.correct / byDiff.Medium.total) * 100) : null,
        hard: byDiff.Hard.total > 0 ? Math.round((byDiff.Hard.correct / byDiff.Hard.total) * 100) : null,
      }

      const percentileRank = getPercentileRank(sortedScores, score)
      const performanceTier = getPerformanceTier(score, passingScore)

      return {
        candidateId: String(app._id),
        name: (app.jobSeekerId as any)?.name || "Unknown",
        email: (app.jobSeekerId as any)?.email || "unknown@email.com",
        score,
        completedAt: app.completedAt || app.updatedAt || app.createdAt,
        duration,
        timeUsedPct,
        proctoringScore,
        tabSwitches,
        violationsCount: violations.length,
        violationTypes,
        multiFaceCount,
        noFaceDuration,
        riskLevel,
        status,
        scoreByDifficulty,
        percentileRank,
        performanceTier,
      }
    })

    const topPerformers = [...candidateResults]
      .filter((c) => c.status !== "flagged")
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    // ── Time analytics ─────────────────────────────────────────────────
    const durationMinutes = assessment.durationMinutes || 60
    const q = Math.max(10, Math.round(durationMinutes / 4))
    const timeRanges = [
      { min: 0, max: q, label: `0–${q}m` },
      { min: q, max: q * 2, label: `${q}–${q * 2}m` },
      { min: q * 2, max: q * 3, label: `${q * 2}–${q * 3}m` },
      { min: q * 3, max: Infinity, label: `${q * 3}m+` },
    ]
    const timeAnalytics = timeRanges.map(({ label }) => ({ timeRange: label, candidateCount: 0, averageScore: 0 }))
    completedApps.forEach((app: any) => {
      const mins = (app.timeSpent || 0) / 60
      const score = getScore(app)
      const idx = timeRanges.findIndex((r) => mins >= r.min && mins < r.max)
      const rangeIdx = idx >= 0 ? idx : timeRanges.length - 1
      timeAnalytics[rangeIdx].candidateCount++
      timeAnalytics[rangeIdx].averageScore += score
    })
    timeAnalytics.forEach((range) => {
      if (range.candidateCount > 0) range.averageScore = Math.round(range.averageScore / range.candidateCount)
    })

    const highRiskCount = candidateResults.filter((c) => c.proctoringScore < 70).length

    const riskDistribution = {
      low: candidateResults.filter((c) => c.riskLevel === "low").length,
      medium: candidateResults.filter((c) => c.riskLevel === "medium").length,
      high: candidateResults.filter((c) => c.riskLevel === "high").length,
      critical: candidateResults.filter((c) => c.riskLevel === "critical").length,
    }

    // ── Dynamic insights ────────────────────────────────────────────────
    type Severity = "info" | "success" | "warning" | "error"
    const insights: Array<{ type: string; title: string; description: string; severity: Severity }> = []

    if (completionRate < 50 && totalCandidates > 0)
      insights.push({ type: "completion", title: "Low Completion Rate", description: `Only ${completionRate}% of candidates completed the assessment. Consider sending reminder notifications or checking if candidates are facing technical issues.`, severity: "warning" })
    else if (completionRate >= 80)
      insights.push({ type: "completion", title: "Excellent Completion Rate", description: `${completionRate}% of assigned candidates completed the assessment — strong engagement.`, severity: "success" })

    if (passRate < 30 && completedCandidates > 0)
      insights.push({ type: "difficulty", title: "Assessment Too Difficult", description: `Only ${passRate}% of candidates passed (threshold: ${passingScore}%). Consider reviewing question difficulty or adjusting the passing score.`, severity: "warning" })
    else if (passRate > 85 && completedCandidates > 0)
      insights.push({ type: "difficulty", title: "Assessment May Be Too Easy", description: `${passRate}% of candidates passed. Consider adding harder questions to better differentiate top performers.`, severity: "info" })

    if (highRiskCount > 0) {
      const pct = completedCandidates > 0 ? Math.round((highRiskCount / completedCandidates) * 100) : 0
      insights.push({ type: "proctoring", title: "Integrity Concerns Detected", description: `${highRiskCount} candidate${highRiskCount > 1 ? "s" : ""} (${pct}%) flagged with integrity scores below 70. Review their submissions before making hiring decisions.`, severity: "error" })
    }

    if (stdDevScore > 20 && completedCandidates > 0)
      insights.push({ type: "spread", title: "High Score Variance", description: `Standard deviation of ${stdDevScore} points indicates a wide performance spread (${sortedScores[0] ?? 0}%–${sortedScores[sortedScores.length - 1] ?? 0}%). This assessment effectively differentiates skill levels.`, severity: "info" })
    else if (stdDevScore < 8 && completedCandidates >= 5)
      insights.push({ type: "spread", title: "Low Score Variance", description: `Most candidates scored similarly (std dev: ${stdDevScore}). The assessment may not be discriminating enough between skill levels.`, severity: "info" })

    const hardQuestions = questionAnalytics.filter((q: any) => q.correctRate < 40)
    if (hardQuestions.length > 0)
      insights.push({ type: "questions", title: `${hardQuestions.length} Difficult Question${hardQuestions.length > 1 ? "s" : ""} Found`, description: `${hardQuestions.length} question${hardQuestions.length > 1 ? "s" : ""} had a correct rate below 40%. Review them for clarity or recalibrate difficulty expectations.`, severity: "warning" })

    if (skillAnalytics.length > 0) {
      const weakest = skillAnalytics[skillAnalytics.length - 1]
      if (weakest && weakest.averageCorrectRate < 50)
        insights.push({ type: "skills", title: `Skill Gap: ${weakest.skill}`, description: `Candidates averaged only ${weakest.averageCorrectRate}% on "${weakest.skill}" questions. This may indicate a training gap or overly hard questions in this area.`, severity: "warning" })
      const strongest = skillAnalytics[0]
      if (strongest && strongest.averageCorrectRate >= 80)
        insights.push({ type: "skills", title: `Strong Skill: ${strongest.skill}`, description: `Candidates performed best on "${strongest.skill}" questions with a ${strongest.averageCorrectRate}% average correct rate.`, severity: "success" })
    }

    if (medianScore > averageScore + 10)
      insights.push({ type: "distribution", title: "Left-Skewed Score Distribution", description: `Median (${medianScore}%) is significantly higher than average (${averageScore}%). A few low-scoring candidates are pulling the average down — review outliers.`, severity: "info" })
    else if (averageScore > medianScore + 10)
      insights.push({ type: "distribution", title: "Right-Skewed Score Distribution", description: `Average (${averageScore}%) is higher than median (${medianScore}%). A few top performers are raising the average — the typical candidate scored lower.`, severity: "info" })

    const analytics = {
      assessmentId,
      title: assessment.title,
      description: assessment.description,
      durationMinutes: assessment.durationMinutes,
      passingScore,
      difficulty: assessment.difficulty,
      status: assessment.status,
      totalCandidates,
      completedCandidates,
      inProgressCount,
      notStartedCount,
      completionRate,
      dropoffRate,
      averageScore,
      medianScore,
      stdDevScore,
      p25,
      p75,
      p90,
      passRate,
      averageTime:
        completedApps.length > 0
          ? Math.round(
              completedApps.reduce((sum: number, app: any) => sum + (app.timeSpent || 0), 0) / completedApps.length
            )
          : 0,
      proctoringStats: {
        averageIntegrityScore: avgIntegrityScore,
        violationsDetected: Object.values(violationTypeCounts).reduce((a: number, b: number) => a + b, 0),
        highRiskCandidates: highRiskCount,
        flaggedCandidates: candidateResults.filter((c) => c.status === "flagged").length,
        riskDistribution,
        commonViolations: Object.entries(violationTypeCounts)
          .map(([type, count]) => ({
            type: type.replace(/_/g, " ").toUpperCase(),
            count,
            percentage:
              completedCandidates > 0 ? Math.min(100, Math.round((count / completedCandidates) * 100)) : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6),
      },
      scoreDistribution,
      questionAnalytics,
      skillAnalytics,
      timeAnalytics,
      candidateResults,
      topPerformers,
      insights,
    }

    return NextResponse.json({ success: true, analytics })
  } catch (error) {
    console.error("Error fetching assessment analytics:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch analytics" }, { status: 500 })
  }
}
