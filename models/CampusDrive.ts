import mongoose, { Schema, type Document } from "mongoose"

export interface ICampusDrive extends Document {
  collegeId: mongoose.Types.ObjectId
  companyName: string
  companyLogo?: string
  role: string
  description: string
  packageMin: number
  packageMax: number
  jobType: "Full Time" | "Internship" | "Contract" | "PPO"
  location: string
  eligibility: {
    minCGPA: number
    branches: string[]
    years: number[]
    batches: string[]
    semesters: number[]
    skills: string[]
    backlogsAllowed: boolean
  }
  rounds: string[]
  driveDate: Date
  applicationDeadline: Date
  venue: string
  status: "draft" | "active" | "completed" | "cancelled"
  notificationsSent: boolean
  totalApplicants: number
  createdAt: Date
  updatedAt: Date
}

const CampusDriveSchema = new Schema<ICampusDrive>(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    companyLogo: String,
    role: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    packageMin: { type: Number, default: 0 },
    packageMax: { type: Number, default: 0 },
    jobType: { type: String, enum: ["Full Time", "Internship", "Contract", "PPO"], default: "Full Time" },
    location: { type: String, default: "" },
    eligibility: {
      minCGPA: { type: Number, default: 0 },
      branches: { type: [String], default: [] },
      years: { type: [Number], default: [] },
      batches: { type: [String], default: [] },
      semesters: { type: [Number], default: [] },
      skills: { type: [String], default: [] },
      backlogsAllowed: { type: Boolean, default: false },
    },
    rounds: { type: [String], default: [] },
    driveDate: { type: Date, required: true },
    applicationDeadline: { type: Date, required: true },
    venue: { type: String, default: "" },
    status: { type: String, enum: ["draft", "active", "completed", "cancelled"], default: "active" },
    notificationsSent: { type: Boolean, default: false },
    totalApplicants: { type: Number, default: 0 },
  },
  { timestamps: true }
)

CampusDriveSchema.index({ collegeId: 1, status: 1 })
CampusDriveSchema.index({ applicationDeadline: 1 })

export default mongoose.models.CampusDrive ||
  mongoose.model<ICampusDrive>("CampusDrive", CampusDriveSchema)
