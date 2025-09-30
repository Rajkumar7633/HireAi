const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Personal Information
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    location: { type: String, required: true },

    // Professional Information
    currentTitle: { type: String, required: true },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "lead", "executive"],
      required: true,
    },
    industry: { type: String, required: true },
    skills: [{ type: String }],

    // Education
    education: {
      type: String,
      enum: ["high-school", "associate", "bachelor", "master", "phd", "other"],
      required: true,
    },
    university: String,
    graduationYear: String,

    // Online Presence
    linkedinUrl: String,
    portfolioUrl: String,
    githubUrl: String,

    // Career Goals
    desiredRole: { type: String, required: true },
    salaryExpectation: String,
    workPreference: {
      type: String,
      enum: ["remote", "hybrid", "onsite", "flexible"],
      required: true,
    },
    summary: String,

    // Metadata
    profileCompleteness: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Calculate profile completeness before saving
userProfileSchema.pre("save", function (next) {
  const requiredFields = [
    "firstName",
    "lastName",
    "email",
    "location",
    "currentTitle",
    "experienceLevel",
    "industry",
    "education",
    "desiredRole",
    "workPreference",
  ];
  const optionalFields = [
    "phone",
    "university",
    "graduationYear",
    "linkedinUrl",
    "portfolioUrl",
    "githubUrl",
    "salaryExpectation",
    "summary",
  ];

  let score = 0;
  let totalWeight = 0;

  // Required fields (70% weight)
  requiredFields.forEach((field) => {
    totalWeight += 7;
    if (this[field]) score += 7;
  });

  // Skills (special required field)
  totalWeight += 7;
  if (this.skills && this.skills.length > 0) score += 7;

  // Optional fields (30% weight)
  optionalFields.forEach((field) => {
    totalWeight += 3;
    if (this[field]) score += 3;
  });

  this.profileCompleteness = Math.round((score / totalWeight) * 100);
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model("UserProfile", userProfileSchema);
