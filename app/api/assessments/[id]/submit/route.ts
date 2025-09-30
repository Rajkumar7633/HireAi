import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Assessment from "@/models/Assessment"
import Notification from "@/models/Notification"
import Application from "@/models/Application"
import User from "@/models/User"
import { computeProfileScore } from "@/lib/scoring"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const assessmentId = params.id
    const body = await request.json().catch(() => ({}))
    const answers = body?.answers || {}
    const proctoringData = body?.proctoringData || {}
    const proctoringSummary = body?.proctoringSummary || {}
    const timedOut = !!body?.timedOut
    const forcedEnd = !!body?.forcedEnd

    console.log("[v0] Submitting assessment:", assessmentId)
    console.log("[v0] Answers provided:", typeof answers === 'object' ? Object.keys(answers).length : 0)
    console.log("[v0] Proctoring alerts:", proctoringData?.alerts?.length || 0)
    console.log("[v0] Tab switches:", proctoringData?.tabSwitchCount || 0)
    console.log("[v0] Timed out:", timedOut)

    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    let application = await Application.findOne({
      jobSeekerId: session.userId,
      assessmentId: assessmentId,
      status: { $in: ["assigned", "in_progress", "Assessment Assigned"] },
    })

    if (!application) {
      // Fallback without status filter in case status naming differs
      application = await Application.findOne({
        jobSeekerId: session.userId,
        assessmentId: assessmentId,
      })
    }

    if (!application) {
      console.warn("[v0] No application found for submission", {
        assessmentId,
        jobSeekerId: session.userId,
      })
      return NextResponse.json({ message: "Assessment not found or already completed" }, { status: 404 })
    }

    // Get the assessment to calculate score properly
    const assessment = await Assessment.findById(assessmentId)
    if (!assessment) {
      return NextResponse.json({ message: "Assessment not found" }, { status: 404 })
    }

    let totalScore = 0
    let maxScore = 0
    const processedAnswers = []

    for (const question of assessment.questions || []) {
      const qid = String((question as any)._id)
      const userAnswer = answers[qid]
      maxScore += question.points || 10

      if (userAnswer) {
        let questionScore = 0

        if (question.type === "multiple_choice") {
          if (userAnswer === question.correctAnswer) {
            questionScore = question.points || 10
          }
        } else if (question.type === "short_answer" || question.type === "code") {
          // Simple text/code matching for demo - in real app would use AI scoring
          const similarity = calculateTextSimilarity(String(userAnswer), String(question.correctAnswer || ""))
          questionScore = Math.round((similarity / 100) * (question.points || 10))
        } else {
          // For unsupported types (e.g., video), keep 0
        }

        totalScore += questionScore
        processedAnswers.push({
          questionId: question._id,
          answer: userAnswer,
          isCorrect: questionScore > 0,
          points: questionScore,
        })
      }
    }

    const proctoringScore = calculateProctoringScore(proctoringData)
    const proctoringReport = generateProctoringReport(proctoringData, proctoringScore)

    // If forced end, override score to 0 and add a violation flag
    const finalScore = forcedEnd ? 0 : Math.round((totalScore / (maxScore || 1)) * 100)

    await Application.findByIdAndUpdate(application._id, {
      $set: {
        status: "Assessment Completed",
        completedAt: new Date(),
        score: finalScore,
        answers: processedAnswers,
        timeSpent: proctoringData?.totalTime ?? 0,
        proctoringData: {
          score: proctoringScore,
          report: proctoringReport,
          alerts: proctoringData?.alerts || [],
          tabSwitchCount: proctoringData?.tabSwitchCount ?? 0,
          screenShareStops: proctoringData?.screenShareStops ?? 0,
          summary: {
            totalFaceMissingSeconds: proctoringSummary?.totalFaceMissingSeconds ?? 0,
            multiFaceEventsCount: proctoringSummary?.multiFaceEventsCount ?? 0,
            screenShareStops: (proctoringSummary?.screenShareStops ?? proctoringData?.screenShareStops) || 0,
            totalAlerts: (proctoringSummary?.totalAlerts ?? (proctoringData?.alerts?.length || 0)),
            endedBy: proctoringSummary?.endedBy || (forcedEnd ? "forced" : timedOut ? "timeout" : "user"),
          },
          securityViolations: [
            ...(proctoringData?.securityViolations || []),
            ...(forcedEnd ? [{ type: "forced_end", message: "Assessment ended due to policy violations" }] : []),
          ],
        },
        proctoringFlags: {
          multiFaceCount: proctoringSummary?.multiFaceEventsCount || 0,
          noFaceLongest: proctoringSummary?.totalFaceMissingSeconds || 0,
          tabSwitchCount: proctoringData?.tabSwitchCount || 0,
        },
      },
    })

    // Notify the recruiter who assigned this assessment (if available)
    if ((application as any).assignedBy) {
      await Notification.create({
        userId: (application as any).assignedBy,
        type: "assessment_assigned", // reuse type; could add a new "assessment_completed"
        message: `Candidate completed assessment ${assessment.title} with score ${finalScore}%`,
        relatedEntity: { id: assessment._id, type: "assessment" },
      })
    }

    console.log("[v0] Assessment scored:", finalScore)
    console.log("[v0] Proctoring score:", proctoringScore)
    console.log("[v0] Application status updated to completed")

    // Recompute candidate Talent Pool score
    try {
      const user = await User.findById(session.userId)
      if (user) {
        const breakdown = await computeProfileScore(user as any)
        user.scores = breakdown as any
        user.profileScore = breakdown.total
          ; (user as any).scoreVersion = 1
          ; (user as any).lastScoreComputedAt = new Date()
        await user.save()
        console.log("[v0] Talent Pool score recomputed:", breakdown.total)
      }
    } catch (e) {
      console.warn("[v0] Failed to recompute candidate score (non-fatal)", e)
    }

    return NextResponse.json({
      success: true,
      score: finalScore,
      proctoringScore,
      proctoringReport,
      message: forcedEnd
        ? "Assessment ended due to violations"
        : timedOut
          ? "Assessment auto-submitted due to time limit"
          : "Assessment submitted successfully",
    })
  } catch (error) {
    console.error("[v0] Error submitting assessment:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit assessment",
        error: error.message,
      },
      { status: 500 },
    )
  }
}

