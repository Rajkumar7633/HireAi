import mongoose from "mongoose"
import Application from "@/models/Application"
import JobDescription from "@/models/JobDescription"
import User from "@/models/User"
import BackgroundVerification, {
  VERIFICATION_COMPONENTS,
  type ComponentStatus,
  type OverallResult,
  type RiskLevel,
  type VerificationComponentKey,
  type VerificationProvider,
  type VerificationStatus,
} from "@/models/BackgroundVerification"
import { PROVIDER_INFO as _PROVIDER_INFO } from "@/lib/background-verification-constants"

export const PROVIDER_INFO = _PROVIDER_INFO

const ELIGIBLE_STATUSES = new Set([
  "Shortlisted",
  "Test Passed",
  "Interview Scheduled",
  "Under Review",
  "Reviewed",
  "Hired",
  "Offer",
  "Test Assigned",
  "Offer",
  "Assessment Completed",
])

function getFlexJobApplicationModel() {
  return (
    mongoose.models.FlexJobApplication ||
    mongoose.model("FlexJobApplication", new mongoose.Schema({}, { strict: false }), "jobapplications")
  )
}

export function buildComponentsFromSelection(
  selected: Partial<Record<VerificationComponentKey, boolean>> = {},
): Record<VerificationComponentKey, { status: ComponentStatus }> {
  const out = {} as Record<VerificationComponentKey, { status: ComponentStatus }>
  for (const key of VERIFICATION_COMPONENTS) {
    const enabled = selected[key] ?? true
    out[key] = { status: enabled ? "Pending" : "Not Required" }
  }
  return out
}

export function componentProgress(components: Record<string, { status?: string }>) {
  const entries = VERIFICATION_COMPONENTS.map(k => components[k]).filter(Boolean)
  const active = entries.filter(c => c.status !== "Not Required")
  const done = active.filter(c => c.status !== "Pending").length
  const total = active.length || 1
  return { done, total, percent: Math.round((done / total) * 100) }
}

export function computeOverallFromComponents(
  components: Record<string, { status?: string }>,
): { overallResult: OverallResult; riskLevel: RiskLevel } {
  const active = VERIFICATION_COMPONENTS
    .map(k => components[k]?.status)
    .filter(s => s && s !== "Not Required")
  const hasFailed = active.some(s => s === "Failed")
  const allDone = active.every(s => s === "Verified" || s === "Failed")
  if (!allDone) return { overallResult: "Pending", riskLevel: "Low" }
  if (hasFailed) return { overallResult: "Consider", riskLevel: "Medium" }
  return { overallResult: "Clear", riskLevel: "Low" }
}

export async function resolveApplication(applicationId: string) {
  if (!mongoose.Types.ObjectId.isValid(applicationId)) return null

  const nextApp = await Application.findById(applicationId)
    .populate("jobSeekerId", "name email")
    .populate("jobDescriptionId", "title recruiterId")
    .lean()

  if (nextApp) {
    const seeker = nextApp.jobSeekerId as { _id?: unknown; name?: string; email?: string } | null
    const job = nextApp.jobDescriptionId as { title?: string; recruiterId?: unknown } | null
    const candidateId =
      seeker?._id?.toString?.() ||
      (nextApp as { jobSeekerId?: unknown }).jobSeekerId?.toString?.() ||
      (nextApp as { applicantId?: unknown }).applicantId?.toString?.()
    if (!candidateId) return null
    return {
      source: "application" as const,
      application: nextApp,
      candidateId,
      candidateName: seeker?.name || "Candidate",
      candidateEmail: seeker?.email || "",
      jobTitle: job?.title || (nextApp as { jobTitle?: string }).jobTitle || "",
      recruiterId: job?.recruiterId?.toString?.() || "",
    }
  }

  const FlexApp = getFlexJobApplicationModel()
  const backendApp = (await FlexApp.findById(applicationId).lean()) as Record<string, unknown> | null
  if (!backendApp) return null

  const candidateId =
    backendApp.userId?.toString?.() ||
    backendApp.jobSeekerId?.toString?.() ||
    backendApp.applicantId?.toString?.()
  if (!candidateId) return null

  let candidateName = (backendApp.candidateName as string) || "Candidate"
  let candidateEmail = (backendApp.candidateEmail as string) || ""
  const user = await User.findById(candidateId).select("name email").lean()
  if (user) {
    candidateName = user.name || candidateName
    candidateEmail = user.email || candidateEmail
  }

  let jobTitle = (backendApp.jobTitle as string) || ""
  let recruiterId = ""
  const jobId = backendApp.jobDescriptionId?.toString?.() || backendApp.jobId?.toString?.()
  if (jobId) {
    const job = await JobDescription.findById(jobId).select("title recruiterId").lean()
    if (job) {
      jobTitle = job.title || jobTitle
      recruiterId = job.recruiterId?.toString?.() || ""
    }
  }

  return {
    source: "jobapplication" as const,
    application: backendApp,
    candidateId,
    candidateName,
    candidateEmail,
    jobTitle,
    recruiterId,
  }
}

