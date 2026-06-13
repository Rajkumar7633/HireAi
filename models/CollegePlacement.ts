import mongoose, { Schema, Document } from "mongoose"

export interface ICollegePlacement extends Document {
  collegeId: string
  studentId: mongoose.Types.ObjectId
  driveId?: mongoose.Types.ObjectId
  companyName: string
  recruiterId?: string
  jobTitle: string
  jobDescription?: string
  package: number
  packageType: string
  currency: string
  location?: string
  offerDate?: Date
  joiningDate?: Date
  placementType: string
  offerStatus: "Accepted" | "Rejected" | "Pending" | "Deferred"
}

const CollegePlacementSchema = new Schema<ICollegePlacement>(
  {
    collegeId: { type: String, required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    driveId: { type: Schema.Types.ObjectId, ref: "CampusDrive" },
    companyName: { type: String, required: true, trim: true },
    recruiterId: { type: String },
    jobTitle: { type: String, required: true, trim: true },
    jobDescription: { type: String, default: "" },
    package: { type: Number, default: 0 },
    packageType: { type: String, default: "CTC" },
    currency: { type: String, default: "INR" },
    location: { type: String, default: "" },
    offerDate: { type: Date },
    joiningDate: { type: Date },
    placementType: { type: String, default: "Campus Placement" },
    offerStatus: {
      type: String,
      enum: ["Accepted", "Rejected", "Pending", "Deferred"],
      default: "Pending",
    },
  },
  { timestamps: true }
)

CollegePlacementSchema.index({ collegeId: 1, offerStatus: 1 })
CollegePlacementSchema.index({ studentId: 1 })

export const CollegePlacement =
  mongoose.models.CollegePlacement ||
  mongoose.model<ICollegePlacement>("CollegePlacement", CollegePlacementSchema)
