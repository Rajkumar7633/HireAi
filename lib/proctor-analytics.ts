import { computeIntegrityScore, type SecurityActivityLog } from "@/lib/coding-test-security"

export type ProctorEventRow = {
  _id?: string
  assessmentId: string
  candidateId: string
  type: string
  message: string
  snapshot?: string
  meta?: Record<string, unknown>
  createdAt: string
}

export type CandidateSecurityProfile = {
  candidateId: string
  applicationId: string
  name: string
  email: string
  integrityScore: number
  tabSwitches: number
  riskLevel: "low" | "medium" | "high"
  eventCount: number
  snapshotCount: number
  counts: {
    face: number
    audio: number
    object: number
    tab: number
    clipboard: number
    fullscreen: number
    motion: number
    snapshots: number
    terminated: number
  }
  flags: string[]
  lastEventAt: string | null
  events: ProctorEventRow[]
  snapshots: { at: string; type: string; message: string; snapshot: string }[]
}

const FACE_TYPES = new Set(["no_face", "multi_face", "off_screen", "camera_blocked", "extra_person"])
const AUDIO_TYPES = new Set(["audio_noise"])
const OBJECT_TYPES = new Set(["phone_detected", "book_detected", "suspicious_device", "suspicious_object", "extra_person"])
const TAB_TYPES = new Set(["tab_switch", "window_blur"])
const CLIPBOARD_TYPES = new Set(["copy_paste", "context_menu", "paste", "copy", "cut"])
const FULLSCREEN_TYPES = new Set(["fullscreen_exit"])
const MOTION_TYPES = new Set(["movement"])

export function countEventCategory(type: string): keyof CandidateSecurityProfile["counts"] | null {
  if (type === "periodic_snapshot" || type === "proctor_started") return "snapshots"
  if (type === "test_terminated") return "terminated"
  if (FACE_TYPES.has(type)) return "face"
  if (AUDIO_TYPES.has(type)) return "audio"
  if (OBJECT_TYPES.has(type)) return "object"
  if (TAB_TYPES.has(type)) return "tab"
  if (CLIPBOARD_TYPES.has(type)) return "clipboard"
  if (FULLSCREEN_TYPES.has(type)) return "fullscreen"
  if (MOTION_TYPES.has(type)) return "motion"
  return null
}

export function logsFromSubmission(sub: any): SecurityActivityLog[] {
  const logs = sub?.integrityAudit?.logs || sub?.activityLog || []
  return Array.isArray(logs) ? logs : []
}

export function tabSwitchesFromSubmission(sub: any): number {
  if (typeof sub?.tabSwitches === "number") return sub.tabSwitches
  if (typeof sub?.integrityAudit?.tabSwitches === "number") return sub.integrityAudit.tabSwitches
  return logsFromSubmission(sub).filter(l => l.type === "tab_switch").length
}

export function integrityFromSubmission(sub: any, maxTabSwitches = 2): number {
  if (typeof sub?.integrityAudit?.score === "number") return sub.integrityAudit.score
  const logs = logsFromSubmission(sub)
  return computeIntegrityScore(tabSwitchesFromSubmission(sub), logs, maxTabSwitches)
}

export function computeRiskLevel(input: {
  integrityScore: number
  tabSwitches: number
  counts: CandidateSecurityProfile["counts"]
  flags: string[]
}): "low" | "medium" | "high" {
  const { integrityScore, tabSwitches, counts, flags } = input
  if (counts.terminated > 0 || integrityScore < 45 || tabSwitches > 5) return "high"
  if (
    integrityScore < 70 ||
    tabSwitches > 2 ||
    counts.face > 2 ||
    counts.object > 0 ||
    counts.audio > 2 ||
    counts.fullscreen > 1 ||
    flags.some(f => f.includes("phone") || f.includes("multi_face") || f.includes("terminated"))
  ) return "medium"
  return "low"
}