export function formatVerificationRow(
  v: Record<string, unknown>,
  candidate?: { name?: string; email?: string },
  jobTitle?: string,
) {
  const app = v.applicationId as Record<string, unknown> | string | undefined
  const populatedJobTitle =
    jobTitle ||
    (typeof app === "object" && app ? (app.jobTitle as string) : undefined) ||
    ""
  const cand = v.candidateId as { name?: string; email?: string } | string | undefined
  const candidateName =
    candidate?.name ||
    (typeof cand === "object" && cand ? cand.name : undefined) ||
    "Candidate"
  const candidateEmail =
    candidate?.email ||
    (typeof cand === "object" && cand ? cand.email : undefined) ||
    ""

  return {
    _id: String(v._id),
    applicationId:
      typeof app === "object" && app?._id
        ? String(app._id)
        : String(v.applicationId || ""),
    candidateId: String(
      typeof cand === "object" && cand?._id ? cand._id : v.candidateId || "",
    ),
    candidateName,
    candidateEmail,
    jobTitle: populatedJobTitle,
    provider: v.provider as VerificationProvider,
    status: v.status as VerificationStatus,
    overallResult: v.overallResult as OverallResult | undefined,
    riskLevel: v.riskLevel as RiskLevel | undefined,
    components: v.components as Record<VerificationComponentKey, { status: ComponentStatus; notes?: string }>,
    initiatedAt: v.initiatedAt,
    estimatedCompletion: v.estimatedCompletion,
    completedAt: v.completedAt,
    reportUrl: v.reportUrl as string | undefined,
    cost: v.cost as { amount?: number; currency?: string } | undefined,
    history: v.history as Array<{ action: string; timestamp: Date; details?: unknown }> | undefined,
    providerReferenceId: v.providerReferenceId as string | undefined,
  }
}

export async function listVerificationsForRecruiter(recruiterId: string) {
  const rows = await BackgroundVerification.find({ recruiterId })
    .populate("candidateId", "name email")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean()

  return rows.map(v => formatVerificationRow(v))
}

export async function getEligibleCandidates(recruiterId: string) {
  const jobs = await JobDescription.find({ recruiterId }).select("_id title").lean()
  const jobIds = jobs.map(j => j._id)
  if (jobIds.length === 0) return []

  const existing = await BackgroundVerification.find({ recruiterId }).select("applicationId").lean()
  const assignedAppIds = new Set(existing.map(e => String(e.applicationId)))

  const applications = await Application.find({
    jobDescriptionId: { $in: jobIds },
    status: { $nin: ["Rejected", "rejected"] },
  })
    .populate("jobSeekerId", "name email")
    .populate("jobDescriptionId", "title")
    .sort({ updatedAt: -1 })
    .limit(300)
    .lean()

  const eligible = applications
    .filter(a => {
      const id = String(a._id)
      if (assignedAppIds.has(id)) return false
      const status = String(a.status || "")
      return ELIGIBLE_STATUSES.has(status) || a.shortlisted
    })
    .map(a => {
      const seeker = a.jobSeekerId as { name?: string; email?: string } | null
      const job = a.jobDescriptionId as { title?: string } | null
      return {
        _id: String(a._id),
        candidateName: seeker?.name || "Candidate",
        candidateEmail: seeker?.email || "",
        jobTitle: job?.title || "",
        status: String(a.status || ""),
        aiMatchScore: a.aiMatchScore ?? null,
      }
    })

  return eligible
}

