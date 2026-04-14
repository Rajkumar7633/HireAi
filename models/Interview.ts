import mongoose, { Document, Schema } from "mongoose";

export interface IInterview extends Document {
  title: string;
  description?: string;
  candidateId: mongoose.Types.ObjectId;
  candidateEmail: string;
  candidateName: string;
  scheduledDate: Date;
  duration: number;
  type: "video" | "phone" | "in-person" | "technical";
  interviewerName: string;
  interviewerEmail: string;
  meetingLink?: string;
  company?: string;
  status: "scheduled" | "invitation_sent" | "completed" | "cancelled" | "rescheduled";
  interviewToken?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  candidateId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  candidateEmail: {
    type: String,
    required: true,
    trim: true
  },
  candidateName: {
    type: String,
    required: true,
    trim: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    default: 60,
    min: 15,
    max: 480
  },
  type: {
    type: String,
    enum: ["video", "phone", "in-person", "technical"],
    default: "video"
  },
  interviewerName: {
    type: String,
    required: true,
    trim: true
  },
  interviewerEmail: {
    type: String,
    required: true,
    trim: true
  },
  meetingLink: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true,
    default: "HireAI"
  },
  status: {
    type: String,
    enum: ["scheduled", "invitation_sent", "completed", "cancelled", "rescheduled"],
    default: "scheduled"
  },
  interviewToken: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
InterviewSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster queries
InterviewSchema.index({ candidateEmail: 1 });
InterviewSchema.index({ scheduledDate: 1 });
InterviewSchema.index({ status: 1 });
InterviewSchema.index({ interviewerEmail: 1 });

const Interview =
  mongoose.models.Interview || mongoose.model<IInterview>("Interview", InterviewSchema);

export default Interview;
