const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "new_match",
      "application_status_update",
      "new_message",
      "test_assigned",
      "test_completed",
      "interview_scheduled",
      "interview_feedback",
      "system_alert",
    ],
  },
  message: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  relatedEntity: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "relatedEntityType",
      required: false,
    },
    type: {
      type: String,
      enum: ["JobApplication", "Match", "Conversation", "Test", "Interview"],
      required: false,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notification", NotificationSchema);
