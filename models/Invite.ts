import mongoose, { Schema, type Document } from "mongoose";

export interface IInvite extends Document {
  email: string;
  role: "recruiter" | "viewer" | "admin";
  inviterId: mongoose.Types.ObjectId;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<IInvite>({
  email: { type: String, required: true, index: true },
  role: { type: String, enum: ["recruiter", "viewer", "admin"], default: "recruiter" },
  inviterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ["pending", "accepted", "expired", "revoked"], default: "pending" },
  acceptedAt: { type: Date },
}, { timestamps: true });

export default mongoose.models.Invite || mongoose.model<IInvite>("Invite", InviteSchema);
