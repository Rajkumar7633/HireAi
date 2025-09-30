const mongoose = require("mongoose")

const ConversationSchema = new mongoose.Schema({
  jobSeekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Optional, for general chat vs resume chatbot
  },
  type: {
    type: String,
    enum: ["general", "resume_chatbot"],
    default: "general",
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Conversation", ConversationSchema)
