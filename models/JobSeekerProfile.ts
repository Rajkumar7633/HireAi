import mongoose, { Schema, type Document } from "mongoose"

export interface IJobSeekerProfile extends Document {
  userId: mongoose.Types.ObjectId

  // Personal Information
  firstName: string
  lastName: string
  email: string
  phone?: string
  location: string
  profileImage?: string

  // Professional Information
  currentTitle: string
  experienceLevel: string
  industry: string
  skills: string[]
  yearsOfExperience: number

  // Education
  education: string
  university?: string
  graduationYear?: string
  gpa?: string

  // Online Presence
  linkedinUrl?: string
  portfolioUrl?: string
  githubUrl?: string

  // Career Goals
  desiredRole: string
  salaryExpectation?: string
  workPreference: string
  summary?: string

  // Portfolio
  projects?: Array<{
    title: string
    description?: string
    tags?: string[]
    link?: string
  }>
  achievements?: string[]

  // Work Experience
  experiences?: Array<{
    company: string
    role: string
    startDate: string
    endDate?: string
    current?: boolean
    description?: string
  }>

  // Profile Metrics
  profileCompleteness: number
  atsScore: number
  skillsVerified: number
  lastUpdated: Date

  createdAt: Date
  updatedAt: Date
}

const JobSeekerProfileSchema = new Schema<IJobSeekerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Personal Information
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    profileImage: String,

    // Professional Information
    currentTitle: {
      type: String,
      trim: true,
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "lead", "executive"],
      default: "entry",
    },
    industry: {
      type: String,
      trim: true,
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
    yearsOfExperience: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Education
    education: {
      type: String,
      enum: ["high-school", "associate", "bachelor", "master", "phd", "other", ""],
    },
    university: {
      type: String,
      trim: true,
    },
    graduationYear: {
      type: String,
      trim: true,
    },
    gpa: {
      type: String,
      trim: true,
    },

    // Online Presence
    linkedinUrl: {
      type: String,
      trim: true,
    },
    portfolioUrl: {
      type: String,
      trim: true,
    },
    githubUrl: {
      type: String,
      trim: true,
    },

    // Career Goals
    desiredRole: {
      type: String,
      trim: true,
    },
    salaryExpectation: {
      type: String,
      trim: true,
    },
    workPreference: {
      type: String,
      enum: ["remote", "hybrid", "onsite", "flexible", ""],
      default: "remote",
    },
    summary: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // Portfolio
    projects: {
      type: [
        new Schema(
          {
            title: { type: String, required: true, trim: true },
            description: { type: String, trim: true },
            tags: { type: [String], default: [] },
            link: { type: String, trim: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    achievements: { type: [String], default: [] },

    // Work Experience
    experiences: {
      type: [
        new Schema(
          {
            company: { type: String, required: true, trim: true },
            role: { type: String, required: true, trim: true },
            startDate: { type: String, required: true, trim: true },
            endDate: { type: String, trim: true },
            current: { type: Boolean, default: false },
            description: { type: String, trim: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    // Profile Metrics
    profileCompleteness: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    atsScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    skillsVerified: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Index for faster queries
JobSeekerProfileSchema.index({ userId: 1 })
JobSeekerProfileSchema.index({ email: 1 })

export default mongoose.models.JobSeekerProfile ||
  mongoose.model<IJobSeekerProfile>("JobSeekerProfile", JobSeekerProfileSchema)
