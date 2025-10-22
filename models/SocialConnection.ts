import mongoose, { Schema, type Document } from "mongoose";

export interface ISocialConnection extends Document {
  requesterId: mongoose.Types.ObjectId | string;
  addresseeId: mongoose.Types.ObjectId | string;
  status: "pending" | "accepted" | "blocked";
  createdAt: Date;
  updatedAt: Date;
}

const SocialConnectionSchema = new Schema<ISocialConnection>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    addresseeId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["pending", "accepted", "blocked"], default: "pending", index: true },
  },
  { timestamps: true },
);

SocialConnectionSchema.index({ requesterId: 1, addresseeId: 1 }, { unique: true });

export default mongoose.models.SocialConnection ||
  mongoose.model<ISocialConnection>("SocialConnection", SocialConnectionSchema);
