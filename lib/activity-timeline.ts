import mongoose from "mongoose"
import Application from "@/models/Application"
import Notification from "@/models/Notification"
import OfferLetter from "@/models/OfferLetter"
import History from "@/models/History"
import User from "@/models/User"
import JobDescription from "@/models/JobDescription"
import "@/models/JobDescription"
import {
  PIPELINE_STAGES,
  getPipelineProgress,
  normalizeApplicationStatus,
} from "@/lib/application-status"

export type TimelineCategory =
  | "application"
  | "test"
  | "interview"
  | "offer"
  | "profile"
  | "system"
  | "hiring"

export interface TimelineEntry {
  id: string
  source: string
  type: string
  category: TimelineCategory
  title: string
  details: string
  pipelineStage: number
  pipelineLabel: string
  createdAt: string
  applicationId?: string
  jobTitle?: string
  companyName?: string
  link?: string
}

export interface PipelineSummary {
  submitted: number
  reviewed: number
  test: number
  interview: number
  offer: number
  hired: number
  maxProgress: number
  totalCandidates: number
  offersSent: number
  activeInPipeline: number
}

export interface ActivityTimelineResult {
  entries: TimelineEntry[]
  stats: {
    total: number
    thisWeek: number
    thisMonth: number
    byCategory: Record<string, number>
  }
  pipelineSummary: PipelineSummary
}

type RecruiterCompany = { companyName?: string; name?: string }

type PipelineAppFields = {
  status?: string
  currentStage?: string
  rounds?: Array<{ stageKey?: string; status?: string }>
}

function computePipelineSummary(apps: PipelineAppFields[]): PipelineSummary {
  const summary: PipelineSummary = {
    submitted: 0,
    reviewed: 0,
    test: 0,
    interview: 0,
    offer: 0,
    hired: 0,
    maxProgress: 0,
    totalCandidates: apps.length,
    offersSent: 0,
    activeInPipeline: 0,
  }

  for (const app of apps) {
    const p = getPipelineProgress({
      status: app.status,
      currentStage: app.currentStage,
      rounds: app.rounds,
    })
    summary.maxProgress = Math.max(summary.maxProgress, p)
    if (p >= 0) summary.submitted++
    if (p >= 1) summary.reviewed++
    if (p >= 2) summary.test++
    if (p >= 3) summary.interview++
    if (p >= 4) summary.offer++
    if (p >= 5) summary.hired++

    const normalized = normalizeApplicationStatus(app.status)
    if (!["Rejected", "Hired"].includes(normalized)) {
      summary.activeInPipeline++
    }
  }

  return summary
}

function stageMeta(stageIndex: number) {
  const stage = PIPELINE_STAGES.find((s) => s.index === stageIndex) ?? PIPELINE_STAGES[0]
  return { pipelineStage: stage.index, pipelineLabel: stage.label }
}

function pushEntry(
  list: TimelineEntry[],
  entry: Omit<TimelineEntry, "pipelineStage" | "pipelineLabel"> & {
    pipelineStage?: number
    pipelineLabel?: string
  },
) {
  const meta =
    entry.pipelineStage !== undefined
      ? { pipelineStage: entry.pipelineStage, pipelineLabel: entry.pipelineLabel || "" }
      : stageMeta(0)
  list.push({
    ...entry,
    pipelineStage: meta.pipelineStage,
    pipelineLabel: entry.pipelineLabel || PIPELINE_STAGES[meta.pipelineStage]?.label || "Submitted",
  })
}

function notificationCategory(type: string): TimelineCategory {
  if (type.includes("test") || type.includes("assessment")) return "test"
  if (type.includes("interview")) return "interview"
  if (type === "application_status_update") return "application"
  if (type.includes("campus")) return "application"
  return "system"
}

