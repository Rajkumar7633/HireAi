import mongoose from "mongoose"

const ApplicationSchema = new mongoose.Schema({
  jobSeekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobSeeker",
    required: true,
  },
  jobDescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobDescription",
    required: true,
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Assessment",
    required: false,
  },
  status: {
    type: String,
    enum: [
      "Pending",
      "Under Review",
      "Shortlisted",
      "Rejected",
      "Test Assigned",
      "Assessment Assigned",
      "Assessment Completed",
    ],
    default: "Pending",
  },
  applicationDate: {
    type: Date,
    default: Date.now,
  },
  assessmentScore: {
    type: Number,
    required: false,
  },
  assessmentCompletedAt: {
    type: Date,
    required: false,
  },
})

ApplicationSchema.index({ jobSeekerId: 1 })
ApplicationSchema.index({ jobSeekerId: 1, status: 1 })
ApplicationSchema.index({ jobSeekerId: 1, assessmentId: 1 })

const Application = mongoose.models.Application || mongoose.model("Application", ApplicationSchema)

export default Application
