const mongoose = require("mongoose")

const ResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  filepath: {
    type: String, // Path to the stored file
    required: true,
  },
  parsedText: {
    type: String, // Full text extracted from resume
    required: true,
  },
  metadata: {
    type: Object, // JSON object for extracted skills, experience, education etc.
    required: false,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Resume", ResumeSchema)
