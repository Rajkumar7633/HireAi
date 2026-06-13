import {
  findAnswerForQuestion,
  isCodingQuestionType,
  scoreCodingAnswer,
} from "@/lib/code-runner"

function getQuestionId(question: Record<string, unknown>, index: number): string {
  const id = question._id as { toString?: () => string } | string | undefined
  if (id && typeof id === "object" && id.toString) return id.toString()
  if (typeof id === "string") return id
  const alt = question.id as { toString?: () => string } | string | undefined
  if (alt && typeof alt === "object" && alt.toString) return alt.toString()
  if (typeof alt === "string") return alt
  return String(index)
}

export type TestAnswerInput = {
  questionId: string
  answer: string | string[]
  language?: string
}

export type ScoreBreakdownItem = {
  questionId: string
  score: number
  maxScore: number
  passed: boolean
  passedCases?: number
  totalCases?: number
  error?: string | null
}

export async function scoreTestAnswers(
  test: { questions?: unknown[]; passingScore?: number },
  answers: TestAnswerInput[],
) {
  let totalEarned = 0
  let totalPossible = 0
  const breakdown: ScoreBreakdownItem[] = []
  const questions = (test.questions || []) as Record<string, unknown>[]

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]
    const qId = getQuestionId(question, i)
    const ans = findAnswerForQuestion(answers, question, i)
    const maxScore = (question.points as number) || 10
    totalPossible += maxScore

    let earned = 0
    let passed = false
    let passedCases = 0
    let totalCases = 0
    let error: string | null = null

    if (!ans) {
      breakdown.push({ questionId: qId, score: 0, maxScore, passed: false, passedCases: 0, totalCases: 0 })
      continue
    }

    const qType = String(question.type || "").toLowerCase()

    if (qType === "multiple_choice") {
      const correct = question.correctAnswer
      const given = Array.isArray(ans.answer) ? ans.answer[0] : ans.answer
      if (
        correct != null &&
        given != null &&
        String(given).trim().toLowerCase() === String(correct).trim().toLowerCase()
      ) {
        earned = maxScore
        passed = true
      }
    } else if (qType === "short_answer") {
      const correct = String(question.correctAnswer || "")
      const given = String(ans.answer || "")
      if (correct && given.trim().toLowerCase().includes(correct.trim().toLowerCase())) {
        earned = maxScore
        passed = true
      }
    } else if (isCodingQuestionType(question.type as string)) {
      const codingResult = await scoreCodingAnswer(question, ans)
      earned = codingResult.earned
      passed = codingResult.passed
      passedCases = codingResult.passedCases
      totalCases = codingResult.totalCases
      error = codingResult.error
    }

    totalEarned += earned
    breakdown.push({ questionId: qId, score: earned, maxScore, passed, passedCases, totalCases, error })
  }

  const score = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0
  const passingScore = test.passingScore ?? 70
  const passedOverall = score >= passingScore

  return { score, passedOverall, totalEarned, totalPossible, breakdown, passingScore }
}
