const mongoose = require("mongoose");

const AssessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        correctAnswer: { type: String, required: true },
      },
    ],
    // ✅ Add recruiterId so populate works
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference your User model
      required: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Assessment || mongoose.model("Assessment", AssessmentSchema);
