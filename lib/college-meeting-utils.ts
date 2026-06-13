import mongoose from "mongoose"
import User from "@/models/User"
import type { MeetingAudienceMode } from "@/models/CollegeMeeting"
import {
  DEPARTMENTS,
  inferYearFromBatch,
  formatDuration,
  computeMeetingStatus,
} from "@/lib/college-meeting-shared"

export async function resolveCollegeMeetingInvitees(
  collegeId: string,
  mode: MeetingAudienceMode,
  filters: {
    department?: string
    year?: number | null
    batch?: string
    studentIds?: string[]
  },
) {
  const collegeOid = new mongoose.Types.ObjectId(collegeId)
  const baseQuery: Record<string, unknown> = {
    role: "job_seeker",
    onboardedByCollege: { $in: [collegeId, collegeOid] },
  }

  if (mode === "department" && filters.department) {
    baseQuery.department = filters.department
  }
  if (mode === "batch" && filters.batch) {
    baseQuery.batch = filters.batch
  }
  if (mode === "custom" && filters.studentIds?.length) {
    baseQuery._id = { $in: filters.studentIds }
  }

  let students = await User.find(baseQuery)
    .select("name email department batch")
    .lean()

  if (mode === "year" && filters.year) {
    students = students.filter((s) => inferYearFromBatch(s.batch) === filters.year)
  }

  return students
}

export { DEPARTMENTS, inferYearFromBatch, formatDuration, computeMeetingStatus }
