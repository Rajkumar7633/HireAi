const mongoose = require("mongoose");

const studentPlacementSchema = new mongoose.Schema({
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  collegeStudentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CollegeStudent",
    required: true
  },
  driveId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CampusDrive"
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  jobTitle: {
    type: String,
    required: true
  },
  jobDescription: {
    type: String
  },
  package: {
    type: Number,
    required: true
  },
  packageType: {
    type: String,
    enum: ["CTC", "Take Home", "Gross"],
    default: "CTC"
  },
  currency: {
    type: String,
    default: "INR"
  },
  location: {
    type: String
  },
  offerDate: {
    type: Date,
    required: true
  },
  joiningDate: {
    type: Date
  },
  offerStatus: {
    type: String,
    enum: ["Pending", "Accepted", "Rejected", "Deferred"],
    default: "Pending"
  },
  offerLetterUrl: {
    type: String
  },
  interviewRounds: [{
    roundType: {
      type: String,
      enum: ["Technical", "HR", "Group Discussion", "Aptitude", "Case Study"]
    },
    date: Date,
    result: {
      type: String,
      enum: ["Selected", "Rejected", "On Hold"]
    },
    feedback: String,
    interviewer: String
  }],
  skillsMatched: [{
    skill: String,
    matched: Boolean
  }],
  placementType: {
    type: String,
    enum: ["Campus Placement", "Off Campus", "Internship", "PPO"],
    default: "Campus Placement"
  },
  documents: [{
    type: {
      type: String,
      enum: ["Offer Letter", "NDA", "Other"]
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

studentPlacementSchema.index({ collegeId: 1, offerDate: -1 });
studentPlacementSchema.index({ studentId: 1 });
studentPlacementSchema.index({ companyId: 1 });
studentPlacementSchema.index({ driveId: 1 });
studentPlacementSchema.index({ offerStatus: 1 });

studentPlacementSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("StudentPlacement", studentPlacementSchema);
