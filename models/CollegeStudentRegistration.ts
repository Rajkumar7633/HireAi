import mongoose, { Schema, type Document } from "mongoose"

export type RegistrationStatus = "pending" | "approved" | "rejected"

export interface ICollegeStudentRegistration extends Document {
  collegeId: mongoose.Types.ObjectId
  status: RegistrationStatus
  name: string
  email: string
  phone?: string
  rollNumber?: string
  department?: string
  batch?: string
  cgpa?: number
  marks10th?: number
  marks12th?: number
  backlogs?: number
  skills: string[]
  linkedinUrl?: string
  githubUrl?: string
  additionalInfo?: string
  submittedAt: Date
  reviewedAt?: Date
  reviewedBy?: mongoose.Types.ObjectId
  rejectionReason?: string
  createdUserId?: mongoose.Types.ObjectId
}

const CollegeStudentRegistrationSchema = new Schema<ICollegeStudentRegistration>(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: String,
    rollNumber: String,
    department: String,
    batch: String,
    cgpa: Number,
    marks10th: Number,
    marks12th: Number,
    backlogs: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    linkedinUrl: String,
    githubUrl: String,
    additionalInfo: String,
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: String,
    createdUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
)

CollegeStudentRegistrationSchema.index({ collegeId: 1, email: 1, status: 1 })

export default mongoose.models.CollegeStudentRegistration ||
  mongoose.model<ICollegeStudentRegistration>("CollegeStudentRegistration", CollegeStudentRegistrationSchema)
