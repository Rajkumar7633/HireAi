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
  | "in_progress"
  | "Hired"
  | "Rejected"
  | "Shortlisted"
  | "Under Review"
  | "Offer"
  testId?: mongoose.Types.ObjectId
  testAssignedAt?: Date
  testScore?: number
  testAnswers?: Array<{
    questionId: string
    answer: string
    language?: string
  }>
  testCompletedAt?: Date
  // Assessment results fields
  score?: number
  startedAt?: Date
  completedAt?: Date
  timeSpent?: number
  answers?: Array<{
    questionId: string
    answer: string
    isCorrect?: boolean
    points?: number
  }>
  proctoringData?: any
  proctoringFlags?: {
    multiFaceCount?: number
    noFaceLongest?: number
    tabSwitchCount?: number
  }
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
  // Multi-round hiring workflow
  currentStage?: string
  rounds?: Array<{
    roundName?: string
    stageKey?: string
    testId?: mongoose.Types.ObjectId
    submissions?: mongoose.Types.ObjectId[]
    status?: "pending" | "in_progress" | "passed" | "failed" | "skipped" | "completed"
    latestScore?: number
    notes?: string
  }>
  interviewFeedback?: string
  interviewRating?: number
  interviewDate?: Date
  videoInterviewSummaries?: Array<{
    interviewId?: string
    completedAt?: Date
    rating?: number
    overallScore?: number
    technicalScore?: number
    communicationScore?: number
    codingScore?: number
    nextStep?: string
    summary?: string
    strengths?: string
    concerns?: string
    candidateRating?: number
  }>
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
    },
    jobSeekerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
        "in_progress",
        "Hired",
        "Rejected",
        "Shortlisted",
        "Under Review",
        "Offer",
      ],
      default: "Pending",
    },
    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
    },
    testAssignedAt: {
      type: Date,
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
        language: String,
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
    // Assessment result fields — must be in schema so Mongoose strict mode doesn't drop them
    score: { type: Number, min: 0, max: 100 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    timeSpent: { type: Number, default: 0 },
    answers: [
      {
        questionId: String,
        answer: String,
        isCorrect: Boolean,
        points: Number,
      },
    ],
    proctoringData: Schema.Types.Mixed,
    proctoringFlags: {
      multiFaceCount: { type: Number, default: 0 },
      noFaceLongest: { type: Number, default: 0 },
      tabSwitchCount: { type: Number, default: 0 },
    },
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
    // Multi-round hiring workflow
    currentStage: {
      type: String,
      default: "application",
    },
    rounds: [
      {
        roundName: String,
        stageKey: String,
        testId: {
          type: Schema.Types.ObjectId,
          ref: "Test",
        },
        submissions: [
          {
            type: Schema.Types.ObjectId,
            ref: "TestSubmission",
          },
        ],
        status: {
          type: String,
          enum: ["pending", "in_progress", "passed", "failed", "skipped", "completed"],
          default: "pending",
        },
        latestScore: Number,
        notes: String,
      },
    ],
    interviewFeedback: { type: String },
    interviewRating: { type: Number, min: 1, max: 10 },
    interviewDate: { type: Date },
    videoInterviewSummaries: [
      {
        interviewId: String,
        completedAt: Date,
        rating: Number,
        overallScore: Number,
        technicalScore: Number,
        communicationScore: Number,
        codingScore: Number,
        nextStep: String,
        summary: String,
        strengths: String,
        concerns: String,
        candidateRating: Number,
      },
    ],
  },
  {
    timestamps: true,
  },
)

// Helpful indexes for recruiter queries and shortlisting performance
ApplicationSchema.index({ jobDescriptionId: 1, status: 1 })
ApplicationSchema.index({ jobDescriptionId: 1, shortlisted: 1, aiMatchScore: -1 })
ApplicationSchema.index({ jobSeekerId: 1, jobDescriptionId: 1 })
ApplicationSchema.index({ assessmentId: 1 })
ApplicationSchema.index({ assessmentId: 1, status: 1 })

export default mongoose.models.Application || mongoose.model<IApplication>("Application", ApplicationSchema)
