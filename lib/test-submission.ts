import mongoose from "mongoose"
export {
  COMPLETED_TEST_STATUSES,
  extractCandidateInfo,
  extractCodeAnswers,
  extractSubmissionLanguage,
  getApplicationCompletedAt,
  getApplicationTestScore,
  isApplicationTestCompleted,
  isCodingAnswerType,
} from "@/lib/submission-utils"

export function getTestSubmissionModel() {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true })
  return (
    mongoose.models.TestSubmissionFlex ||
    mongoose.model("TestSubmissionFlex", schema, "testsubmissions")
  )
}
