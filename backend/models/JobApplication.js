const mongoose = require("mongoose")

const JobApplicationSchema = new mongoose.Schema({
  jobSeekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  jobDescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobDescription",
    required: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    required: true,
  },
  applicationDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["Pending", "Reviewed", "Interview Scheduled", "Test Assigned", "Rejected", "Hired"],
    default: "Pending",
  },
  // Fields for test and interview
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Test",
    required: false,
  },
  testScore: {
    type: Number,
    required: false,
  },
  interviewDate: {
    type: Date,
    required: false,
  },
  interviewFeedback: {
    type: String,
    required: false,
  },
  // High-level pipeline stage for this application (application, coding_round, tech_round_1, hr_round, offer, etc.)
  currentStage: {
    type: String,
    default: "application",
  },
  // Detailed per-round history and links to test submissions
  rounds: [
    {
      roundName: {
        type: String,
      },
      // machine-friendly key, e.g. coding_round, tech_round_1, hr_round
      stageKey: {
        type: String,
      },
      testId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Test",
      },
      submissions: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "TestSubmission",
        },
      ],
      status: {
        type: String,
        enum: ["pending", "in_progress", "passed", "failed", "skipped", "completed"],
        default: "pending",
      },
      latestScore: {
        type: Number,
      },
      notes: {
        type: String,
      },
    },
  ],
})

// Helpful indexes for recruiter queries and job seeker dashboards
// These mirror the indexes defined in the Next.js Application schema and do not change behavior.
JobApplicationSchema.index({ jobDescriptionId: 1, status: 1 })
JobApplicationSchema.index({ jobDescriptionId: 1, shortlisted: 1, aiMatchScore: -1 })
JobApplicationSchema.index({ jobSeekerId: 1, jobDescriptionId: 1 })

module.exports = mongoose.model("JobApplication", JobApplicationSchema)
