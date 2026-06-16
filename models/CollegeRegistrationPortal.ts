import mongoose, { Schema, type Document } from "mongoose"

export interface ICollegeRegistrationPortal extends Document {
  collegeId: mongoose.Types.ObjectId
  token: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

const CollegeRegistrationPortalSchema = new Schema<ICollegeRegistrationPortal>(
  {
    collegeId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export default mongoose.models.CollegeRegistrationPortal ||
  mongoose.model<ICollegeRegistrationPortal>("CollegeRegistrationPortal", CollegeRegistrationPortalSchema)
