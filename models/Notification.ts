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
      "assessment_completed",
      "assessment_reminder",
      "assessment_violation",
      "interview_scheduled",
      "application_status_update",
      "message_received",
      "test_assigned",
      "test_completed",
      "campus_drive_published",
      "campus_drive_application",
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
      enum: ["assessment", "interview", "application", "message", "test", "job_application", "JobApplication", "campus_drive"],
      required: false,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema)
