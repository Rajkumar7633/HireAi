import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
export { dynamic } from "@/lib/api-dynamic"

  findAnswerForQuestion,
  isCodingQuestionType,
  normalizeOutput,
  resolveLanguageId,
  runCode,
} from "@/lib/code-runner"

const rateLimits = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20
const RATE_WINDOW = 60_000
let activeConcurrent = 0
const MAX_CONCURRENT = 50

interface TestCase { input: string; expectedOutput: string }

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

    const now = Date.now()
    const rl = rateLimits.get(session.userId) || { count: 0, resetAt: now + RATE_WINDOW }
    if (now > rl.resetAt) { rl.count = 0; rl.resetAt = now + RATE_WINDOW }
    rl.count++
    rateLimits.set(session.userId, rl)
    if (rl.count > RATE_LIMIT) {
      return NextResponse.json({ message: `Rate limit exceeded. Max ${RATE_LIMIT} runs/minute.` }, { status: 429 })
    }

    if (activeConcurrent >= MAX_CONCURRENT) {
      return NextResponse.json({ message: "Server busy. Please retry in a few seconds." }, { status: 503 })
    }

    const body = await req.json()
    const { code, languageId, testCases } = body as { code: string; languageId: number; testCases: TestCase[] }

    if (!code?.trim() || !languageId || !Array.isArray(testCases)) {
      return NextResponse.json({ message: "code, languageId, and testCases are required" }, { status: 400 })
    }
    if (code.length > 100_000) {
      return NextResponse.json({ message: "Code too large (max 100KB)" }, { status: 400 })
    }

    const casesToRun = testCases.slice(0, 5)
    activeConcurrent++

    try {
      const results = []
      for (const tc of casesToRun) {
        try {
          const r = await runCode(languageId, code, tc.input)
          const actual = normalizeOutput(r.stdout || "")
          const expected = normalizeOutput(tc.expectedOutput || "")
          const passed = r.statusId === 3 && actual === expected
          results.push({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: r.stdout,
            passed,
            time: r.time,
            memory: r.memory,
            error: passed ? null : (r.stderr || r.statusDesc || null),
            statusId: r.statusId,
            statusDesc: r.statusDesc,
          })
        } catch {
          results.push({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: "",
            passed: false,
            time: null,
            memory: null,
            error: "Execution timeout or network error",
            statusId: -1,
            statusDesc: "Error",
          })
        }
      }

      return NextResponse.json({ results }, { status: 200 })
    } finally {
      activeConcurrent = Math.max(0, activeConcurrent - 1)
    }
  } catch (e: any) {
    activeConcurrent = Math.max(0, activeConcurrent - 1)
    console.error("run-tests error:", e)
    return NextResponse.json({ message: "Server error", error: e?.message }, { status: 500 })
  }
}