export function buildCandidateSecurityProfile(
  sub: any,
  events: ProctorEventRow[],
  maxTabSwitches = 2,
): CandidateSecurityProfile {
  const name =
    sub?.name ||
    sub?.candidateId?.name ||
    sub?.candidateName ||
    "Candidate"
  const email =
    sub?.email ||
    sub?.candidateId?.email ||
    sub?.candidateEmail ||
    ""
  const candidateId =
    sub?.candidateId?._id?.toString?.() ||
    sub?.candidateId?.toString?.() ||
    String(sub?.candidateId || "")
  const applicationId =
    sub?.applicationId?.toString?.() ||
    sub?._id?.toString?.() ||
    String(sub?.applicationId || sub?._id || "")

  const submissionLogs = logsFromSubmission(sub)
  const tabSwitches = tabSwitchesFromSubmission(sub)
  const integrityScore = integrityFromSubmission(sub, maxTabSwitches)

  const counts: CandidateSecurityProfile["counts"] = {
    face: 0,
    audio: 0,
    object: 0,
    tab: 0,
    clipboard: 0,
    fullscreen: 0,
    motion: 0,
    snapshots: 0,
    terminated: 0,
  }

  const flags = new Set<string>(sub?.integrityAudit?.flags || [])
  submissionLogs.forEach(l => flags.add(l.type))

  const allEvents: ProctorEventRow[] = [...events]
  for (const log of submissionLogs) {
    allEvents.push({
      assessmentId: applicationId,
      candidateId,
      type: log.type,
      message: log.message,
      createdAt: log.at || new Date().toISOString(),
    })
  }

  allEvents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  for (const ev of allEvents) {
    flags.add(ev.type)
    const cat = countEventCategory(ev.type)
    if (cat) counts[cat] += 1
    if (ev.snapshot) counts.snapshots += 1
  }

  if (tabSwitches > counts.tab) counts.tab = tabSwitches

  const snapshots = allEvents
    .filter(e => e.snapshot && (e.type === "periodic_snapshot" || e.snapshot))
    .map(e => ({
      at: e.createdAt,
      type: e.type,
      message: e.message,
      snapshot: e.snapshot!,
    }))
    .slice(0, 24)

  const riskLevel = computeRiskLevel({
    integrityScore,
    tabSwitches,
    counts,
    flags: Array.from(flags),
  })

  return {
    candidateId,
    applicationId,
    name,
    email,
    integrityScore,
    tabSwitches,
    riskLevel,
    eventCount: allEvents.length,
    snapshotCount: snapshots.length,
    counts,
    flags: Array.from(flags),
    lastEventAt: allEvents[0]?.createdAt || null,
    events: allEvents.slice(0, 40).map(e => ({
      ...e,
      snapshot: undefined,
    })),
    snapshots,
  }
}

export function aggregateSecuritySummary(profiles: CandidateSecurityProfile[]) {
  const eventBreakdown: Record<string, number> = {}
  let totalEvents = 0
  let totalSnapshots = 0

  for (const p of profiles) {
    totalEvents += p.eventCount
    totalSnapshots += p.snapshotCount
    for (const ev of p.events) {
      eventBreakdown[ev.type] = (eventBreakdown[ev.type] || 0) + 1
    }
    for (const flag of p.flags) {
      eventBreakdown[flag] = (eventBreakdown[flag] || 0) + 1
    }
  }

  const breakdown = Object.entries(eventBreakdown)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)

  return {
    totalEvents,
    totalSnapshots,
    candidatesMonitored: profiles.length,
    highRisk: profiles.filter(p => p.riskLevel === "high").length,
    mediumRisk: profiles.filter(p => p.riskLevel === "medium").length,
    lowRisk: profiles.filter(p => p.riskLevel === "low").length,
    avgIntegrity: profiles.length
      ? Math.round(profiles.reduce((s, p) => s + p.integrityScore, 0) / profiles.length)
      : 100,
    eventBreakdown: breakdown,
  }
}
