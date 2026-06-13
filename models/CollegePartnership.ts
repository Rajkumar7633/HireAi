import mongoose, { Schema, Document } from "mongoose"

export interface ICollegePartnership extends Document {
  collegeId: string
  companyName: string
  recruiterId?: string
  partnershipType: "Placement" | "Internship" | "Training" | "Campus Drive"
  agreementDetails?: string
  status: "Active" | "Inactive" | "Pending" | "Terminated"
  startDate?: Date
  endDate?: Date
  drivesConducted: number
  studentsPlaced: number
  totalPackageValue: number
}

const CollegePartnershipSchema = new Schema<ICollegePartnership>(
  {
    collegeId: { type: String, required: true, index: true },
    companyName: { type: String, required: true, trim: true },
    recruiterId: { type: String },
    partnershipType: {
      type: String,
      enum: ["Placement", "Internship", "Training", "Campus Drive"],
      default: "Placement",
    },
    agreementDetails: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Pending", "Terminated"],
      default: "Pending",
    },
    startDate: { type: Date },
    endDate: { type: Date },
    drivesConducted: { type: Number, default: 0 },
    studentsPlaced: { type: Number, default: 0 },
    totalPackageValue: { type: Number, default: 0 },
  },
  { timestamps: true }
)

CollegePartnershipSchema.index({ collegeId: 1, status: 1 })

export const CollegePartnership =
  mongoose.models.CollegePartnership ||
  mongoose.model<ICollegePartnership>("CollegePartnership", CollegePartnershipSchema)
