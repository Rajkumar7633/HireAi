import mongoose from "mongoose"

export function getFlexTestModel() {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true })
  return (
    mongoose.models.FlexTest ||
    mongoose.model("FlexTest", schema, "tests")
  )
}

export function getCollegeAssignmentModel() {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true })
  return (
    mongoose.models.CollegeTestAssignment ||
    mongoose.model("CollegeTestAssignment", schema)
  )
}

/** Strip answers / hidden cases before sending test to candidates */
export function sanitizeTestForCandidate(test: Record<string, unknown>) {
  const durationMinutes =
    (test.durationMinutes as number) ?? (test.timeLimit as number) ?? 30

  return {
    ...test,
    durationMinutes,
    timeLimit: (test.timeLimit as number) ?? durationMinutes,
    settings: test.settings || {},
    questions: ((test.questions as unknown[]) || []).map((q: any, i: number) => {
      const { correctAnswer, testCases, ...safeQuestion } = q
      return {
        ...safeQuestion,
        _id: safeQuestion._id || safeQuestion.id || String(i),
        questionText: safeQuestion.questionText || safeQuestion.question || "",
        type: safeQuestion.type === "coding" ? "code_snippet" : safeQuestion.type,
        testCases: (testCases || [])
          .filter((tc: { hidden?: boolean }) => !tc.hidden)
          .map(({ input, expectedOutput }: { input: string; expectedOutput: string }) => ({
            input,
            expectedOutput,
          })),
      }
    }),
  }
}
