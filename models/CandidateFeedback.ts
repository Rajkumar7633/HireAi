import mongoose from "mongoose"

const CandidateFeedbackSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Application",
    required: true,
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true,
  },
  comment: {
    type: String,
    required: false,
  },
  category: {
    type: String,
    enum: ["application_process", "communication", "interview_experience", "overall_experience"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.models.CandidateFeedback || mongoose.model("CandidateFeedback", CandidateFeedbackSchema)
