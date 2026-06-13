import mongoose, { Schema, type Document } from "mongoose"

export type VerificationStatus = "Pending" | "In Progress" | "Completed" | "Failed" | "Cancelled"
export type ComponentStatus = "Pending" | "Verified" | "Failed" | "Not Required"
export type OverallResult = "Clear" | "Consider" | "Adverse" | "Pending"
export type RiskLevel = "Low" | "Medium" | "High"
export type VerificationProvider = "Checkr" | "Hireright" | "Sterling" | "GoodHire" | "Manual"

export const VERIFICATION_COMPONENTS = [
  "identity",
  "education",
  "employment",
  "criminal",
  "drug",
  "reference",
] as const

export type VerificationComponentKey = typeof VERIFICATION_COMPONENTS[number]

export interface IVerificationComponent {
  status: ComponentStatus
  verifiedAt?: Date
  result?: unknown
  notes?: string
}

export interface IBackgroundVerification extends Document {
  candidateId: mongoose.Types.ObjectId
  applicationId: mongoose.Types.ObjectId
  recruiterId: mongoose.Types.ObjectId
  provider: VerificationProvider
  providerReferenceId?: string
  status: VerificationStatus
  components: Record<VerificationComponentKey, IVerificationComponent>
  overallResult?: OverallResult
  riskLevel?: RiskLevel
  reportUrl?: string
  reportGeneratedAt?: Date
  cost?: {
    amount?: number
    currency?: string
    paid?: boolean
    paidAt?: Date
  }
  initiatedAt: Date
  completedAt?: Date
  estimatedCompletion?: Date
  history: Array<{
    action: string
    performedBy: mongoose.Types.ObjectId
    timestamp: Date
    details?: unknown
  }>
  createdAt: Date
  updatedAt: Date
}

const componentSchema = {
  status: {
    type: String,
    enum: ["Pending", "Verified", "Failed", "Not Required"],
    default: "Pending",
  },
  verifiedAt: Date,
  result: Schema.Types.Mixed,
  notes: String,
}

const BackgroundVerificationSchema = new Schema<IBackgroundVerification>(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    applicationId: { type: Schema.Types.ObjectId, required: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    provider: {
      type: String,
      enum: ["Checkr", "Hireright", "Sterling", "GoodHire", "Manual"],
      default: "Manual",
    },
    providerReferenceId: String,
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Failed", "Cancelled"],
      default: "Pending",
    },
    components: {
      identity: componentSchema,
      education: componentSchema,
      employment: componentSchema,
      criminal: componentSchema,
      drug: componentSchema,
      reference: componentSchema,
    },
    overallResult: {
      type: String,
      enum: ["Clear", "Consider", "Adverse", "Pending"],
    },
    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High"],
    },
    reportUrl: String,
    reportGeneratedAt: Date,
    cost: {
      amount: Number,
      currency: { type: String, default: "USD" },
      paid: Boolean,
      paidAt: Date,
    },
    initiatedAt: { type: Date, default: Date.now },
    completedAt: Date,
    estimatedCompletion: Date,
    history: [
      {
        action: String,
        performedBy: { type: Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        details: Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true },
)

BackgroundVerificationSchema.index({ recruiterId: 1, createdAt: -1 })
BackgroundVerificationSchema.index({ applicationId: 1 })
BackgroundVerificationSchema.index({ candidateId: 1 })

export default mongoose.models.BackgroundVerification ||
  mongoose.model<IBackgroundVerification>("BackgroundVerification", BackgroundVerificationSchema)
