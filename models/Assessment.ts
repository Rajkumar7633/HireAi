import mongoose, { Schema, type Document } from "mongoose"

export interface IAssessment extends Document {
  _id: string
  title: string
  description: string
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
}

export interface IQuestion {
  questionId: string
  questionText: string
  type: "multiple_choice" | "short_answer" | "code" | "video"
  options?: string[]
  correctAnswer: string
  points: number
  difficulty: "Easy" | "Medium" | "Hard"
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
    enum: ["multiple_choice", "short_answer", "code", "video"],
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
    description: { type: String, required: true },
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
  },
  {
    timestamps: true,
  },
)

// Indexes for performance
AssessmentSchema.index({ createdBy: 1, status: 1 })
AssessmentSchema.index({ title: "text", description: "text" })

export default mongoose.models.Assessment || mongoose.model<IAssessment>("Assessment", AssessmentSchema)
