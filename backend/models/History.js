const mongoose = require("mongoose")

const HistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: [
      "resume_upload",
      "job_description_post",
      "match_generated",
      "profile_update",
      "password_change",
      "account_delete",
      "job_application",
      "test_assigned",
      "test_submitted",
      "interview_scheduled",
      "interview_feedback",
      "message_sent",
    ],
    required: true,
  },
  details: {
    type: String,
    required: true,
  },
  relatedEntity: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedEntityType",
      required: false,
    },
    type: {
      type: String,
      enum: ["Resume", "JobDescription", "Match", "User", "JobApplication", "Test", "Conversation"],
      required: false,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("History", HistorySchema)
