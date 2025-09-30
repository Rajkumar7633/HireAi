import mongoose, { Schema, model, models } from "mongoose";

export type NextStep = "advance" | "reject" | "follow_up" | "undecided";

export interface IInterviewFeedback extends mongoose.Document {
  interviewId: string;
  roomId: string;
  recruiterFeedback?: {
    rating?: number;
    strengths?: string;
    concerns?: string;
  };
  candidateFeedback?: {
    rating?: number;
    experience?: string;
    issues?: string;
  };
  nextStep?: NextStep;
  updatedAt: Date;
}

const InterviewFeedbackSchema = new Schema<IInterviewFeedback>({
  interviewId: { type: String, index: true, required: true },
  roomId: { type: String, index: true, required: true },
  recruiterFeedback: {
    rating: Number,
    strengths: String,
    concerns: String,
  },
  candidateFeedback: {
    rating: Number,
    experience: String,
    issues: String,
  },
  nextStep: { type: String, enum: ["advance", "reject", "follow_up", "undecided"], default: "undecided" },
  updatedAt: { type: Date, default: Date.now },
});

InterviewFeedbackSchema.index({ interviewId: 1 });

export default models.InterviewFeedback || model<IInterviewFeedback>("InterviewFeedback", InterviewFeedbackSchema);
