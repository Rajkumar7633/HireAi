import mongoose, { Schema, type Document } from "mongoose"

export interface IQuestion {
  question: string
  type: "multiple-choice" | "text" | "coding"
  options?: string[]
  correctAnswer?: string | number
  points: number
}

export interface ITest extends Document {
  title: string
  description: string
  questions: IQuestion[]
  timeLimit: number // in minutes
  passingScore: number
  createdBy: mongoose.Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const QuestionSchema = new Schema<IQuestion>({
  question: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["multiple-choice", "text", "coding"],
    required: true,
  },
  options: [
    {
      type: String,
    },
  ],
  correctAnswer: {
    type: Schema.Types.Mixed,
  },
  points: {
    type: Number,
    required: true,
    min: 1,
  },
})

const TestSchema = new Schema<ITest>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    questions: [QuestionSchema],
    timeLimit: {
      type: Number,
      required: true,
      min: 5,
    },
    passingScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.Test || mongoose.model<ITest>("Test", TestSchema)
