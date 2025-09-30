import mongoose from "mongoose"

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: false,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "file", "system"],
      default: "text",
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
    attachments: {
      type: [
        new (mongoose as any).Schema(
          {
            filename: { type: String, required: true },
            url: { type: String, required: true },
            size: { type: Number, required: true }, // bytes
            mimeType: { type: String, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
)

export default mongoose.models.Message || mongoose.model("Message", MessageSchema)
