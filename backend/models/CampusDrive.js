const mongoose = require("mongoose");

const campusDriveSchema = new mongoose.Schema({
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
  jobDescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JobDescription"
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  departments: [{
    type: String
  }],
  branches: [{
    type: String
  }],
  eligibilityCriteria: {
    minCGPA: {
      type: Number,
      default: 0
    },
    minYear: {
      type: Number,
      default: 1
    },
    maxYear: {
      type: Number,
      default: 5
    },
    skills: [{
      type: String
    }]
  },
  driveDate: {
    type: Date,
    required: true
  },
  venue: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ["Upcoming", "Ongoing", "Completed", "Cancelled"],
    default: "Upcoming"
  },
  registeredStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "CollegeStudent"
  }],
  selectedStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "CollegeStudent"
  }],
  interviewSchedule: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollegeStudent"
    },
    date: Date,
    time: String,
    venue: String,
    type: {
      type: String,
      enum: ["Technical", "HR", "Group Discussion", "Aptitude"]
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled"
    },
    feedback: String,
    result: {
      type: String,
      enum: ["Selected", "Rejected", "Pending"],
      default: "Pending"
    }
  }],
  finalResults: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollegeStudent"
    },
    status: {
      type: String,
      enum: ["Selected", "Rejected", "On Hold"]
    },
    package: Number,
    position: String,
    offerDate: Date
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

campusDriveSchema.index({ collegeId: 1, driveDate: 1 });
campusDriveSchema.index({ recruiterId: 1 });
campusDriveSchema.index({ status: 1 });
campusDriveSchema.index({ driveDate: 1 });

campusDriveSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("CampusDrive", campusDriveSchema);
