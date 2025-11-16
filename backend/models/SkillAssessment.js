const mongoose = require("mongoose");

const SkillAssessmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  skillName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "completed"],
    default: "pending",
  },
  questions: [
    {
      question: { type: String, required: true },
      options: [{ type: String, required: true }],
      correctIndex: { type: Number, required: true },
    },
  ],
  answers: [{ type: Number }],
  score: { type: Number },
  passed: { type: Boolean },
  attemptNumber: { type: Number },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
});

module.exports = mongoose.model("SkillAssessment", SkillAssessmentSchema);