function pipelineFromNotification(type: string, message: string): number {
  const lower = message.toLowerCase()
  if (lower.includes("hired") || lower.includes("selected")) return 5
  if (lower.includes("offer")) return 4
  if (lower.includes("interview")) return 3
  if (lower.includes("test") || lower.includes("assessment")) return 2
  if (lower.includes("reviewed") || lower.includes("shortlist")) return 1
  if (type.includes("test_assigned") || type.includes("assessment_assigned")) return 2
  if (type.includes("interview")) return 3
  return 1
}

function resolveCompanyFromRecruiter(recruiter?: RecruiterCompany | null) {
  return recruiter?.companyName || recruiter?.name || "Company"
}

export async function buildActivityTimeline(
  userId: string,
  role: string,
): Promise<ActivityTimelineResult> {
  const entries: TimelineEntry[] = []
  const uid = new mongoose.Types.ObjectId(userId)

  const stored = await History.find({ userId: uid }).sort({ createdAt: -1 }).limit(200).lean()
  for (const h of stored) {
    const type = h.type || "system"
    let stage = 0
    if (type.includes("test")) stage = 2
    else if (type.includes("interview")) stage = 3
    else if (type.includes("offer")) stage = 4
    else if (type === "job_application") stage = 0

    pushEntry(entries, {
      id: `history-${h._id}`,
      source: "history",
      type: type,
      category: type.includes("offer")
        ? "offer"
        : type.includes("test")
          ? "test"
          : type.includes("interview")
            ? "interview"
            : type === "job_application"
              ? "application"
              : "profile",
      title: type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      details: h.details,
      pipelineStage: stage,
      createdAt: new Date(h.createdAt).toISOString(),
      link: h.relatedEntity?.id ? `/dashboard/job-seeker/applications` : undefined,
    })
  }

  const notifications = await Notification.find({ userId: uid })
    .sort({ createdAt: -1 })
    .limit(150)
    .lean()

  for (const n of notifications) {
    const stage = pipelineFromNotification(n.type, n.message)
    const relType = n.relatedEntity?.type || ""
    let link: string | undefined
    if (relType === "test") link = "/dashboard/job-seeker/tests"
    else if (relType === "application" || relType === "job_application")
      link = "/dashboard/job-seeker/applications"
    else if (n.message.toLowerCase().includes("offer"))
      link = "/dashboard/job-seeker/offer-letters"

    pushEntry(entries, {
      id: `notif-${n._id}`,
      source: "notification",
      type: n.type,
      category: notificationCategory(n.type),
      title: n.type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      details: n.message,
      pipelineStage: stage,
      createdAt: new Date(n.createdAt).toISOString(),
      link,
    })
  }

  if (role === "job_seeker") {
    const apps = await Application.find({ jobSeekerId: uid })
      .populate("jobDescriptionId", "title recruiterId")
      .sort({ applicationDate: -1 })
      .limit(80)
      .lean()

    const recruiterIds = new Set<string>()
    for (const app of apps) {
      const job = app.jobDescriptionId as { title?: string; recruiterId?: string } | null
      if (job?.recruiterId) recruiterIds.add(String(job.recruiterId))
    }
    const recruiters = await User.find({ _id: { $in: Array.from(recruiterIds) } })
      .select("name companyName")
      .lean()
    const recruiterMap = new Map<string, RecruiterCompany>(
      recruiters.map((r) => [String(r._id), r as RecruiterCompany]),
    )

    for (const app of apps) {
      const job = app.jobDescriptionId as { title?: string; recruiterId?: string } | null
      const jobTitle = job?.title || "Job application"
      const recruiter = job?.recruiterId
        ? (recruiterMap.get(String(job.recruiterId)) ?? null)
        : null
      const company = resolveCompanyFromRecruiter(recruiter)
      const appId = String(app._id)
      const progress = getPipelineProgress({
        status: app.status,
        currentStage: app.currentStage,
        rounds: app.rounds,
      })
      const normalized = normalizeApplicationStatus(app.status)

      pushEntry(entries, {
        id: `app-submit-${appId}`,
        source: "application",
        type: "application_submitted",
        category: "application",
        title: "Application submitted",
        details: `Applied for ${jobTitle} at ${company}`,
        pipelineStage: 0,
        createdAt: new Date(app.applicationDate || app.appliedAt || app.createdAt).toISOString(),
        applicationId: appId,
        jobTitle,
        companyName: company,
        link: "/dashboard/job-seeker/applications",
      })

      if (app.testAssignedAt) {
        pushEntry(entries, {
          id: `app-test-assigned-${appId}`,
          source: "application",
          type: "test_assigned",
          category: "test",
          title: "Coding test assigned",
          details: `Test assigned for ${jobTitle}`,
          pipelineStage: 2,
          createdAt: new Date(app.testAssignedAt).toISOString(),
          applicationId: appId,
          jobTitle,
          companyName: company,
          link: `/dashboard/job-seeker/tests/${appId}`,
        })
      }

      if (app.testCompletedAt) {
        pushEntry(entries, {
          id: `app-test-done-${appId}`,
          source: "application",
          type: "test_completed",
          category: "test",
          title: "Test completed",
          details: `Score: ${app.testScore ?? app.score ?? "—"}% on ${jobTitle}`,
          pipelineStage: 2,
          createdAt: new Date(app.testCompletedAt).toISOString(),
          applicationId: appId,
          jobTitle,
          companyName: company,
          link: `/dashboard/job-seeker/tests/${appId}`,
        })
      }

      for (const round of app.rounds || []) {
        if (round.status === "passed" || round.status === "completed") {
          const stageKey = round.stageKey || ""
          let stage = 2
          if (stageKey.includes("tech") || stageKey.includes("hr_round")) stage = 3
          if (stageKey === "offer") stage = 4
          pushEntry(entries, {
            id: `round-${appId}-${round.stageKey}`,
            source: "application",
            type: "round_passed",
            category: stage >= 3 ? "interview" : "test",
            title: `${round.roundName || round.stageKey || "Round"} passed`,
            details: `${jobTitle}${round.latestScore ? ` · ${round.latestScore}%` : ""}`,
            pipelineStage: stage,
            createdAt: new Date(app.updatedAt || app.applicationDate).toISOString(),
            applicationId: appId,
            jobTitle,
            companyName: company,
            link: "/dashboard/job-seeker/applications",
          })
        }
      }

      pushEntry(entries, {
        id: `app-status-${appId}`,
        source: "application",
        type: "current_status",
        category: normalized === "Offer" ? "offer" : "application",
        title: `Status: ${normalized}`,
        details: `Current pipeline stage for ${jobTitle}`,
        pipelineStage: progress >= 0 ? progress : 0,
        createdAt: new Date(app.updatedAt || app.applicationDate).toISOString(),
        applicationId: appId,
        jobTitle,
        companyName: company,
        link:
          normalized === "Offer"
            ? "/dashboard/job-seeker/offer-letters"
            : "/dashboard/job-seeker/applications",
      })
    }

    const offers = await OfferLetter.find({
      candidateId: uid,
      status: { $nin: ["Draft", "Pending Approval"] },
    })
      .populate("jobId", "title")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    for (const offer of offers) {
      const job = offer.jobId as { title?: string } | null
      const position = offer.offerDetails?.position || job?.title || "Position"
      for (const h of offer.history || []) {
        pushEntry(entries, {
          id: `offer-${offer._id}-${h.action}-${h.timestamp}`,
          source: "offer",
          type: `offer_${h.action?.toLowerCase().replace(/\s+/g, "_")}`,
          category: "offer",
          title: `Offer: ${h.action}`,
          details:
            (h.details as { message?: string })?.message ||
            `${position} · ${offer.status}`,
          pipelineStage: offer.status === "Accepted" ? 5 : 4,
          createdAt: new Date(h.timestamp).toISOString(),
          jobTitle: position,
          link: "/dashboard/job-seeker/offer-letters",
        })
      }
    }
  }

  if (role === "recruiter" || role === "admin") {
    const apps = await Application.find()
      .populate({
        path: "jobDescriptionId",
        match: { recruiterId: uid },
        select: "title recruiterId",
      })
      .populate("jobSeekerId", "name email")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean()

    for (const app of apps) {
      if (!app.jobDescriptionId) continue
      const job = app.jobDescriptionId as { title?: string }
      const seeker = app.jobSeekerId as { _id?: unknown; name?: string; email?: string } | null
      const jobTitle = job.title || "Role"
      const candidate = seeker?.name || seeker?.email || "Candidate"
      const appId = String(app._id)
      const seekerId = seeker?._id ? String(seeker._id) : String(app.jobSeekerId)
      const progress = getPipelineProgress({
        status: app.status,
        currentStage: app.currentStage,
        rounds: app.rounds,
      })

      pushEntry(entries, {
        id: `rec-app-${appId}-update`,
        source: "application",
        type: "candidate_update",
        category: "hiring",
        title: `${candidate} — ${normalizeApplicationStatus(app.status)}`,
        details: `Application for ${jobTitle}`,
        pipelineStage: progress >= 0 ? progress : 0,
        createdAt: new Date(app.updatedAt || app.applicationDate).toISOString(),
        applicationId: appId,
        jobTitle,
        link: `/dashboard/recruiter/candidates/${seekerId}`,
      })
    }

    const offers = await OfferLetter.find({ recruiterId: uid })
      .populate("candidateId", "name")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean()

    for (const offer of offers) {
      const candidate = offer.candidateId as { name?: string } | null
      for (const h of offer.history || []) {
        pushEntry(entries, {
          id: `rec-offer-${offer._id}-${h.action}`,
          source: "offer",
          type: "offer_action",
          category: "offer",
          title: `Offer ${h.action}`,
          details: `${offer.offerDetails?.position || "Role"} · ${candidate?.name || "Candidate"}`,
          pipelineStage: 4,
          createdAt: new Date(h.timestamp).toISOString(),
          link: "/dashboard/recruiter/offer-letters",
        })
      }
    }
  }

  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000

  const byCategory: Record<string, number> = {}
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1
  }

  const pipelineSummary: PipelineSummary = {
    submitted: 0,
    reviewed: 0,
    test: 0,
    interview: 0,
    offer: 0,
    hired: 0,
    maxProgress: 0,
    totalCandidates: 0,
    offersSent: 0,
    activeInPipeline: 0,
  }

  if (role === "job_seeker") {
    const apps = await Application.find({ jobSeekerId: uid })
      .select("status currentStage rounds")
      .lean()
    Object.assign(pipelineSummary, computePipelineSummary(apps as PipelineAppFields[]))
  } else if (role === "recruiter" || role === "admin") {
    const jobFilter =
      role === "admin" ? {} : { recruiterId: uid }
    const jobIds = await JobDescription.find(jobFilter).select("_id").lean()
    const ids = jobIds.map((j) => j._id)
    const apps =
      ids.length > 0
        ? await Application.find({ jobDescriptionId: { $in: ids } })
            .select("status currentStage rounds")
            .lean()
        : []
    Object.assign(pipelineSummary, computePipelineSummary(apps as PipelineAppFields[]))

    const offerFilter =
      role === "admin" ? {} : { recruiterId: uid }
    pipelineSummary.offersSent = await OfferLetter.countDocuments({
      ...offerFilter,
      status: { $in: ["Sent", "Viewed", "Accepted", "Rejected", "Expired"] },
    })
  }

  return {
    entries: entries.slice(0, 300),
    stats: {
      total: entries.length,
      thisWeek: entries.filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length,
      thisMonth: entries.filter((e) => new Date(e.createdAt).getTime() >= monthAgo).length,
      byCategory,
    },
    pipelineSummary,
  }
}
