import mongoose, { Schema, type Document } from "mongoose"

export interface IVideoInterview extends Document {
  applicationId: mongoose.Types.ObjectId
  recruiterId: mongoose.Types.ObjectId
  candidateId: mongoose.Types.ObjectId
  jobId: mongoose.Types.ObjectId
  scheduledDate: Date
  duration: number
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "missed"
  meetingLink?: string
  meetingId?: string
  recordingUrl?: string
  notes?: string
  rating?: number
  feedback?: string
  roomId?: string
  // session lifecycle
  startedAt?: Date
  endedAt?: Date
  hostJoinedAt?: Date
  candidateJoinedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const VideoInterviewSchema = new Schema<IVideoInterview>(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "JobDescription",
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      default: 60,
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled", "missed"],
      default: "scheduled",
    },
    meetingLink: {
      type: String,
      required: false,
    },
    meetingId: {
      type: String,
      required: false,
    },
    recordingUrl: {
      type: String,
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: false,
    },
    feedback: {
      type: String,
      required: false,
    },
    roomId: {
      type: String,
      required: false,
    },
    startedAt: { type: Date, required: false },
    endedAt: { type: Date, required: false },
    hostJoinedAt: { type: Date, required: false },
    candidateJoinedAt: { type: Date, required: false },
  },
  {
    timestamps: true,
  },
)

// Ensure only one index definition for roomId
VideoInterviewSchema.index({ roomId: 1 }, { unique: false })

export default mongoose.models.VideoInterview || mongoose.model<IVideoInterview>("VideoInterview", VideoInterviewSchema)
