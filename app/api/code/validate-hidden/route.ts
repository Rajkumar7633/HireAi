import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import { runCode, isCodingQuestionType, normalizeOutput } from "@/lib/code-runner"
export { dynamic } from "@/lib/api-dynamic"


/**
 * POST /api/code/validate-hidden
 * Runs hidden test cases server-side — returns pass/fail only (no inputs/outputs).
 */
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let body: {
    testId?: string
    questionId?: string
    code?: string
    languageId?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
  }

  const testId = body.testId?.trim()
  const questionId = body.questionId?.trim()
  const code = body.code?.trim()
  const languageId = body.languageId

  if (!testId || !questionId || !code || !languageId) {
    return NextResponse.json({ message: "testId, questionId, code, and languageId required" }, { status: 400 })
  }

  await connectDB()

  const FlexTest =
    mongoose.models.FlexTest ||
    mongoose.model("FlexTest", new mongoose.Schema({}, { strict: false }), "tests")
  const test: any = await FlexTest.findById(testId).lean()
  if (!test) return NextResponse.json({ message: "Test not found" }, { status: 404 })

  const questions: any[] = test.questions || []
  const qIndex = questions.findIndex((q, i) => {
    const id = q._id?.toString?.() || String(i)
    return id === questionId
  })
  if (qIndex < 0) return NextResponse.json({ message: "Question not found" }, { status: 404 })

  const question = questions[qIndex]
  if (!isCodingQuestionType(question.type)) {
    return NextResponse.json({ message: "Not a coding question" }, { status: 400 })
  }

  const allCases = question.testCases || []
  const sampleCases = allCases.filter((tc: any) => !tc.hidden)
  const hiddenCases = allCases.filter((tc: any) => tc.hidden)

  const runCases = async (cases: any[]) => {
    const results: boolean[] = []
    for (const tc of cases) {
      try {
        const out = await runCode(languageId, code, tc.input || "")
        const actual = normalizeOutput(out.stdout || "")
        const expected = normalizeOutput(tc.expectedOutput || "")
        const passed = out.statusId === 3 && actual === expected
        results.push(passed)
      } catch {
        results.push(false)
      }
    }
    return results
  }

  const sampleResults = await runCases(sampleCases)
  const hiddenResults = await runCases(hiddenCases)

  const samplePassed = sampleResults.filter(Boolean).length
  const hiddenPassed = hiddenResults.filter(Boolean).length

  return NextResponse.json({
    samplePassed,
    sampleTotal: sampleCases.length,
    hiddenPassed,
    hiddenTotal: hiddenCases.length,
    allSamplePassed: sampleCases.length === 0 || samplePassed === sampleCases.length,
    allHiddenPassed: hiddenCases.length === 0 || hiddenPassed === hiddenCases.length,
    canSubmit: (sampleCases.length === 0 || samplePassed === sampleCases.length) &&
      (hiddenCases.length === 0 || hiddenPassed === hiddenCases.length),
    // Per-case booleans only — no inputs/outputs
    sampleResults,
    hiddenResults,
  })
}
