const mongoose = require("mongoose")

const TestSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  questions: [
    {
      questionText: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ["multiple_choice", "short_answer", "code_snippet"],
        required: true,
      },
      options: [String], // For multiple_choice
      correctAnswer: {
        type: mongoose.Schema.Types.Mixed, // Can be string for short_answer, array for multiple_choice
        required: false,
      },
      points: {
        type: Number,
        default: 1,
      },
    },
  ],
  durationMinutes: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("Test", TestSchema)
