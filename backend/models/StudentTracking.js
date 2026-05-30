const mongoose = require("mongoose")

const studentTrackingSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  
  // Academic Information
  academicInfo: {
    currentYear: {
      type: Number,
      enum: [1, 2, 3, 4, 5], // 1st year to 5th year
      required: true,
    },
    branch: String,
    department: String,
    section: String,
    batch: String, // e.g., "2024-2028"
    cgpa: Number,
    sgpa: [Number], // Semester-wise SGPA
    attendance: {
      type: Map,
      of: Number, // Semester-wise attendance percentage
    },
  },

  // Year-wise Progress Tracking
  yearlyProgress: [
    {
      year: Number,
      semester: Number,
      cgpa: Number,
      skillsAcquired: [String],
      certifications: [String],
      projects: [{
        title: String,
        description: String,
        technologies: [String],
        completionDate: Date,
      }],
      internships: [{
        company: String,
        role: String,
        duration: String,
        startDate: Date,
        endDate: Date,
      }],
      assessments: [{
        type: String,
        score: Number,
        date: Date,
      }],
      readinessScore: Number,
      notes: String,
    }
  ],

  // Placement Readiness
  placementReadiness: {
    resumeQuality: {
      score: Number,
      lastUpdated: Date,
      feedback: String,
    },
    skillsGap: [{
      skill: String,
      required: Boolean,
      currentLevel: String, // Beginner, Intermediate, Advanced
      targetLevel: String,
    }],
    interviewReadiness: {
      technical: Number,
      communication: Number,
      problemSolving: Number,
      overall: Number,
      lastAssessed: Date,
    },
    mockInterviews: [{
      date: Date,
      interviewer: String,
      feedback: String,
      score: Number,
    }],
  },

  // Placement Status
  placementStatus: {
    isEligible: Boolean,
    eligibilityCriteria: {
      minCGPA: Number,
      maxBacklogs: Number,
      requiredSkills: [String],
    },
    placed: Boolean,
    offers: [{
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
      position: String,
      package: Number,
      offerDate: Date,
      accepted: Boolean,
    }],
    applications: [{
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },
      position: String,
      status: String,
      appliedDate: Date,
      lastUpdated: Date,
    }],
  },

  // Skill Development
  skillDevelopment: {
    technicalSkills: [{
      name: String,
      level: String, // Beginner, Intermediate, Advanced
      lastPracticed: Date,
      projectsCount: Number,
    }],
    softSkills: [{
      name: String,
      level: String,
      evidence: String,
    }],
    learningPath: [{
      skill: String,
      currentStep: Number,
      totalSteps: Number,
      resources: [String],
      deadline: Date,
    }],
  },

  // Achievements & Extracurricular
  achievements: [{
    title: String,
    description: String,
    date: Date,
    category: String, // Academic, Sports, Cultural, Other
  }],
  extracurricular: [{
    activity: String,
    role: String,
    duration: String,
    achievements: String,
  }],

  // Alerts & Recommendations
  alerts: [{
    type: String,
    message: String,
    severity: String, // Info, Warning, Critical
    createdAt: { type: Date, default: Date.now },
    resolved: Boolean,
    resolvedAt: Date,
  }],
  recommendations: [{
    category: String,
    action: String,
    priority: String,
    deadline: Date,
    status: String, // Pending, In Progress, Completed
  }],

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

studentTrackingSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

// Index for efficient queries
studentTrackingSchema.index({ studentId: 1 })
studentTrackingSchema.index({ collegeId: 1 })
studentTrackingSchema.index({ "academicInfo.currentYear": 1 })
studentTrackingSchema.index({ "academicInfo.batch": 1 })
studentTrackingSchema.index({ "placementStatus.placed": 1 })

module.exports = mongoose.model("StudentTracking", studentTrackingSchema)
