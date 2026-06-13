import mongoose from "mongoose"
import type { CampusInviteInitiator, ICampusDriveInvite } from "@/models/CampusDriveInvite"

export interface CampusInviteStats {
  receivedPending: number
  sentPending: number
  accepted: number
  declined: number
  cancelled: number
  upcoming: number
}

export function computeInviteStats(
  received: Pick<ICampusDriveInvite, "status" | "driveDate">[],
  sent: Pick<ICampusDriveInvite, "status" | "driveDate">[],
): CampusInviteStats {
  const all = [...received, ...sent]
  const now = Date.now()

  return {
    receivedPending: received.filter((i) => i.status === "pending").length,
    sentPending: sent.filter((i) => i.status === "pending").length,
    accepted: all.filter((i) => i.status === "accepted").length,
    declined: all.filter((i) => i.status === "declined").length,
    cancelled: all.filter((i) => i.status === "cancelled").length,
    upcoming: all.filter(
      (i) =>
        i.status === "accepted" &&
        new Date(i.driveDate).getTime() >= now,
    ).length,
  }
}

export function shapeInvite(invite: any) {
  const college = invite.collegeId
  const recruiter = invite.recruiterId

  return {
    ...invite,
    _id: invite._id?.toString?.() ?? invite._id,
    linkedDriveId: invite.linkedDriveId?.toString?.() ?? invite.linkedDriveId,
    collegeId:
      college && typeof college === "object"
        ? {
            _id: college._id?.toString?.() ?? college._id,
            name: college.name,
            collegeName: college.collegeName,
            collegeLocation: college.collegeLocation,
            email: college.email,
          }
        : invite.collegeId,
    recruiterId:
      recruiter && typeof recruiter === "object"
        ? {
            _id: recruiter._id?.toString?.() ?? recruiter._id,
            name: recruiter.name,
            email: recruiter.email,
            companyName: recruiter.companyName,
          }
        : invite.recruiterId,
  }
}

export function parseRolesInput(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String).map((r) => r.trim()).filter(Boolean)
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,;\n]/)
      .map((r) => r.trim())
      .filter(Boolean)
  }
  return []
}

export function recruiterLabel(user: { companyName?: string; name?: string } | null | undefined) {
  return user?.companyName || user?.name || "Recruiter"
}

export function collegeLabel(user: { collegeName?: string; name?: string } | null | undefined) {
  return user?.collegeName || user?.name || "College"
}

/** Normalize JWT/session ids to a consistent 24-char hex string. */
export function normalizeUserId(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === "object" && raw !== null && "toString" in raw) {
    const s = String((raw as { toString(): string }).toString())
    return s || null
  }
  const s = String(raw).trim()
  return s || null
}

/** Build a Mongo ObjectId for queries — falls back to raw string if invalid. */
export function toMongoId(raw: unknown): string | mongoose.Types.ObjectId {
  const id = normalizeUserId(raw)
  if (!id) return ""
  return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id
}

/** Determine who sent the proposal (reliable even on legacy rows). */
export function getInviteSenderRole(
  invite: { createdByRole?: string; initiatedBy?: string; createdByUserId?: unknown },
  sessionUserId?: string,
): CampusInviteInitiator {
  if (invite.createdByRole === "college" || invite.createdByRole === "recruiter") {
    return invite.createdByRole
  }
  const createdBy = normalizeUserId(invite.createdByUserId)
  const sessionId = normalizeUserId(sessionUserId)
  if (createdBy && sessionId && createdBy === sessionId) {
    return "recruiter"
  }
  if (invite.initiatedBy === "recruiter") return "recruiter"
  return "college"
}

export function splitInvitesForRecruiter(
  all: any[],
  sessionUserId: string,
): { received: any[]; sent: any[] } {
  const received: any[] = []
  const sent: any[] = []
  const seen = new Set<string>()

  for (const invite of all) {
    const id = String(invite._id)
    if (seen.has(id)) continue
    seen.add(id)

    const sender = getInviteSenderRole(invite, sessionUserId)
    if (sender === "recruiter") sent.push({ ...invite, createdByRole: "recruiter" })
    else received.push({ ...invite, createdByRole: "college" })
  }

  return { received, sent }
}

export function splitInvitesForCollege(all: any[]): { received: any[]; sent: any[] } {
  const received: any[] = []
  const sent: any[] = []
  const seen = new Set<string>()

  for (const invite of all) {
    const id = String(invite._id)
    if (seen.has(id)) continue
    seen.add(id)

    const sender =
      invite.createdByRole === "recruiter" || invite.initiatedBy === "recruiter"
        ? "recruiter"
        : "college"
    if (sender === "college") sent.push({ ...invite, createdByRole: "college" })
    else received.push({ ...invite, createdByRole: "recruiter" })
  }

  return { received, sent }
}
