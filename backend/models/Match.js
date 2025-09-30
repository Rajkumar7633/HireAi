const mongoose = require("mongoose")

const MatchSchema = new mongoose.Schema({
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
    required: true,
  },
  jobDescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobDescription",
    required: true,
  },
  matchScore: {
    type: Number, // Percentage score (0-100)
    required: true,
  },
  atsScore: {
    type: Number, // ATS compatibility score (0-100)
    required: true,
  },
  matchedSkills: {
    type: [String],
    default: [],
  },
  suggestions: {
    type: [String], // Suggestions for resume improvement
    default: [],
  },
  matchDate: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Match", MatchSchema)
