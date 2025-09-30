import mongoose, { Schema, type Document } from "mongoose"

export interface IUser extends Document {
  name: string
  email: string
  passwordHash: string
  role: "job_seeker" | "recruiter" | "admin"
  phone?: string
  address?: string
  profileImage?: string
  companyName?: string
  companyLogo?: string
  companyDescription?: string
  website?: string
  linkedinUrl?: string
  twitterUrl?: string
  professionalSummary?: string
  businessLocation?: string
  isProfileComplete?: boolean
  lastManualUpdate?: string
  // Talent Pool scoring fields
  // Candidate profile fields
  skills?: string[]
  yearsOfExperience?: number
  projects?: Array<{
    title: string
    description?: string
    tags?: string[]
    link?: string
  }>
  achievements?: string[]
  // Scoring caches
  profileScore?: number
  scores?: {
    projects?: number
    experience?: number
    skills?: number
    coding?: number
    achievements?: number
    completeness?: number
    recency?: number
    total?: number
  }
  scoreVersion?: number
  lastScoreComputedAt?: Date
  createdAt: Date
  updatedAt: Date
  // Onboarding
  onboardingCompleted?: boolean
  onboardingSteps?: {
    profile?: boolean
    branding?: boolean
    firstJob?: boolean
    inviteTeam?: boolean
  }
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["job_seeker", "recruiter", "admin"],
      required: true,
    },
    phone: String,
    address: String,
    profileImage: String,
    companyName: String,
    companyLogo: String,
    companyDescription: String,
    website: String,
    linkedinUrl: String,
    twitterUrl: String,
    professionalSummary: String,
    businessLocation: String,
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    lastManualUpdate: String,
    // Candidate profile fields
    skills: { type: [String], default: [] },
    yearsOfExperience: { type: Number, default: 0 },
    projects: {
      type: [
        new Schema(
          {
            title: { type: String, required: true },
            description: { type: String },
            tags: { type: [String], default: [] },
            link: { type: String },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    achievements: { type: [String], default: [] },
    // Talent Pool scoring fields
    profileScore: {
      type: Number,
      default: 0,
      index: true,
      min: 0,
      max: 100,
    },
    scores: {
      projects: { type: Number, default: 0 },
      experience: { type: Number, default: 0 },
      skills: { type: Number, default: 0 },
      coding: { type: Number, default: 0 },
      achievements: { type: Number, default: 0 },
      completeness: { type: Number, default: 0 },
      recency: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    scoreVersion: { type: Number, default: 1 },
    lastScoreComputedAt: { type: Date },
    // Onboarding flags
    onboardingCompleted: { type: Boolean, default: false },
    onboardingSteps: {
      profile: { type: Boolean, default: false },
      branding: { type: Boolean, default: false },
      firstJob: { type: Boolean, default: false },
      inviteTeam: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
