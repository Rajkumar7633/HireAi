import Application from "@/models/Application"
import VideoInterview from "@/models/VideoInterview"
import Notification from "@/models/Notification"
import type { NextStep } from "@/models/InterviewFeedback"
import { sendStatusChangeEmail } from "@/lib/status-change-email"

export type RecruiterFeedbackPayload = {
  rating?: number
  strengths?: string
  concerns?: string
  technicalScore?: number
  communicationScore?: number
  codingScore?: number
  cultureFitScore?: number
  overallScore?: number
  privateNotes?: string
  summaryForPipeline?: string
  tags?: string[]
}

export type CandidateFeedbackPayload = {
  rating?: number
  experience?: string
  issues?: string
  wouldRecommend?: boolean
}

function buildPipelineSummary(payload: RecruiterFeedbackPayload, nextStep?: NextStep): string {
  const parts: string[] = []
  if (payload.rating) parts.push(`Overall: ${payload.rating}/5`)
  if (payload.overallScore) parts.push(`Score: ${payload.overallScore}/10`)
  if (payload.technicalScore) parts.push(`Technical: ${payload.technicalScore}/10`)
  if (payload.communicationScore) parts.push(`Communication: ${payload.communicationScore}/10`)
  if (payload.codingScore) parts.push(`Coding: ${payload.codingScore}/10`)
  if (payload.strengths?.trim()) parts.push(`Strengths: ${payload.strengths.trim()}`)
  if (payload.concerns?.trim()) parts.push(`Concerns: ${payload.concerns.trim()}`)
  if (payload.summaryForPipeline?.trim()) parts.push(payload.summaryForPipeline.trim())
  if (nextStep) parts.push(`Next: ${nextStep.replace("_", " ")}`)
  return parts.join(" · ")
}

function mapNextStepToApplication(nextStep?: NextStep): {
  status?: string
  currentStage?: string
  roundStatus?: "passed" | "failed" | "completed" | "pending"
} {
  switch (nextStep) {
    case "advance":
      return { status: "Shortlisted", currentStage: "tech_round_1", roundStatus: "passed" }
    case "reject":
      return { status: "Rejected", currentStage: "application", roundStatus: "failed" }
    case "follow_up":
      return { status: "Under Review", currentStage: "interview", roundStatus: "completed" }
    default:
      return { status: "Under Review", currentStage: "interview", roundStatus: "completed" }
  }
}

export async function syncInterviewFeedbackToPipeline({
  interviewId,
  recruiterPayload,
  candidatePayload,
  nextStep,
}: {
  interviewId: string
  recruiterPayload?: RecruiterFeedbackPayload
  candidatePayload?: CandidateFeedbackPayload
  nextStep?: NextStep
}) {
  const interview = await VideoInterview.findById(interviewId).lean() as {
    applicationId?: unknown
    candidateId?: unknown
    jobId?: unknown
    recruiterId?: unknown
    endedAt?: Date
  } | null
  if (!interview) return { ok: false, reason: "interview_not_found" }

  const applicationId = interview.applicationId
  if (!applicationId) return { ok: true, skipped: "no_application" }

  const app = await Application.findById(applicationId)
  if (!app) return { ok: false, reason: "application_not_found" }

  const previousStatus = app.status
  const summary = recruiterPayload ? buildPipelineSummary(recruiterPayload, nextStep) : ""
  const completedAt = interview.endedAt || new Date()

  if (recruiterPayload) {
    const rating = recruiterPayload.rating ?? recruiterPayload.overallScore
    const feedbackText = summary || recruiterPayload.summaryForPipeline || ""

    await VideoInterview.findByIdAndUpdate(interviewId, {
      $set: {
        rating: rating ?? undefined,
        feedback: feedbackText,
        updatedAt: new Date(),
      },
    })

    const pipelineUpdate = mapNextStepToApplication(nextStep)
    const roundEntry = {
      roundName: "Video Interview",
      stageKey: "video_interview",
      status: pipelineUpdate.roundStatus || "completed",
      latestScore:
        recruiterPayload.overallScore ??
        (recruiterPayload.rating ? recruiterPayload.rating * 20 : undefined),
      notes: feedbackText,
    }

    const rounds = [...(app.rounds || [])]
    const idx = rounds.findIndex((r) => r.stageKey === "video_interview")
    if (idx >= 0) {
      rounds[idx] = { ...rounds[idx], ...roundEntry }
    } else {
      rounds.push(roundEntry)
    }

    const appUpdate: Record<string, unknown> = {
      interviewFeedback: feedbackText,
      interviewRating: rating ?? undefined,
      interviewDate: completedAt,
      rounds,
      notes: app.notes
        ? `${app.notes}\n\n[Video interview ${new Date(completedAt).toLocaleDateString()}] ${feedbackText}`
        : `[Video interview] ${feedbackText}`,
    }

    if (pipelineUpdate.status) appUpdate.status = pipelineUpdate.status
    if (pipelineUpdate.currentStage) appUpdate.currentStage = pipelineUpdate.currentStage

  const summaryDoc = {
    interviewId,
    completedAt,
    rating: recruiterPayload.rating,
    overallScore: recruiterPayload.overallScore,
    technicalScore: recruiterPayload.technicalScore,
    communicationScore: recruiterPayload.communicationScore,
    codingScore: recruiterPayload.codingScore,
    nextStep: nextStep || "undecided",
    summary: feedbackText,
    strengths: recruiterPayload.strengths,
    concerns: recruiterPayload.concerns,
    candidateRating: candidatePayload?.rating,
  }

    await Application.findByIdAndUpdate(applicationId, {
      $set: appUpdate,
      $push: { videoInterviewSummaries: summaryDoc },
    })

    const candidateId = String(interview.candidateId)
    const newStatus = pipelineUpdate.status
    if (newStatus && newStatus !== previousStatus) {
      await Notification.create({
        userId: candidateId,
        type: "application_status_update",
        message: `Your application was updated after the video interview: ${newStatus}.`,
        relatedEntity: { id: applicationId, type: "application" },
      }).catch(() => {})

      await sendStatusChangeEmail({
        applicationId: String(applicationId),
        jobSeekerId: candidateId,
        jobDescriptionId: String(interview.jobId),
        recruiterId: String(interview.recruiterId),
        newStatus,
        previousStatus,
      }).catch((e) => console.error("interview feedback email failed", e))
    }
  }

  if (candidatePayload && !recruiterPayload) {
    const candidateNote = [
      candidatePayload.experience?.trim(),
      candidatePayload.issues?.trim(),
      candidatePayload.rating ? `Rating: ${candidatePayload.rating}/5` : "",
    ]
      .filter(Boolean)
      .join(" · ")

    if (candidateNote) {
      await Application.findByIdAndUpdate(applicationId, {
        $push: {
          videoInterviewSummaries: {
            interviewId,
            completedAt,
            candidateRating: candidatePayload.rating,
            summary: `Candidate feedback: ${candidateNote}`,
          },
        },
      })
    }
  }

  return { ok: true, applicationId: String(applicationId) }
}
