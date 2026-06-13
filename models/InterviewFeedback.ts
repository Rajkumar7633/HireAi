import mongoose, { Schema, model, models } from "mongoose";

export type NextStep = "advance" | "reject" | "follow_up" | "undecided";

export interface IInterviewFeedback extends mongoose.Document {
  interviewId: string;
  roomId: string;
  recruiterFeedback?: {
    rating?: number;
    strengths?: string;
    concerns?: string;
    technicalScore?: number;
    communicationScore?: number;
    codingScore?: number;
    cultureFitScore?: number;
    overallScore?: number;
    privateNotes?: string;
    summaryForPipeline?: string;
    tags?: string[];
  };
  candidateFeedback?: {
    rating?: number;
    experience?: string;
    issues?: string;
    wouldRecommend?: boolean;
  };
  nextStep?: NextStep;
  updatedAt: Date;
}

const InterviewFeedbackSchema = new Schema<IInterviewFeedback>({
  interviewId: { type: String, required: true },
  roomId: { type: String, required: true },
  recruiterFeedback: {
    rating: Number,
    strengths: String,
    concerns: String,
    technicalScore: Number,
    communicationScore: Number,
    codingScore: Number,
    cultureFitScore: Number,
    overallScore: Number,
    privateNotes: String,
    summaryForPipeline: String,
    tags: [String],
  },
  candidateFeedback: {
    rating: Number,
    experience: String,
    issues: String,
    wouldRecommend: Boolean,
  },
  nextStep: { type: String, enum: ["advance", "reject", "follow_up", "undecided"], default: "undecided" },
  updatedAt: { type: Date, default: Date.now },
});

InterviewFeedbackSchema.index({ interviewId: 1 });
InterviewFeedbackSchema.index({ roomId: 1 });

export default models.InterviewFeedback || model<IInterviewFeedback>("InterviewFeedback", InterviewFeedbackSchema);
