const mongoose = require("mongoose");

const collegePartnershipSchema = new mongoose.Schema({
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  partnershipType: {
    type: String,
    enum: ["Campus Drive", "Internship", "Training", "Placement"],
    default: "Placement"
  },
  status: {
    type: String,
    enum: ["Active", "Inactive", "Pending", "Terminated"],
    default: "Active"
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  agreementDetails: {
    type: String
  },
  drivesConducted: {
    type: Number,
    default: 0
  },
  studentsPlaced: {
    type: Number,
    default: 0
  },
  totalPackageValue: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  notes: [{
    content: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

collegePartnershipSchema.index({ collegeId: 1, status: 1 });
collegePartnershipSchema.index({ recruiterId: 1 });
collegePartnershipSchema.index({ companyId: 1 });
collegePartnershipSchema.index({ partnershipType: 1 });
collegePartnershipSchema.index({ lastActivity: -1 });

collegePartnershipSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("CollegePartnership", collegePartnershipSchema);
