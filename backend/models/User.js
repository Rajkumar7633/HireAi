const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["job_seeker", "recruiter", "admin"],
    default: "job_seeker",
  },
  name: {
    type: String,
    required: false,
  },
  phone: {
    type: String,
    required: false,
  },
  address: {
    type: String,
    required: false,
  },
  profileImage: {
    type: String,
    required: false,
  },
  companyName: {
    type: String,
    required: false,
  },
  companyLogo: {
    type: String,
    required: false,
  },
  companyDescription: {
    type: String,
    required: false,
  },
  website: {
    type: String,
    required: false,
  },
  linkedinUrl: {
    type: String,
    required: false,
  },
  twitterUrl: {
    type: String,
    required: false,
  },
  professionalSummary: {
    type: String,
    required: false,
  },
  businessLocation: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", UserSchema);
