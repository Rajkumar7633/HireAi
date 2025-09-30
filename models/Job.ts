import mongoose, { type Document, Schema } from "mongoose"

export interface IJob extends Document {
  _id: string
  title: string
  company: string
  description: string
  requirements: string[]
  responsibilities: string[]
  skills: string[]
  location: string
  locationType: "remote" | "hybrid" | "onsite"
  employmentType: "full-time" | "part-time" | "contract" | "internship"
  experienceLevel: "entry" | "mid" | "senior" | "executive"
  salaryRange: {
    min: number
    max: number
    currency: string
  }
  benefits: string[]
  postedBy: mongoose.Types.ObjectId
  status: "draft" | "active" | "paused" | "closed"
  applicationDeadline?: Date
  startDate?: Date
  createdAt: Date
  updatedAt: Date
}

const JobSchema = new Schema<IJob>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    responsibilities: [
      {
        type: String,
        trim: true,
      },
    ],
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      type: String,
      required: true,
      trim: true,
    },
    locationType: {
      type: String,
      enum: ["remote", "hybrid", "onsite"],
      default: "onsite",
    },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "internship"],
      default: "full-time",
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "executive"],
      default: "mid",
    },
    salaryRange: {
      min: {
        type: Number,
        default: 0,
      },
      max: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
    },
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "closed"],
      default: "draft",
    },
    applicationDeadline: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
JobSchema.index({ status: 1, createdAt: -1 })
JobSchema.index({ postedBy: 1, status: 1 })
JobSchema.index({ skills: 1 })
JobSchema.index({ location: 1 })
JobSchema.index({ experienceLevel: 1 })

// Virtual for application count (if needed)
JobSchema.virtual("applicationCount", {
  ref: "Application",
  localField: "_id",
  foreignField: "jobId",
  count: true,
})

const Job = mongoose.models.Job || mongoose.model<IJob>("Job", JobSchema)

export default Job
