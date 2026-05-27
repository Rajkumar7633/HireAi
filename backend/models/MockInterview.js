const mongoose = require("mongoose")

const MockInterviewSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobDescription",
      required: true,
    },
    status: {
      type: String,
      enum: ["started", "completed"],
      default: "started",
    },
    questions: [
      {
        questionText: { type: String, required: true },
        answerText: { type: String, default: "" },
        feedback: { type: String, default: "" },
        score: { type: Number, default: 0 },
        fillerWords: [String],
      },
    ],
    overallScore: {
      type: Number,
      default: 0,
    },
    overallFeedback: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("MockInterview", MockInterviewSchema)
