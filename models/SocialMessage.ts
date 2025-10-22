import mongoose, { Schema, type Document } from "mongoose";

export interface ISocialMessage extends Document {
  conversationId: mongoose.Types.ObjectId | string;
  senderId: mongoose.Types.ObjectId | string;
  text: string;
  createdAt: Date;
}

const SocialMessageSchema = new Schema<ISocialMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "SocialConversation", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SocialMessageSchema.index({ conversationId: 1, createdAt: -1 });

export default mongoose.models.SocialMessage ||
  mongoose.model<ISocialMessage>("SocialMessage", SocialMessageSchema);
