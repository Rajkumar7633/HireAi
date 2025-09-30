import mongoose, { Schema, type Document } from "mongoose"

export interface IApplication extends Document {
  jobId: mongoose.Types.ObjectId
  jobDescriptionId: mongoose.Types.ObjectId
  jobSeekerId: mongoose.Types.ObjectId
  applicantId: mongoose.Types.ObjectId
  resumeId?: mongoose.Types.ObjectId
  assessmentId?: mongoose.Types.ObjectId
  assignedBy?: mongoose.Types.ObjectId
  assignedAt?: Date
  expiresAt?: Date
  status:
  | "pending"
  | "reviewed"
  | "test_assigned"
  | "test_completed"
  | "interview"
  | "hired"
  | "rejected"
  | "assigned"
  | "Assessment Assigned"
  | "Assessment Completed"
  | "Pending"
  | "Reviewed"
  | "Interview Scheduled"
  | "Test Assigned"
  | "Test Passed"
  | "Test Failed"
  | "Hired"
  | "Rejected"
  | "Shortlisted"
  | "Under Review"
  testId?: mongoose.Types.ObjectId
  testScore?: number
  testAnswers?: Array<{
    questionId: string
    answer: string
  }>
  testCompletedAt?: Date
  // Assessment results fields
  startedAt?: Date
  completedAt?: Date
  score?: number
  answers?: Array<{
    questionId: string
    answer: string
    isCorrect?: boolean
    points?: number
  }>
  timeSpent?: number
  proctoringData?: any
  candidateReview?: {
    rating: number
    comment?: string
    submittedAt: Date
  }
  applicationDate: Date
  notes?: string
  appliedAt: Date
  updatedAt: Date
  screeningAnswers?: Array<{ question: string; answer: string }>
  applicationProfile?: {
    experienceLevel?: string
    expectedSalary?: string
    location?: string
    skills?: string[]
  }
  // AI screening fields
  aiMatchScore?: number
  atsScore?: number
  skillsMatched?: string[]
  missingSkills?: string[]
  aiExplanation?: string
  shortlisted?: boolean
  rejectionReason?: string
}

const ApplicationSchema = new Schema<IApplication>(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: "JobDescription",
    },
    jobDescriptionId: {
      type: Schema.Types.ObjectId,
      ref: "JobDescription",
      required: true,
    },
    jobSeekerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resumeId: {
      type: Schema.Types.ObjectId,
      ref: "Resume",
    },
    assessmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assessment",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "reviewed",
        "test_assigned",
        "test_completed",
        "interview",
        "hired",
        "rejected",
        "assigned",
        "Assessment Assigned",
        "Assessment Completed",
        "Pending",
        "Reviewed",
        "Interview Scheduled",
        "Test Assigned",
        "Test Passed",
        "Test Failed",
        "Hired",
        "Rejected",
        "Shortlisted",
        "Under Review",
      ],
      default: "Pending",
    },
    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
    },
    testScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    testAnswers: [
      {
        questionId: String,
        answer: String,
      },
    ],
    testCompletedAt: {
      type: Date,
    },
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
    },
    screeningAnswers: [
      {
        question: String,
        answer: String,
      },
    ],
    applicationProfile: {
      experienceLevel: String,
      expectedSalary: String,
      location: String,
      skills: [String],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    // Optional indices-friendly subdocs
    answers: [
      {
        questionId: String,
        answer: String,
        isCorrect: Boolean,
        points: Number,
      },
    ],
    proctoringData: Schema.Types.Mixed,
    candidateReview: {
      rating: Number,
      comment: String,
      submittedAt: Date,
    },
    // AI screening results
    aiMatchScore: { type: Number, min: 0, max: 100 },
    atsScore: { type: Number, min: 0, max: 100 },
    skillsMatched: [String],
    missingSkills: [String],
    aiExplanation: { type: String },
    shortlisted: { type: Boolean, default: false },
    rejectionReason: { type: String },
  },
  {
    timestamps: true,
  },
)

// Helpful indexes for recruiter queries and shortlisting performance
ApplicationSchema.index({ jobDescriptionId: 1, status: 1 })
ApplicationSchema.index({ jobDescriptionId: 1, shortlisted: 1, aiMatchScore: -1 })
ApplicationSchema.index({ jobSeekerId: 1, jobDescriptionId: 1 })

export default mongoose.models.Application || mongoose.model<IApplication>("Application", ApplicationSchema)
