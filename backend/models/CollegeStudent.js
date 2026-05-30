const mongoose = require("mongoose");

const collegeStudentSchema = new mongoose.Schema({
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
  department: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  currentYear: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  batch: {
    type: String,
    required: true
  },
  cgpa: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  placementStatus: {
    type: String,
    enum: ["Not Placed", "Placed", "In Process"],
    default: "Not Placed"
  },
  placementCompany: {
    type: String,
    default: null
  },
  package: {
    type: Number,
    default: null
  },
  skills: [{
    name: String,
    verified: {
      type: Boolean,
      default: false
    },
    verifiedScore: Number
  }],
  readinessScore: {
    technical: { type: Number, default: 0 },
    communication: { type: Number, default: 0 },
    problemSolving: { type: Number, default: 0 },
    overall: { type: Number, default: 0 }
  },
  alerts: [{
    type: String,
    message: String,
    severity: {
      type: String,
      enum: ["Critical", "Warning", "Info"]
    },
    resolved: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  recommendations: [{
    category: String,
    action: String,
    priority: {
      type: String,
      enum: ["High", "Medium", "Low"]
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending"
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

collegeStudentSchema.index({ collegeId: 1, currentYear: 1 });
collegeStudentSchema.index({ collegeId: 1, department: 1 });
collegeStudentSchema.index({ collegeId: 1, branch: 1 });
collegeStudentSchema.index({ studentId: 1 }, { unique: true });
collegeStudentSchema.index({ placementStatus: 1 });
collegeStudentSchema.index({ cgpa: -1 });

collegeStudentSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("CollegeStudent", collegeStudentSchema);
