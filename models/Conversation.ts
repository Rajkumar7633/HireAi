import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConversation extends Document {
  jobSeekerId: mongoose.Types.ObjectId;
  recruiterId: mongoose.Types.ObjectId;
  type: string; // direct, application, system
  lastMessageAt: Date;
  pipelineStatus: "new" | "contacted" | "interviewing" | "offer" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    jobSeekerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, default: "direct" },
    lastMessageAt: { type: Date, default: () => new Date() },
    pipelineStatus: {
      type: String,
      enum: ["new", "contacted", "interviewing", "offer", "rejected"],
      default: "new",
    },
  },
  { timestamps: true }
);

const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;
