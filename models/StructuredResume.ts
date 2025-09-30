import mongoose, { Schema, type Document } from "mongoose"

export interface IStructuredResume extends Document {
  userId: mongoose.Types.ObjectId
  personalInfo: {
    name?: string
    email?: string
    phone?: string
    linkedin?: string
    github?: string
    portfolio?: string
    address?: string
  }
  summary?: string
  experience: Array<{
    title?: string
    company?: string
    location?: string
    startDate?: Date
    endDate?: Date
    description?: string[]
  }>
  education: Array<{
    degree?: string
    major?: string
    institution?: string
    location?: string
    startDate?: Date
    endDate?: Date
  }>
  skills: string[]
  projects: Array<{
    title?: string
    description?: string
    technologies?: string[]
    url?: string
  }>
  certifications: Array<{
    name?: string
    issuer?: string
    issueDate?: Date
  }>
  awards: Array<{
    name?: string
    date?: Date
    description?: string
  }>
  languages: string[]
  interests: string[]
  createdAt: Date
  lastUpdated: Date
}

const StructuredResumeSchema = new Schema<IStructuredResume>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    personalInfo: {
      name: String,
      email: String,
      phone: String,
      linkedin: String,
      github: String,
      portfolio: String,
      address: String,
    },
    summary: String,
    experience: [
      {
        title: String,
        company: String,
        location: String,
        startDate: Date,
        endDate: Date,
        description: [String],
      },
    ],
    education: [
      {
        degree: String,
        major: String,
        institution: String,
        location: String,
        startDate: Date,
        endDate: Date,
      },
    ],
    skills: [String],
    projects: [
      {
        title: String,
        description: String,
        technologies: [String],
        url: String,
      },
    ],
    certifications: [
      {
        name: String,
        issuer: String,
        issueDate: Date,
      },
    ],
    awards: [
      {
        name: String,
        date: Date,
        description: String,
      },
    ],
    languages: [String],
    interests: [String],
    createdAt: {
      type: Date,
      default: Date.now,
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

export default mongoose.models.StructuredResume ||
  mongoose.model<IStructuredResume>("StructuredResume", StructuredResumeSchema)
