const mongoose = require("mongoose")

const offerLetterSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobApplication",
    required: true,
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobDescription",
    required: true,
  },

  // Offer Details
  offerDetails: {
    position: String,
    department: String,
    startDate: Date,
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Internship"],
      default: "Full-time",
    },
    reportingTo: String,
    workLocation: String,
    workArrangement: {
      type: String,
      enum: ["On-site", "Remote", "Hybrid"],
      default: "On-site",
    },
  },

  // Compensation
  compensation: {
    baseSalary: Number,
    currency: { type: String, default: "USD" },
    salaryPeriod: {
      type: String,
      enum: ["Annual", "Monthly", "Hourly"],
      default: "Annual",
    },
    bonus: Number,
    bonusType: String,
    equity: {
      granted: Boolean,
      type: String,
      quantity: Number,
      vestingSchedule: String,
    },
    benefits: [String],
  },

  // Terms
  terms: {
    probationPeriod: Number, // in months
    noticePeriod: Number, // in days
    workingHours: String,
    vacationDays: Number,
    sickDays: Number,
    otherTerms: String,
  },

  // Status Tracking
  status: {
    type: String,
    enum: ["Draft", "Sent", "Viewed", "Accepted", "Rejected", "Expired", "Withdrawn"],
    default: "Draft",
  },
  sentAt: Date,
  viewedAt: Date,
  respondedAt: Date,
  expiresAt: Date,

  // E-Signature
  signature: {
    candidateSigned: Boolean,
    candidateSignature: String,
    candidateSignedAt: Date,
    recruiterSigned: Boolean,
    recruiterSignature: String,
    recruiterSignedAt: Date,
  },

  // Custom Content
  customContent: {
    greeting: String,
    introduction: String,
    additionalTerms: String,
    closing: String,
  },

  // Template
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OfferTemplate",
  },

  // Audit Trail
  history: [
    {
      action: String,
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      timestamp: { type: Date, default: Date.now },
      details: mongoose.Schema.Types.Mixed,
    },
  ],

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

offerLetterSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("OfferLetter", offerLetterSchema)
