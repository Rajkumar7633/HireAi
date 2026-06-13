import mongoose from "mongoose"
import User from "@/models/User"
import Notification from "@/models/Notification"
import CampusDrive from "@/models/CampusDrive"
import type { ICampusDriveInvite } from "@/models/CampusDriveInvite"
import { recruiterLabel } from "@/lib/campus-drive-utils"

export async function findEligibleStudents(collegeId: string, drive: any) {
  const studentQuery: Record<string, unknown> = {
    onboardedByCollege: collegeId,
    role: "job_seeker",
  }

  const e = drive.eligibility
  if (e?.minCGPA > 0) studentQuery.cgpa = { $gte: e.minCGPA }
  if (e?.branches?.length > 0) studentQuery.department = { $in: e.branches }
  if (e?.batches?.length > 0) studentQuery.batch = { $in: e.batches }

  return User.find(studentQuery).select("_id name email").lean()
}

export async function createDriveFromAcceptedInvite(invite: ICampusDriveInvite) {
  if (invite.linkedDriveId) {
    return CampusDrive.findById(invite.linkedDriveId).lean()
  }

  const recruiter = (await User.findById(invite.recruiterId)
    .select("companyName name")
    .lean()) as any

  const companyName = invite.companyName || recruiterLabel(recruiter)

  const primaryRole = invite.roles?.[0] || invite.driveTitle
  const driveDate = new Date(invite.driveDate)
  const deadline = new Date(driveDate)
  deadline.setDate(deadline.getDate() - 2)
  if (deadline.getTime() < Date.now()) {
    deadline.setTime(Date.now() + 24 * 60 * 60 * 1000)
  }

  const drive = await CampusDrive.create({
    collegeId: new mongoose.Types.ObjectId(invite.collegeId.toString()),
    companyName,
    role: primaryRole,
    description:
      invite.description ||
      `Campus drive with ${companyName}. Roles: ${(invite.roles || []).join(", ") || primaryRole}`,
    packageMin: invite.packageMin || 0,
    packageMax: invite.packageMax || 0,
    jobType: "Full Time",
    location: invite.location || "",
    venue: invite.location || invite.collegeName || "",
    eligibility: {
      minCGPA: 0,
      branches: [],
      years: [],
      batches: [],
      skills: [],
      backlogsAllowed: false,
    },
    rounds: ["Resume Shortlisting", "Aptitude Test", "Technical Interview", "HR Interview"],
    driveDate,
    applicationDeadline: deadline,
    status: "active",
    notificationsSent: false,
    totalApplicants: 0,
  })

  invite.linkedDriveId = drive._id
  await invite.save()

  try {
    const eligibleStudents = await findEligibleStudents(
      invite.collegeId.toString(),
      drive.toObject(),
    )
    if (eligibleStudents.length > 0) {
      await Notification.insertMany(
        eligibleStudents.map((s: any) => ({
          userId: s._id,
          type: "campus_drive_published",
          message: `New campus drive: ${companyName} is hiring for ${primaryRole}. Check eligibility and apply!`,
          read: false,
          relatedEntity: { id: drive._id, type: "campus_drive" },
        })),
        { ordered: false },
      )
      drive.notificationsSent = true
      await drive.save()
    }
  } catch (err) {
    console.error("[campus-drive-pipeline] student notify failed:", err)
  }

  return drive.toObject()
}
