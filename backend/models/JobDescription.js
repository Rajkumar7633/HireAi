const mongoose = require("mongoose")

const JobDescriptionSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  requirements: {
    type: [String], // Array of strings for bullet points
    required: true,
  },
  responsibilities: {
    type: [String], // Array of strings for bullet points
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  salary: {
    type: String, // e.g., "$80,000 - $100,000"
    required: false,
  },
  employmentType: {
    type: String,
    enum: ["Full-time", "Part-time", "Contract", "Temporary", "Internship"],
    required: true,
  },
  skills: {
    type: [String], // Array of required skills
    required: true,
  },
  postedDate: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("JobDescription", JobDescriptionSchema)
