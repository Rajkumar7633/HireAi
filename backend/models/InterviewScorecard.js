const mongoose = require("mongoose")

const interviewScorecardSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobApplication",
    required: true,
  },
  interviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Interview Details
  interviewType: {
    type: String,
    enum: ["Technical", "Behavioral", "HR", "Panel", "Final"],
    required: true,
  },
  interviewDate: {
    type: Date,
    required: true,
  },
  interviewDuration: Number, // in minutes

  // Scoring Categories
  scores: {
    technical: {
      score: { type: Number, min: 0, max: 10 },
      notes: String,
    },
    communication: {
      score: { type: Number, min: 0, max: 10 },
      notes: String,
    },
    problemSolving: {
      score: { type: Number, min: 0, max: 10 },
      notes: String,
    },
    cultureFit: {
      score: { type: Number, min: 0, max: 10 },
      notes: String,
    },
    leadership: {
      score: { type: Number, min: 0, max: 10 },
      notes: String,
    },
  },

  // Overall Assessment
  overallScore: {
    type: Number,
    min: 0,
    max: 10,
  },
  recommendation: {
    type: String,
    enum: ["Strong Hire", "Hire", "Maybe", "No Hire", "Strong No Hire"],
  },

  // Questions and Answers
  questions: [{
    question: String,
    answer: String,
    score: { type: Number, min: 0, max: 10 },
    notes: String,
  }],

  // Strengths and Weaknesses
  strengths: [String],
  weaknesses: [String],
  areasForImprovement: [String],

  // Final Comments
  comments: String,
  followUpRequired: Boolean,
  followUpNotes: String,

  // Status
  status: {
    type: String,
    enum: ["Draft", "Submitted", "Reviewed"],
    default: "Draft",
  },

  // Audit Trail
  submittedAt: Date,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  reviewedAt: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

interviewScorecardSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

// Calculate overall score before saving
interviewScorecardSchema.pre("save", function () {
  const scores = Object.values(this.scores).filter(s => s.score !== undefined)
  if (scores.length > 0) {
    const total = scores.reduce((sum, s) => sum + s.score, 0)
    this.overallScore = (total / scores.length).toFixed(1)
  }
})

module.exports = mongoose.model("InterviewScorecard", interviewScorecardSchema)
