import mongoose, { Schema, type Document } from "mongoose";

export interface ISocialConversation extends Document {
  participants: Array<mongoose.Types.ObjectId | string>; // two users
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
}

const SocialConversationSchema = new Schema<ISocialConversation>(
  {
    participants: { type: [Schema.Types.ObjectId], ref: "User", required: true, index: true },
    lastMessageAt: { type: Date },
  },
  { timestamps: true },
);

SocialConversationSchema.index({ participants: 1 });
SocialConversationSchema.index({ updatedAt: -1 });

export default mongoose.models.SocialConversation ||
  mongoose.model<ISocialConversation>("SocialConversation", SocialConversationSchema);
