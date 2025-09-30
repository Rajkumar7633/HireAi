import mongoose from "mongoose"

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
      "assessment_assigned",
      "assessment_reminder",
      "interview_scheduled",
      "application_status_update",
      "message_received",
      "assessment_violation",
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
      required: false,
    },
    type: {
      type: String,
      enum: ["assessment", "interview", "application", "message"],
      required: false,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema)
