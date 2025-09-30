import mongoose, { Schema, type Document } from "mongoose"

export interface IResume extends Document {
  userId: mongoose.Types.ObjectId
  fileName: string
  fileUrl?: string
  rawText: string
  parsedSkills: string[]
  experience: string
  education: string
  uploadedAt: Date
  atsScore?: number
  analysis?: {
    strengths?: string[]
    improvements?: string[]
    keywordDensity?: Record<string, number>
  }
  extractedData?: {
    name?: string
    email?: string
    phone?: string
    skills?: string[]
    experience?: Array<{
      title?: string
      company?: string
      duration?: string
    }>
    education?: Array<{
      degree?: string
      school?: string
      year?: string
    }>
  }
  status: "processing" | "processed" | "error"
  size?: number
  mimeType?: string
}

const ResumeSchema = new Schema<IResume>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    parsedSkills: [
      {
        type: String,
        trim: true,
      },
    ],
    experience: {
      type: String,
      default: "",
    },
    education: {
      type: String,
      default: "",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    atsScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    analysis: {
      strengths: [String],
      improvements: [String],
      keywordDensity: {
        type: Map,
        of: Number,
      },
    },
    extractedData: {
      name: String,
      email: String,
      phone: String,
      skills: [String],
      experience: [
        {
          title: String,
          company: String,
          duration: String,
        },
      ],
      education: [
        {
          degree: String,
          school: String,
          year: String,
        },
      ],
    },
    status: {
      type: String,
      enum: ["processing", "processed", "error"],
      default: "processing",
    },
    size: Number,
    mimeType: String,
  },
  {
    timestamps: true,
  },
)

export default mongoose.models.Resume || mongoose.model<IResume>("Resume", ResumeSchema)
