const mongoose = require("mongoose")

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  referredEmail: {
    type: String,
    required: true,
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobDescription",
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
  },

  // Referral Code
  referralCode: {
    type: String,
    unique: true,
    required: true,
  },

  // Status
  status: {
    type: String,
    enum: ["Pending", "Signed Up", "Applied", "Hired", "Bonus Paid", "Expired"],
    default: "Pending",
  },

  // Bonus Information
  bonus: {
    amount: Number,
    currency: { type: String, default: "USD" },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Paid", "Rejected"],
      default: "Pending",
    },
    paidAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
  },

  // Tracking
  clickedAt: Date,
  signedUpAt: Date,
  appliedAt: Date,
  hiredAt: Date,
  expiresAt: Date,

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

referralSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("Referral", referralSchema)
