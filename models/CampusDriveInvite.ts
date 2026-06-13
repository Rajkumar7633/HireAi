import mongoose, { Schema, type Document } from "mongoose"

export type CampusInviteStatus = "pending" | "accepted" | "declined" | "cancelled"
export type CampusInviteInitiator = "college" | "recruiter"

export interface ICampusDriveInvite extends Document {
  collegeId: mongoose.Types.ObjectId
  collegeName: string
  recruiterId: mongoose.Types.ObjectId
  companyName: string
  driveTitle: string
  driveDate: Date
  roles: string[]
  description: string
  location?: string
  packageMin?: number
  packageMax?: number
  /** @deprecated use createdByRole — kept for backward compatibility */
  initiatedBy: CampusInviteInitiator
  /** Who sent this proposal: college → recruiter, or recruiter → college */
  createdByRole: CampusInviteInitiator
  /** User id of the sender (college admin or recruiter) */
  createdByUserId?: mongoose.Types.ObjectId
  status: CampusInviteStatus
  linkedDriveId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CampusDriveInviteSchema = new Schema<ICampusDriveInvite>(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    collegeName: { type: String, required: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyName: { type: String, default: "" },
    driveTitle: { type: String, required: true },
    driveDate: { type: Date, required: true },
    roles: { type: [String], default: [] },
    description: { type: String, default: "" },
    location: { type: String, default: "" },
    packageMin: { type: Number, default: 0 },
    packageMax: { type: Number, default: 0 },
    initiatedBy: {
      type: String,
      enum: ["college", "recruiter"],
      default: "college",
      index: true,
    },
    createdByRole: {
      type: String,
      enum: ["college", "recruiter"],
      default: "college",
      index: true,
    },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled"],
      default: "pending",
      index: true,
    },
    linkedDriveId: { type: Schema.Types.ObjectId, ref: "CampusDrive" },
  },
  { timestamps: true },
)

CampusDriveInviteSchema.index({ collegeId: 1, recruiterId: 1, status: 1 })
CampusDriveInviteSchema.index({ recruiterId: 1, createdByRole: 1 })
CampusDriveInviteSchema.index({ collegeId: 1, createdByRole: 1 })

// Ensure hot-reload picks up schema changes in dev
if (mongoose.models.CampusDriveInvite) {
  delete mongoose.models.CampusDriveInvite
}

export const CampusDriveInvite = mongoose.model<ICampusDriveInvite>(
  "CampusDriveInvite",
  CampusDriveInviteSchema,
)

/** Force-write direction fields via native driver (avoids stale Mongoose schema cache). */
export async function persistInviteDirection(
  inviteId: mongoose.Types.ObjectId | string,
  role: CampusInviteInitiator,
  createdByUserId: mongoose.Types.ObjectId | string,
) {
  await CampusDriveInvite.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(String(inviteId)) },
    {
      $set: {
        initiatedBy: role,
        createdByRole: role,
        createdByUserId: new mongoose.Types.ObjectId(String(createdByUserId)),
      },
    },
  )
}

/** Backfill direction fields on legacy documents. */
export async function backfillInviteDirections() {
  await CampusDriveInvite.updateMany(
    { createdByRole: { $exists: false }, initiatedBy: "recruiter" },
    { $set: { createdByRole: "recruiter" } },
  )
  await CampusDriveInvite.updateMany(
    { createdByRole: { $exists: false }, initiatedBy: "college" },
    { $set: { createdByRole: "college" } },
  )

  // Infer direction from who was notified (most reliable for legacy rows)
  const Notification = (await import("@/models/Notification")).default
  const legacy = await CampusDriveInvite.find({
    $or: [{ createdByRole: { $exists: false } }, { createdByUserId: { $exists: false } }],
  })
    .select("_id collegeId recruiterId initiatedBy createdByRole")
    .lean()

  for (const invite of legacy) {
    const notif = (await Notification.findOne({ "relatedEntity.id": invite._id })
      .sort({ createdAt: 1 })
      .select("userId message")
      .lean()) as { userId?: { toString(): string }; message?: string } | null
    if (!notif?.userId) continue

    const notifyId = String(notif.userId)
    const collegeId = String(invite.collegeId)
    const recruiterId = String(invite.recruiterId)

    let role: CampusInviteInitiator | null = null
    if (notifyId === collegeId) role = "recruiter"
    else if (notifyId === recruiterId) role = "college"
    else if (String(notif.message || "").toLowerCase().includes("proposed")) role = "recruiter"
    else if (String(notif.message || "").toLowerCase().includes("invited you")) role = "college"

    if (!role) continue

    await CampusDriveInvite.collection.updateOne(
      { _id: invite._id },
      {
        $set: {
          createdByRole: role,
          initiatedBy: role,
        },
      },
    )
  }
}
