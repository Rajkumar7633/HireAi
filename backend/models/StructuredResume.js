const mongoose = require("mongoose")

const StructuredResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  personalInfo: {
    name: String,
    email: String,
    phone: String,
    linkedin: String,
    github: String,
    portfolio: String,
    address: String,
  },
  summary: String,
  experience: [
    {
      title: String,
      company: String,
      location: String,
      startDate: Date,
      endDate: Date,
      description: [String], // Bullet points
    },
  ],
  education: [
    {
      degree: String,
      major: String,
      institution: String,
      location: String,
      startDate: Date,
      endDate: Date,
    },
  ],
  skills: [String], // Array of strings
  projects: [
    {
      title: String,
      description: String,
      technologies: [String],
      url: String,
    },
  ],
  certifications: [
    {
      name: String,
      issuer: String,
      issueDate: Date,
    },
  ],
  awards: [
    {
      name: String,
      date: Date,
      description: String,
    },
  ],
  languages: [String],
  interests: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("StructuredResume", StructuredResumeSchema)
