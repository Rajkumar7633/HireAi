export const DEPARTMENTS = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "MBA", "MCA"]

/** Webinar-style cap — viewers subscribe; host publishes (scales to 500+ on SFU). */
export const COLLEGE_MEETING_MAX_PARTICIPANTS = 500

export function getJitsiDomain() {
  return process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si"
}

export function inferYearFromBatch(batch?: string): number | null {
  if (!batch) return null
  const m = batch.match(/(\d)/)
  return m ? Number(m[1]) : null
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function computeMeetingStatus(
  startTime: Date,
  endTime: Date,
  currentStatus: string,
): "scheduled" | "live" | "completed" | "cancelled" {
  if (currentStatus === "cancelled") return "cancelled"
  const now = Date.now()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()
  if (now < start) return "scheduled"
  if (now >= start && now <= end) return "live"
  return "completed"
}
