import mongoose, { Schema, Document } from "mongoose"

export interface ICollegeInterview extends Document {
  collegeId: string
  driveId?: mongoose.Types.ObjectId
  studentId: mongoose.Types.ObjectId
  date: Date
  time?: string
  venue?: string
  type: "Technical" | "HR" | "Group Discussion" | "Aptitude" | "Case Study"
  notes?: string
  status: "Scheduled" | "Completed" | "Cancelled"
  result: "Selected" | "Rejected" | "Pending"
  feedback?: string
}

const CollegeInterviewSchema = new Schema<ICollegeInterview>(
  {
    collegeId: { type: String, required: true, index: true },
    driveId: { type: Schema.Types.ObjectId, ref: "CampusDrive" },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    time: { type: String, default: "" },
    venue: { type: String, default: "" },
    type: {
      type: String,
      enum: ["Technical", "HR", "Group Discussion", "Aptitude", "Case Study"],
      default: "Technical",
    },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    result: {
      type: String,
      enum: ["Selected", "Rejected", "Pending"],
      default: "Pending",
    },
    feedback: { type: String, default: "" },
  },
  { timestamps: true }
)

CollegeInterviewSchema.index({ collegeId: 1, date: -1 })
CollegeInterviewSchema.index({ studentId: 1 })

export const CollegeInterview =
  mongoose.models.CollegeInterview ||
  mongoose.model<ICollegeInterview>("CollegeInterview", CollegeInterviewSchema)
