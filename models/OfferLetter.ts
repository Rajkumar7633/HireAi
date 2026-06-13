import mongoose, { Schema, type Document } from "mongoose"

export interface IOfferLetter extends Document {
  applicationId?: mongoose.Types.ObjectId
  candidateId: mongoose.Types.ObjectId
  recruiterId: mongoose.Types.ObjectId
  jobId?: mongoose.Types.ObjectId
  templateId?: string
  offerDetails: {
    position: string
    department: string
    startDate?: Date
    employmentType: "Full-time" | "Part-time" | "Contract" | "Internship"
    reportingTo?: string
    workLocation?: string
    workArrangement: "On-site" | "Remote" | "Hybrid"
    jobLevel?: string
    jobCode?: string
  }
  compensation: {
    baseSalary: number
    currency: string
    salaryPeriod: "Annual" | "Monthly" | "Hourly"
    bonus?: number
    bonusType?: string
    signingBonus?: number
    equity?: {
      granted: boolean
      type?: string
      quantity?: number
      vestingSchedule?: string
      strikePrice?: number
    }
    benefits: string[]
    relocation?: {
      included: boolean
      amount?: number
      details?: string
    }
  }
  terms: {
    probationPeriod: number
    noticePeriod: number
    workingHours?: string
    vacationDays: number
    sickDays?: number
    otherTerms?: string
    backgroundCheckRequired?: boolean
    ndaRequired?: boolean
    nonCompete?: boolean
  }
  customContent: {
    greeting?: string
    introduction?: string
    additionalTerms?: string
    closing?: string
  }
  approvalRequired: boolean
  approvalStatus?: "Pending" | "Approved" | "Rejected"
  approvedBy?: mongoose.Types.ObjectId
  approvedAt?: Date
  status: "Draft" | "Pending Approval" | "Sent" | "Viewed" | "Accepted" | "Rejected" | "Expired" | "Withdrawn"
  sentAt?: Date
  viewedAt?: Date
  respondedAt?: Date
  expiresAt?: Date
  reminderSentAt?: Date
  signature: {
    candidateSigned: boolean
    candidateSignature?: string
    candidateSignedAt?: Date
    recruiterSigned: boolean
    recruiterSignature?: string
    recruiterSignedAt?: Date
  }
  history: Array<{
    action: string
    performedBy: mongoose.Types.ObjectId
    timestamp: Date
    details?: Record<string, unknown>
  }>
  notes?: string
  internalNotes?: string
  createdAt: Date
  updatedAt: Date
}

const OfferLetterSchema = new Schema<IOfferLetter>(
  {
    applicationId: { type: Schema.Types.ObjectId, ref: "Application" },
    candidateId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "JobDescription" },
    templateId: String,
    offerDetails: {
      position: { type: String, default: "" },
      department: { type: String, default: "" },
      startDate: Date,
      employmentType: {
        type: String,
        enum: ["Full-time", "Part-time", "Contract", "Internship"],
        default: "Full-time",
      },
      reportingTo: String,
      workLocation: String,
      workArrangement: {
        type: String,
        enum: ["On-site", "Remote", "Hybrid"],
        default: "On-site",
      },
      jobLevel: String,
      jobCode: String,
    },
    compensation: {
      baseSalary: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      salaryPeriod: {
        type: String,
        enum: ["Annual", "Monthly", "Hourly"],
        default: "Annual",
      },
      bonus: Number,
      bonusType: String,
      signingBonus: Number,
      equity: {
        granted: Boolean,
        type: String,
        quantity: Number,
        vestingSchedule: String,
        strikePrice: Number,
      },
      benefits: [String],
      relocation: {
        included: Boolean,
        amount: Number,
        details: String,
      },
    },
    terms: {
      probationPeriod: { type: Number, default: 3 },
      noticePeriod: { type: Number, default: 30 },
      workingHours: { type: String, default: "40 hours/week" },
      vacationDays: { type: Number, default: 20 },
      sickDays: { type: Number, default: 10 },
      otherTerms: String,
      backgroundCheckRequired: Boolean,
      ndaRequired: Boolean,
      nonCompete: Boolean,
    },
    customContent: {
      greeting: String,
      introduction: String,
      additionalTerms: String,
      closing: String,
    },
    approvalRequired: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    status: {
      type: String,
      enum: ["Draft", "Pending Approval", "Sent", "Viewed", "Accepted", "Rejected", "Expired", "Withdrawn"],
      default: "Draft",
    },
    sentAt: Date,
    viewedAt: Date,
    respondedAt: Date,
    expiresAt: Date,
    reminderSentAt: Date,
    signature: {
      candidateSigned: { type: Boolean, default: false },
      candidateSignature: String,
      candidateSignedAt: Date,
      recruiterSigned: { type: Boolean, default: false },
      recruiterSignature: String,
      recruiterSignedAt: Date,
    },
    history: [
      {
        action: String,
        performedBy: { type: Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        details: Schema.Types.Mixed,
      },
    ],
    notes: String,
    internalNotes: String,
  },
  { timestamps: true }
)

if (mongoose.models.OfferLetter) {
  delete mongoose.models.OfferLetter
}

export default mongoose.model<IOfferLetter>("OfferLetter", OfferLetterSchema)
