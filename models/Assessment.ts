import mongoose, { Schema, type Document } from "mongoose"

export interface IAssessment extends Document {
  _id: string
  title: string
  description?: string
  durationMinutes: number
  totalQuestions: number
  totalPoints: number
  passingScore: number
  difficulty: "Easy" | "Medium" | "Hard"
  status: "Active" | "Draft" | "Archived"
  requiresProctoring: boolean
  securityFeatures: string[]
  questions: IQuestion[]
  settings: IAssessmentSettings
  createdBy: string
  createdAt: Date
  updatedAt: Date
  candidatesAssigned: number
  candidatesCompleted: number
  assignedCandidates: Array<{
    candidateId: mongoose.Types.ObjectId;
    candidateEmail: string;
    candidateName: string;
    assignedAt: Date;
    scheduledDate?: Date;
    testToken?: string;
    status: "assigned" | "started" | "completed" | "expired";
  }>
}

export interface IQuestion {
  questionId: string
  questionText: string
  type: "multiple_choice" | "short_answer" | "code_snippet" | "video_response"
  options?: string[]
  correctAnswer: string
  points: number
  difficulty: "Easy" | "Medium" | "Hard"
  timeLimit?: number
  tags?: string[]
  hint?: string
  examples?: Array<{ input: string; output: string; explanation?: string }>
  testCases?: Array<{ id: string; input: string; expectedOutput: string; description?: string; isHidden?: boolean }>
  explanation?: string
}

export interface IAssessmentSettings {
  randomizeQuestions: boolean
  randomizeAnswers: boolean
  allowReview: boolean
  showResults: boolean
  autoSubmit: boolean
  preventCopyPaste: boolean
  fullScreenMode: boolean
}

const QuestionSchema = new Schema<IQuestion>({
  questionId: { type: String, required: true },
  questionText: { type: String, required: true },
  type: {
    type: String,
    enum: ["multiple_choice", "short_answer", "code_snippet", "video_response"],
    required: true,
  },
  options: [String],
  correctAnswer: { type: String, required: true },
  points: { type: Number, required: true, min: 1 },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    required: true,
  },
  timeLimit: { type: Number, min: 1 },
  tags: [String],
  hint: String,
  examples: [{
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: String
  }],
  testCases: [{
    id: { type: String, required: true },
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    description: String,
    isHidden: { type: Boolean, default: false }
  }],
  explanation: String,
})

const AssessmentSettingsSchema = new Schema<IAssessmentSettings>({
  randomizeQuestions: { type: Boolean, default: true },
  randomizeAnswers: { type: Boolean, default: true },
  allowReview: { type: Boolean, default: false },
  showResults: { type: Boolean, default: true },
  autoSubmit: { type: Boolean, default: true },
  preventCopyPaste: { type: Boolean, default: true },
  fullScreenMode: { type: Boolean, default: true },
})

const AssessmentSchema = new Schema<IAssessment>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: false, default: "" },
    durationMinutes: { type: Number, required: true, min: 1 },
    totalQuestions: { type: Number, required: true, min: 1 },
    totalPoints: { type: Number, required: true, min: 1 },
    passingScore: { type: Number, required: true, min: 0, max: 100 },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Draft", "Archived"],
      default: "Draft",
    },
    requiresProctoring: { type: Boolean, default: true },
    securityFeatures: [String],
    questions: [QuestionSchema],
    settings: { type: AssessmentSettingsSchema, required: true },
    createdBy: { type: String, required: true },
    candidatesAssigned: { type: Number, default: 0 },
    candidatesCompleted: { type: Number, default: 0 },
    assignedCandidates: [{
      candidateId: { type: Schema.Types.ObjectId, ref: "User" },
      candidateEmail: { type: String, required: true, trim: true },
      candidateName: { type: String, required: true, trim: true },
      assignedAt: { type: Date, default: Date.now },
      scheduledDate: { type: Date },
      testToken: { type: String, trim: true },
      status: {
        type: String,
        enum: ["assigned", "started", "completed", "expired"],
        default: "assigned"
      }
    }],
  },
  {
    timestamps: true,
  },
)

// Indexes for performance
AssessmentSchema.index({ createdBy: 1, status: 1 })
AssessmentSchema.index({ title: "text", description: "text" })

export default mongoose.models.Assessment || mongoose.model<IAssessment>("Assessment", AssessmentSchema)
