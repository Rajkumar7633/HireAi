import mongoose, { Schema, type Document } from "mongoose"

export interface IJobDescription extends Document {
  title: string
  description: string
  skillsRequired: string[]
  requirements: string[]
  responsibilities: string[]
  recruiterId: mongoose.Types.ObjectId
  companyId?: mongoose.Types.ObjectId
  location: string
  salary: string
  jobType: string
  employmentType: string
  experience: string
  experienceLevel?: string
  remotePolicy?: string
  visaSponsorship?: boolean
  benefits?: string[]
  screeningQuestions?: string[]
  applicationMode?: "resume_only" | "resume_plus_form" | "form_only"
  isActive: boolean
  status: string
  postedDate: Date
  createdAt: Date
  updatedAt: Date
  // AI shortlisting per-job overrides
  aiShortlistThreshold?: number
  aiMinAtsScore?: number
}

const JobDescriptionSchema = new Schema<IJobDescription>(
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
    skillsRequired: [
      {
        type: String,
        trim: true,
      },
    ],
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
    recruiterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: false,
      index: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    salary: {
      type: String,
      required: true,
      trim: true,
    },
    jobType: {
      type: String,
      enum: ["full-time", "part-time", "contract", "internship"],
      required: true,
    },
    employmentType: {
      type: String,
      required: true,
      trim: true,
    },
    experience: {
      type: String,
      required: true,
      trim: true,
    },
    experienceLevel: {
      type: String,
      enum: ["Intern", "Junior", "Mid", "Senior", "Lead", "Manager"],
      required: false,
    },
    remotePolicy: {
      type: String,
      enum: ["Onsite", "Hybrid", "Remote"],
      required: false,
    },
    visaSponsorship: {
      type: Boolean,
      default: false,
    },
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    screeningQuestions: [
      {
        type: String,
        trim: true,
      },
    ],
    applicationMode: {
      type: String,
      enum: ["resume_only", "resume_plus_form", "form_only"],
      default: "resume_plus_form",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
    },
    postedDate: {
      type: Date,
      default: Date.now,
    },
    aiShortlistThreshold: {
      type: Number,
      min: 0,
      max: 100,
      required: false,
    },
    aiMinAtsScore: {
      type: Number,
      min: 0,
      max: 100,
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.JobDescription || mongoose.model<IJobDescription>("JobDescription", JobDescriptionSchema)
