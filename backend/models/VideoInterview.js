const mongoose = require("mongoose");

const VideoInterviewSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobApplication",
    required: true,
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
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
  scheduledDate: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // Duration in minutes
    required: true,
    default: 60,
  },
  status: {
    type: String,
    enum: ["scheduled", "in-progress", "completed", "cancelled", "missed"],
    default: "scheduled",
  },
  meetingLink: {
    type: String,
    required: false,
  },
  meetingId: {
    type: String,
    required: false,
  },
  recordingUrl: {
    type: String,
    required: false,
  },
  notes: {
    type: String,
    required: false,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: false,
  },
  feedback: {
    type: String,
    required: false,
  },
  roomId: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure only one index definition for roomId
VideoInterviewSchema.index({ roomId: 1 }, { unique: false }); // Explicitly define index

VideoInterviewSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("VideoInterview", VideoInterviewSchema);
module.exports.default = mongoose.model("VideoInterview", VideoInterviewSchema);
