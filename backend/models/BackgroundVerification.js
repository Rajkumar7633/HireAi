const mongoose = require("mongoose")

const backgroundVerificationSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
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

  // Verification Provider
  provider: {
    type: String,
    enum: ["Checkr", "Hireright", "Sterling", "GoodHire", "Manual"],
    default: "Manual",
  },
  providerReferenceId: String,

  // Verification Status
  status: {
    type: String,
    enum: ["Pending", "In Progress", "Completed", "Failed", "Cancelled"],
    default: "Pending",
  },

  // Verification Components
  components: {
    identity: {
      status: { type: String, enum: ["Pending", "Verified", "Failed", "Not Required"], default: "Pending" },
      verifiedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      notes: String,
    },
    education: {
      status: { type: String, enum: ["Pending", "Verified", "Failed", "Not Required"], default: "Pending" },
      verifiedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      notes: String,
    },
    employment: {
      status: { type: String, enum: ["Pending", "Verified", "Failed", "Not Required"], default: "Pending" },
      verifiedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      notes: String,
    },
    criminal: {
      status: { type: String, enum: ["Pending", "Verified", "Failed", "Not Required"], default: "Pending" },
      verifiedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      notes: String,
    },
    drug: {
      status: { type: String, enum: ["Pending", "Verified", "Failed", "Not Required"], default: "Pending" },
      verifiedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      notes: String,
    },
    reference: {
      status: { type: String, enum: ["Pending", "Verified", "Failed", "Not Required"], default: "Pending" },
      verifiedAt: Date,
      result: mongoose.Schema.Types.Mixed,
      notes: String,
    },
  },

  // Overall Result
  overallResult: {
    type: String,
    enum: ["Clear", "Consider", "Adverse", "Pending"],
  },
  riskLevel: {
    type: String,
    enum: ["Low", "Medium", "High"],
  },

  // Report
  reportUrl: String,
  reportGeneratedAt: Date,

  // Cost
  cost: {
    amount: Number,
    currency: { type: String, default: "USD" },
    paid: Boolean,
    paidAt: Date,
  },

  // Timeline
  initiatedAt: { type: Date, default: Date.now },
  completedAt: Date,
  estimatedCompletion: Date,

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

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

backgroundVerificationSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("BackgroundVerification", backgroundVerificationSchema)
