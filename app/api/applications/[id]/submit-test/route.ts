import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Notification from "@/models/Notification"
import JobDescription from "@/models/JobDescription"
import mongoose from "mongoose"
import {
  findAnswerForQuestion,
  isCodingQuestionType,
  scoreCodingAnswer,
} from "@/lib/code-runner"
import { getTestSubmissionModel } from "@/lib/test-submission"
import { getTestResultModelForWrite } from "@/lib/enrich-submission"
import { getIO } from "@/lib/socket-server"
import { computeIntegrityScore } from "@/lib/coding-test-security"
export { dynamic } from "@/lib/api-dynamic"


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

function getQuestionId(question: any, index: number): string {
  return question._id?.toString() || question.id?.toString() || String(index)
}

/**
 * POST /api/applications/[id]/submit-test
 * Runs coding test cases and scores answers properly.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
  }

  const { id } = params
  const token = req.cookies.get("auth-token")?.value

  // Optional backend submit — only when explicitly enabled
  if (process.env.USE_BACKEND_SUBMIT === "true" && token) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)
    try {
      const response = await fetch(`${BACKEND_URL}/api/applications/${id}/submit-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          message: data.msg || "Test submitted successfully",
          score: data.score ?? 0,
          submissionId: data.submissionId,
          breakdown: data.breakdown || [],
          application: data.application,
        }, { status: 200 })
      }
    } catch {
      clearTimeout(timeoutId)
    }
  }

  try {
    await connectDB()

    const application = await Application.findById(id)
    if (!application) return NextResponse.json({ message: "Application not found" }, { status: 404 })

    const seekerId = application.jobSeekerId?.toString?.() || String(application.jobSeekerId)
    if (seekerId !== session.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const rawTestId = application.testId
    const testId = typeof rawTestId === "string" ? rawTestId : rawTestId?._id?.toString() ?? null
    if (!testId) return NextResponse.json({ message: "No test assigned" }, { status: 400 })

    // Use flexible schema so nested testCases are not stripped (strict Test model omits them)
    const FlexTest =
      mongoose.models.FlexTest ||
      mongoose.model("FlexTest", new mongoose.Schema({}, { strict: false }), "tests")
    const test: any = await FlexTest.findById(testId).lean()
    if (!test) return NextResponse.json({ message: "Test not found" }, { status: 404 })

    const answers: Array<{ questionId: string; answer: string | string[]; language?: string }> =
      body.answers || []

    let totalEarned = 0
    let totalPossible = 0
    const breakdown: Array<{
      questionId: string
      score: number
      maxScore: number
      passed: boolean
      passedCases?: number
      totalCases?: number
      error?: string | null
    }> = []

    const questions: any[] = test.questions || []

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      const qId = getQuestionId(question, i)
      const ans = findAnswerForQuestion(answers, question, i)
      const maxScore = question.points || 10
      totalPossible += maxScore

      let earned = 0
      let passed = false
      let passedCases = 0
      let totalCases = 0
      let error: string | null = null

      if (!ans) {
        breakdown.push({ questionId: qId, score: 0, maxScore, passed: false, passedCases: 0, totalCases: 0 })
        continue
      }

      const qType = (question.type || "").toLowerCase()

      if (qType === "multiple_choice") {
        const correct = question.correctAnswer
        const given = Array.isArray(ans.answer) ? ans.answer[0] : ans.answer
        if (correct != null && given != null && String(given).trim().toLowerCase() === String(correct).trim().toLowerCase()) {
          earned = maxScore
          passed = true
        }
      } else if (qType === "short_answer") {
        const correct = question.correctAnswer || ""
        const given = String(ans.answer || "")
        if (correct && given.trim().toLowerCase().includes(String(correct).trim().toLowerCase())) {
          earned = maxScore
          passed = true
        }
      } else if (isCodingQuestionType(question.type)) {
        const codingResult = await scoreCodingAnswer(question, ans)
        earned = codingResult.earned
        passed = codingResult.passed
        passedCases = codingResult.passedCases
        totalCases = codingResult.totalCases
        error = codingResult.error
      }

      totalEarned += earned
      breakdown.push({ questionId: qId, score: earned, maxScore, passed, passedCases, totalCases, error })
    }

    const score = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0
    const passingScore = test.passingScore ?? 70
    const passedOverall = score >= passingScore
    const newStatus = passedOverall ? "Test Passed" : "Test Failed"
    const submittedAt = new Date()
    const roundStage = "test_round"

    const detailedAnswers = breakdown.map((b, i) => {
      const question = questions[i]
      const ans = findAnswerForQuestion(answers, question, i)
      const qType = (question?.type || "").toLowerCase()
      let questionType = qType
      if (isCodingQuestionType(question?.type)) questionType = "code_snippet"
      else if (qType === "multiple-choice") questionType = "multiple_choice"

      return {
        questionId: b.questionId,
        questionType,
        answer: ans?.answer ?? "",
        language: ans?.language,
        passedTestCases: b.passedCases ?? 0,
        totalTestCases: b.totalCases ?? 0,
        score: b.score,
        errorOutput: b.error || undefined,
      }
    })

    application.testScore = score
    application.status = newStatus as any
    ;(application as any).testCompletedAt = submittedAt
    ;(application as any).completedAt = submittedAt
    ;(application as any).testAnswers = answers.map(a => ({
      questionId: a.questionId,
      answer: typeof a.answer === "string" ? a.answer : JSON.stringify(a.answer),
      language: a.language,
    }))

    const primaryLanguage =
      answers.find(a => a.language)?.language ||
      detailedAnswers.find(a => a.language)?.language ||
      questions.find(q => isCodingQuestionType(q.type))?.language ||
      null

    if (!Array.isArray((application as any).rounds)) {
      ;(application as any).rounds = []
    }
    let round = (application as any).rounds.find((r: any) => r?.stageKey === roundStage)
    if (!round) {
      round = { roundName: "Coding Test", stageKey: roundStage, testId, submissions: [], status: "pending" }
      ;(application as any).rounds.push(round)
    }
    round.status = passedOverall ? "passed" : "failed"
    round.latestScore = score

    const job: any = await JobDescription.findById(application.jobDescriptionId).select("recruiterId title").lean()
    const recruiterId =
      job?.recruiterId ||
      test.recruiterId ||
      (application as any).assignedBy

    const TestSubmissionModel = getTestSubmissionModel()
    const previousAttempts = await TestSubmissionModel.countDocuments({
      testId: test._id,
      applicationId: id,
      candidateId: session.userId,
      roundStage,
    })

    const tabSwitchCount = body.tabSwitches || 0
    const activityLog = body.activityLog || []
    const integrityScore = body.integrityAudit?.score ??
      computeIntegrityScore(tabSwitchCount, activityLog, test.settings?.maxTabSwitches ?? 2)

    const submissionDoc = await TestSubmissionModel.create({
      testId: test._id,
      applicationId: id,
      candidateId: session.userId,
      recruiterId,
      language: primaryLanguage,
      roundStage,
      attemptNumber: previousAttempts + 1,
      answers: detailedAnswers,
      totalScore: totalEarned,
      percentage: score,
      status: "completed",
      plagiarismScore: 0,
      plagiarismFlags: [],
      submittedAt,
      integrityAudit: {
        score: integrityScore,
        summary: body.integrityAudit?.summary || (activityLog.length ? `${activityLog.length} security events` : "Clean session"),
        flags: body.integrityAudit?.flags || activityLog.map((l: any) => l.type),
        logs: activityLog,
        tabSwitches: tabSwitchCount,
      },
    })

    if (!Array.isArray(round.submissions)) round.submissions = []
    round.submissions.push(submissionDoc._id)

    await application.save()

    const submissionId = submissionDoc._id.toString()

    try {
      const TestResultRecord = getTestResultModelForWrite()
      await TestResultRecord.create({
        testId: test._id,
        applicationId: id,
        candidateId: session.userId,
        recruiterId,
        language: primaryLanguage,
        answers: answers.map(a => ({
          questionId: a.questionId,
          questionType: "code_snippet",
          answer: typeof a.answer === "string" ? a.answer : JSON.stringify(a.answer),
          language: a.language,
        })),
        detailedAnswers,
        breakdown,
        totalScore: totalEarned,
        percentage: score,
        submittedAt,
        tabSwitches: tabSwitchCount,
        integrityScore,
      })
    } catch (err) {
      console.warn("[submit-test] TestResultRecord save failed:", err)
    }

    try {
      const FlexAssessment =
        mongoose.models.FlexAssessmentResult ||
        mongoose.model("FlexAssessmentResult", new mongoose.Schema({}, { strict: false }), "assessmentresults")
      await FlexAssessment.create({
        testId: test._id,
        candidateId: session.userId,
        applicationId: id,
        language: primaryLanguage,
        answers: answers.map(a => ({
          questionId: a.questionId,
          questionType: "code_snippet",
          answer: typeof a.answer === "string" ? a.answer : JSON.stringify(a.answer),
          language: a.language,
        })),
        totalScore: totalEarned,
        percentage: score,
        breakdown,
        submittedAt,
        tabSwitches: tabSwitchCount,
        integrityScore,
      })
    } catch {
      /* non-fatal */
    }

    try {
      const notifyUserId = recruiterId || (application as any).assignedBy
      if (notifyUserId) {
        await Notification.create({
          userId: notifyUserId,
          type: "test_submitted",
          message: `A candidate completed "${test.title}" with a score of ${score}%.`,
          relatedEntity: { id: test._id, type: "test" },
        })
      }
    } catch {
      /* non-fatal */
    }

    try {
      const io = getIO()
      if (io) {
        io.to(`test:${testId}:recruiters`).emit("test:submission", {
          testId,
          applicationId: id,
          candidateId: session.userId,
          score,
          passed: passedOverall,
          breakdown,
          tabSwitches: tabSwitchCount,
          integrityScore,
          submittedAt: submittedAt.toISOString(),
        })
      }
    } catch {
      /* non-fatal */
    }

    return NextResponse.json({
      message: "Test submitted successfully",
      score,
      submissionId,
      breakdown,
      passed: passedOverall,
      status: newStatus,
    }, { status: 200 })
  } catch (error: any) {
    console.error("[submit-test] Error:", error)
    return NextResponse.json({ message: "Failed to submit test", score: 0 }, { status: 500 })
  }
}
