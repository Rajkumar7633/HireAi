import mongoose, { Schema, type Document } from "mongoose"

export interface ICompany extends Document {
  name: string
  logoUrl?: string
  description?: string
  website?: string
  brandColor?: string
  emailSignature?: string
  replyToEmail?: string
  defaultCtaUrl?: string
  ownerId: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String },
    description: { type: String },
    website: { type: String },
    brandColor: { type: String, default: "#6d28d9" },
    emailSignature: { type: String },
    replyToEmail: { type: String },
    defaultCtaUrl: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true, unique: true },
  },
  { timestamps: true },
)

export default mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema)
