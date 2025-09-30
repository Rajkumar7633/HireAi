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
})

module.exports = mongoose.model("JobApplication", JobApplicationSchema)
