import mongoose, { Schema, type Document } from "mongoose"

export interface ICampusDriveApplication extends Document {
  driveId: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  collegeId: mongoose.Types.ObjectId
  studentSnapshot: {
    name: string
    email: string
    phone: string
    cgpa: number
    department: string
    batch: string
    skills: string[]
    resumeUrl: string
  }
  status: "applied" | "shortlisted" | "selected" | "rejected"
  appliedAt: Date
  updatedAt: Date
}

const CampusDriveApplicationSchema = new Schema<ICampusDriveApplication>(
  {
    driveId: { type: Schema.Types.ObjectId, ref: "CampusDrive", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    studentSnapshot: {
      name: String,
      email: String,
      phone: String,
      cgpa: Number,
      department: String,
      batch: String,
      skills: [String],
      resumeUrl: String,
    },
    status: {
      type: String,
      enum: ["applied", "shortlisted", "selected", "rejected"],
      default: "applied",
    },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

CampusDriveApplicationSchema.index({ driveId: 1, studentId: 1 }, { unique: true })
CampusDriveApplicationSchema.index({ studentId: 1 })

export default mongoose.models.CampusDriveApplication ||
  mongoose.model<ICampusDriveApplication>("CampusDriveApplication", CampusDriveApplicationSchema)