export async function computeStats(recruiterId: string) {
  const all = await BackgroundVerification.find({ recruiterId }).lean()
  const total = all.length
  const completed = all.filter(v => v.status === "Completed").length
  const inProgress = all.filter(v => v.status === "In Progress" || v.status === "Pending").length
  const failed = all.filter(v => v.status === "Failed").length
  const clear = all.filter(v => v.overallResult === "Clear").length
  const consider = all.filter(v => v.overallResult === "Consider").length
  const adverse = all.filter(v => v.overallResult === "Adverse").length

  const now = Date.now()
  const overdue = all.filter(
    v =>
      v.status !== "Completed" &&
      v.estimatedCompletion &&
      new Date(v.estimatedCompletion).getTime() < now,
  ).length

  const turnaroundDays: number[] = []
  for (const v of all) {
    if (v.completedAt && v.initiatedAt) {
      const days = (new Date(v.completedAt).getTime() - new Date(v.initiatedAt).getTime()) / 86400000
      turnaroundDays.push(days)
    }
  }
  const avgTurnaround =
    turnaroundDays.length > 0
      ? Math.round((turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length) * 10) / 10
      : 0

  const byProvider: Record<string, number> = {}
  for (const v of all) {
    byProvider[v.provider] = (byProvider[v.provider] || 0) + 1
  }

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    total,
    completed,
    inProgress,
    failed,
    clear,
    consider,
    adverse,
    overdue,
    avgTurnaround,
    completionRate,
    byProvider,
  }
}

export function buildCsv(rows: Awaited<ReturnType<typeof formatVerificationRow>>[]) {
  const headers = [
    "Candidate",
    "Email",
    "Job",
    "Provider",
    "Status",
    "Overall Result",
    "Risk",
    "Progress %",
    "Initiated",
    "Completed",
    "Est. Completion",
  ]
  const lines = [headers.join(",")]
  for (const r of rows) {
    const prog = componentProgress(r.components)
    lines.push(
      [
        csvCell(r.candidateName),
        csvCell(r.candidateEmail),
        csvCell(r.jobTitle),
        r.provider,
        r.status,
        r.overallResult || "",
        r.riskLevel || "",
        prog.percent,
        r.initiatedAt ? new Date(r.initiatedAt).toISOString() : "",
        r.completedAt ? new Date(r.completedAt).toISOString() : "",
        r.estimatedCompletion ? new Date(r.estimatedCompletion).toISOString() : "",
      ].join(","),
    )
  }
  return lines.join("\n")
}

function csvCell(value: string) {
  const s = String(value || "").replace(/"/g, '""')
  return `"${s}"`
}

export async function initiateVerification(params: {
  recruiterId: string
  applicationId: string
  provider: string
  components?: Partial<Record<VerificationComponentKey, boolean>>
  notes?: string
}) {
  const resolved = await resolveApplication(params.applicationId)
  if (!resolved) {
    return { error: "Application not found", status: 404 as const }
  }

  const existing = await BackgroundVerification.findOne({
    applicationId: params.applicationId,
    status: { $nin: ["Cancelled"] },
  })
  if (existing) {
    return { error: "Background verification already exists for this application", status: 400 as const }
  }

  const provider = params.provider || "Manual"
  const avgDays = PROVIDER_INFO[provider]?.avgDays ?? 7
  const costUsd = PROVIDER_INFO[provider]?.costUsd ?? 0
  const components = buildComponentsFromSelection(params.components)
  const enabledCount = Object.values(components).filter(c => c.status === "Pending").length

  const verification = await BackgroundVerification.create({
    candidateId: resolved.candidateId,
    applicationId: params.applicationId,
    recruiterId: params.recruiterId,
    provider,
    status: "In Progress",
    components,
    overallResult: "Pending",
    estimatedCompletion: new Date(Date.now() + avgDays * 86400000),
    providerReferenceId:
      provider !== "Manual"
        ? `${provider.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
        : undefined,
    cost: {
      amount: costUsd * enabledCount,
      currency: "USD",
      paid: provider === "Manual",
    },
    history: [
      {
        action: "Initiated",
        performedBy: params.recruiterId,
        timestamp: new Date(),
        details: { provider, components: params.components, notes: params.notes },
      },
    ],
  })

  return { verification, resolved }
}

/** Auto-start background check when an offer is extended (skips if one already exists). */
export async function autoInitiateBackgroundForOffer(params: {
  recruiterId: string
  applicationId: string
  notes?: string
}) {
  const existing = await BackgroundVerification.findOne({
    applicationId: params.applicationId,
    status: { $nin: ["Cancelled"] },
  })
  if (existing) {
    return { skipped: true, verification: existing }
  }

  const result = await initiateVerification({
    recruiterId: params.recruiterId,
    applicationId: params.applicationId,
    provider: "Manual",
    components: {
      identity: true,
      education: true,
      employment: true,
      criminal: true,
      drug: false,
      reference: true,
    },
    notes: params.notes || "Auto-initiated when offer was extended.",
  })

  if ("error" in result) {
    return { skipped: true, error: result.error }
  }

  return { skipped: false, verification: result.verification }
}

