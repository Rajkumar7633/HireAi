import mongoose, { Schema, type Document } from "mongoose"

export interface ISupportRequest extends Document {
  studentId: mongoose.Types.ObjectId
  collegeId: mongoose.Types.ObjectId
  driveId?: mongoose.Types.ObjectId
  subject: string
  message: string
  type: "general" | "eligibility_dispute" | "drive_inquiry" | "technical" | "other"
  status: "open" | "in_progress" | "resolved"
  response?: string
  respondedAt?: Date
  createdAt: Date
  updatedAt: Date
  studentName: string
  studentEmail: string
}

const SupportRequestSchema = new Schema<ISupportRequest>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    collegeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    driveId: { type: Schema.Types.ObjectId, ref: "CampusDrive" },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["general", "eligibility_dispute", "drive_inquiry", "technical", "other"],
      default: "general",
    },
    status: { type: String, enum: ["open", "in_progress", "resolved"], default: "open" },
    response: String,
    respondedAt: Date,
    studentName: { type: String, default: "" },
    studentEmail: { type: String, default: "" },
  },
  { timestamps: true }
)

export default mongoose.models.SupportRequest ||
  mongoose.model<ISupportRequest>("SupportRequest", SupportRequestSchema)
