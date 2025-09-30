import mongoose, { Schema, type Document } from "mongoose"

export interface IAssessmentResult extends Document {
  assessmentId: string
  candidateId: string
  applicationId?: string
  score: number
  maxScore: number
  percentage: number
  passed: boolean
  startedAt: Date
  completedAt?: Date
  duration: number
  answers: IAnswer[]
  proctoringData: IProctoringData
  status: "In Progress" | "Completed" | "Abandoned" | "Flagged"
}

export interface IAnswer {
  questionId: string
  answer: string
  isCorrect: boolean
  points: number
  timeSpent: number
}

export interface IProctoringData {
  integrityScore: number
  violations: {
    tabSwitches: number
    faceLost: number
    multipleFaces: number
    audioAnomalies: number
    suspiciousActivity: number
  }
  screenshots: string[]
  screenRecordings: IScreenRecording[]
  timeline: IProctoringEvent[]
  keystrokePattern: IKeystroke[]
  environmentScans: IEnvironmentScan[]
}

export interface IScreenRecording {
  timestamp: Date
  data: string
  size: number
  type: string
}

export interface IKeystroke {
  key: string
  timestamp: number
  dwellTime: number
  flightTime: number
  pressure: number
}

export interface IEnvironmentScan {
  timestamp: Date
  multipleMonitors: boolean
  suspiciousProcesses: string[]
  networkProxies: boolean
  browserExtensions: string[]
  riskScore: number
}

export interface IProctoringEvent {
  timestamp: Date
  type: string
  severity: "low" | "medium" | "high"
  message: string
  data?: any
}

const AnswerSchema = new Schema<IAnswer>({
  questionId: { type: String, required: true },
  answer: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  points: { type: Number, required: true },
  timeSpent: { type: Number, required: true },
})

const ScreenRecordingSchema = new Schema<IScreenRecording>({
  timestamp: { type: Date, required: true },
  data: { type: String, required: true },
  size: { type: Number, required: true },
  type: { type: String, required: true },
})

const KeystrokeSchema = new Schema<IKeystroke>({
  key: { type: String, required: true },
  timestamp: { type: Number, required: true },
  dwellTime: { type: Number, required: true },
  flightTime: { type: Number, required: true },
  pressure: { type: Number, required: true },
})

const EnvironmentScanSchema = new Schema<IEnvironmentScan>({
  timestamp: { type: Date, required: true },
  multipleMonitors: { type: Boolean, required: true },
  suspiciousProcesses: [String],
  networkProxies: { type: Boolean, required: true },
  browserExtensions: [String],
  riskScore: { type: Number, required: true },
})

const ProctoringEventSchema = new Schema<IProctoringEvent>({
  timestamp: { type: Date, required: true },
  type: { type: String, required: true },
  severity: {
    type: String,
    enum: ["low", "medium", "high"],
    required: true,
  },
  message: { type: String, required: true },
  data: Schema.Types.Mixed,
})

const ProctoringDataSchema = new Schema<IProctoringData>({
  integrityScore: { type: Number, required: true, min: 0, max: 100 },
  violations: {
    tabSwitches: { type: Number, default: 0 },
    faceLost: { type: Number, default: 0 },
    multipleFaces: { type: Number, default: 0 },
    audioAnomalies: { type: Number, default: 0 },
    suspiciousActivity: { type: Number, default: 0 },
  },
  screenshots: [String],
  screenRecordings: [ScreenRecordingSchema],
  timeline: [ProctoringEventSchema],
  keystrokePattern: [KeystrokeSchema],
  environmentScans: [EnvironmentScanSchema],
})

const AssessmentResultSchema = new Schema<IAssessmentResult>(
  {
    assessmentId: { type: String, required: true },
    candidateId: { type: String, required: true },
    applicationId: String,
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    percentage: { type: Number, required: true },
    passed: { type: Boolean, required: true },
    startedAt: { type: Date, required: true },
    completedAt: Date,
    duration: { type: Number, required: true },
    answers: [AnswerSchema],
    proctoringData: ProctoringDataSchema,
    status: {
      type: String,
      enum: ["In Progress", "Completed", "Abandoned", "Flagged"],
      default: "In Progress",
    },
  },
  {
    timestamps: true,
  },
)

// Indexes
AssessmentResultSchema.index({ assessmentId: 1, candidateId: 1 })
AssessmentResultSchema.index({ candidateId: 1, status: 1 })

export default mongoose.models.AssessmentResult ||
  mongoose.model<IAssessmentResult>("AssessmentResult", AssessmentResultSchema)