function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0

  const words1 = text1.toLowerCase().split(/\s+/)
  const words2 = text2.toLowerCase().split(/\s+/)

  const commonWords = words1.filter((word) => words2.includes(word))
  const totalWords = Math.max(words1.length, words2.length)

  return totalWords > 0 ? (commonWords.length / totalWords) * 100 : 0
}

function calculateProctoringScore(proctoringData: any): number {
  if (!proctoringData) return 100

  let score = 100
  const alerts = proctoringData.alerts || []
  const tabSwitches = proctoringData.tabSwitchCount || 0

  // Deduct points for violations
  alerts.forEach((alert: any) => {
    switch (alert.severity) {
      case "high":
        score -= 15
        break
      case "medium":
        score -= 8
        break
      case "low":
        score -= 3
        break
    }
  })

  // Deduct for tab switches
  score -= tabSwitches * 5

  return Math.max(0, score)
}

function generateProctoringReport(proctoringData: any, score: number) {
  const alerts = proctoringData?.alerts || []
  const tabSwitches = proctoringData?.tabSwitchCount || 0

  return {
    overallScore: score,
    violations: {
      tabSwitches,
      totalAlerts: alerts.length,
      highSeverityAlerts: alerts.filter((a: any) => a.severity === "high").length,
      mediumSeverityAlerts: alerts.filter((a: any) => a.severity === "medium").length,
      lowSeverityAlerts: alerts.filter((a: any) => a.severity === "low").length,
    },
    timeline: alerts.map((alert: any) => ({
      timestamp: alert.timestamp,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
    })),
    recommendation:
      score > 80
        ? "No concerns detected"
        : score > 60
          ? "Minor violations detected"
          : "Multiple violations detected - review required",
    securityFeatures: {
      faceDetection: true,
      screenRecording: proctoringData?.screenRecording || false,
      audioMonitoring: true,
      tabSwitchDetection: true,
      copyPasteBlocking: true,
      keystrokeAnalysis: true,
      environmentScanning: proctoringData?.environmentScanActive || false,
      multipleFaceDetection: true,
    },
  }
}
