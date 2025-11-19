const mongoose = require("mongoose")

const AnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    questionType: {
      type: String,
      enum: ["multiple_choice", "short_answer", "code_snippet"],
      required: true,
    },
    answer: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    language: {
      type: String,
    },
    passedTestCases: {
      type: Number,
      default: 0,
    },
    totalTestCases: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    rawOutput: {
      type: String,
    },
    errorOutput: {
      type: String,
    },
    runtimeMs: {
      type: Number,
    },
  },
  { _id: false }
)

const TestSubmissionSchema = new mongoose.Schema(
  {
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobApplication",
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Which round/stage of the hiring pipeline this submission belongs to (e.g. coding_round, tech_round_1)
    roundStage: {
      type: String,
    },
    // Attempt number within that round for this candidate (1, 2, ...)
    attemptNumber: {
      type: Number,
      default: 1,
    },
    answers: [AnswerSchema],
    totalScore: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "completed",
    },
    plagiarismScore: {
      type: Number,
      default: 0,
    },
    plagiarismFlags: [String],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("TestSubmission", TestSubmissionSchema)
