export type CanonicalApplicationStatus =
  | "Pending"
  | "Reviewed"
  | "Test Assigned"
  | "Interview Scheduled"
  | "Offer"
  | "Hired"
  | "Rejected"

export interface ApplicationRound {
  roundName?: string
  stageKey?: string
  status?: string
  latestScore?: number
}

export interface ApplicationPipelineInput {
  status?: string
  currentStage?: string
  rounds?: ApplicationRound[]
}

const STATUS_INDEX: Record<CanonicalApplicationStatus, number> = {
  Pending: 0,
  Reviewed: 1,
  "Test Assigned": 2,
  "Interview Scheduled": 3,
  Offer: 4,
  Hired: 5,
  Rejected: -1,
}

const STAGE_KEY_INDEX: Record<string, number> = {
  application: 0,
  hr_shortlist: 1,
  coding_round: 2,
  mcq_round: 2,
  advanced_round: 2,
  test_round: 2,
  tech_round_1: 3,
  tech_round_2: 3,
  tech_round_3: 3,
  hr_round: 3,
  offer: 4,
}

export const PIPELINE_STAGES = [
  { key: "submitted", label: "Submitted", index: 0 },
  { key: "reviewed", label: "Reviewed", index: 1 },
  { key: "test", label: "Test", index: 2 },
  { key: "interview", label: "Interview", index: 3 },
  { key: "offer", label: "Offer", index: 4 },
  { key: "hired", label: "Hired", index: 5 },
] as const

/** Map any stored application status to a single canonical label for the UI. */
export function normalizeApplicationStatus(raw?: string): CanonicalApplicationStatus {
  const s = (raw || "").trim()
  if (!s) return "Pending"

  const lower = s.toLowerCase().replace(/_/g, " ")

  if (lower === "pending" || lower === "assigned") return "Pending"
  if (lower === "under review" || lower === "reviewed" || lower === "shortlisted") return "Reviewed"
  if (
    lower === "test assigned" ||
    lower === "assessment assigned" ||
    lower === "test completed" ||
    lower === "test passed" ||
    lower === "test failed" ||
    lower === "in progress" ||
    lower === "assessment completed"
  ) {
    return "Test Assigned"
  }
  if (lower === "interview scheduled" || lower === "interview") return "Interview Scheduled"
  if (lower === "offer") return "Offer"
  if (lower === "hired") return "Hired"
  if (lower === "rejected") return "Rejected"

  const capitalized = Object.keys(STATUS_INDEX).find((k) => k === s)
  if (capitalized) return capitalized as CanonicalApplicationStatus

  return "Pending"
}

function roundProgressIndex(round: ApplicationRound): number {
  const base = STAGE_KEY_INDEX[round.stageKey || ""] ?? 0
  const st = (round.status || "").toLowerCase()
  if (st === "passed" || st === "completed") return base + 1
  if (st === "in_progress" || st === "pending" || st === "failed") return base
  return base
}

/**
 * 0 = Submitted … 5 = Hired. Uses status, currentStage, and completed rounds (whichever is furthest).
 */
export function getPipelineProgress(app: ApplicationPipelineInput): number {
  const normalized = normalizeApplicationStatus(app.status)
  if (normalized === "Rejected") return -1

  let progress = STATUS_INDEX[normalized] ?? 0

  if (app.currentStage) {
    const stageIdx = STAGE_KEY_INDEX[app.currentStage] ?? 0
    progress = Math.max(progress, stageIdx)
    if (app.currentStage === "offer") progress = Math.max(progress, 4)
  }

  for (const round of app.rounds || []) {
    progress = Math.max(progress, roundProgressIndex(round))
  }

  return Math.min(progress, 5)
}

export function isApplicationActive(status: CanonicalApplicationStatus): boolean {
  return status !== "Hired" && status !== "Rejected"
}

export function isApplicationHired(status: CanonicalApplicationStatus): boolean {
  return status === "Hired"
}

export function isApplicationRejected(status: CanonicalApplicationStatus): boolean {
  return status === "Rejected"
}
