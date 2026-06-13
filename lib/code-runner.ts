const JUDGE0_URL = process.env.JUDGE0_URL || "https://ce.judge0.com"
const JUDGE0_KEY = process.env.JUDGE0_KEY
const JUDGE0_KEYS = (process.env.JUDGE0_KEYS || JUDGE0_KEY || "").split(",").map(k => k.trim()).filter(Boolean)
const PISTON_URL = process.env.PISTON_URL || "https://emkc.org/api/v2/piston/execute"
const PISTON_API_KEY = process.env.PISTON_API_KEY || process.env.PISTON_API_TOKEN || ""
export const PISTON_LANG: Record<number, string> = {
  63: "javascript",
  74: "typescript",
  71: "python",
  62: "java",
  54: "cpp",
  50: "c",
  60: "go",
  73: "rust",
  78: "kotlin",
  83: "swift",
}

export const LANG_NAME_TO_ID: Record<string, number> = {
  javascript: 63,
  nodejs: 63,
  node: 63,
  typescript: 74,
  python: 71,
  python3: 71,
  java: 62,
  cpp: 54,
  "c++": 54,
  c: 50,
  go: 60,
  golang: 60,
  rust: 73,
  kotlin: 78,
  swift: 83,
}

function getJudge0Key(): string {
  return JUDGE0_KEYS.length ? JUDGE0_KEYS[Date.now() % JUDGE0_KEYS.length] : ""
}

/** Judge0 compiles Java as Main.java — rename the public entry class. */
export function prepareSourceCode(languageId: number, code: string): string {
  if (languageId !== 62) return code
  return code.replace(/public\s+class\s+[A-Za-z_]\w*/g, "public class Main")
}

function judge0InfraFailure(result: Awaited<ReturnType<typeof runJudge0>>): boolean {
  if (result.statusId === -1) return true
  const err = result.stderr || ""
  return (
    err.includes("Judge0 error 401") ||
    err.includes("Judge0 error 403") ||
    err.includes("Judge0 error 429") ||
    err.includes("Invalid API key") ||
    err.includes("JUDGE0_KEY missing")
  )
}

const JUDGE0_CE_URL = "https://ce.judge0.com"

async function runJudge0(
  languageId: number,
  code: string,
  stdin: string,
  timeoutMs = 12_000,
  baseUrl = JUDGE0_URL,
) {
  const key = getJudge0Key()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (baseUrl.includes("rapidapi")) {
    if (!key) {
      return {
        stdout: "",
        stderr: "Judge0 error: JUDGE0_KEY missing for RapidAPI",
        time: null as number | null,
        memory: null as number | null,
        statusId: -1,
        statusDesc: "Judge0 Error",
      }
    }
    headers["X-RapidAPI-Key"] = key
    headers["X-RapidAPI-Host"] = new URL(baseUrl).host
  } else if (key) {
    headers["Authorization"] = `Bearer ${key}`
  }

  const preparedCode = prepareSourceCode(languageId, code)
  const res = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      language_id: languageId,
      source_code: preparedCode,
      stdin: stdin || "",
      redirect_stderr_to_stdout: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    return {
      stdout: "",
      stderr: `Judge0 error ${res.status}: ${body.slice(0, 120)}`,
      time: null as number | null,
      memory: null as number | null,
      statusId: -1,
      statusDesc: "Judge0 Error",
    }
  }

  const data = await res.json()
  return {
    stdout: data.stdout || "",
    stderr: data.stderr || data.compile_output || "",
    time: data.time ? parseFloat(data.time) : null,
    memory: data.memory || null,
    statusId: data.status?.id ?? -1,
    statusDesc: data.status?.description || "Unknown",
  }
}

async function runPiston(languageId: number, code: string, stdin: string) {
  const language = PISTON_LANG[languageId] || "python"
  const preparedCode = prepareSourceCode(languageId, code)
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (PISTON_API_KEY) {
    headers.Authorization = `Bearer ${PISTON_API_KEY}`
  }

  const fileName = languageId === 62 ? "Main.java" : "main.txt"
  const res = await fetch(PISTON_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      language,
      version: "*",
      files: [{ name: fileName, content: preparedCode }],
      stdin: stdin || "",
    }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  })
  if (!res.ok) {
    return {
      stdout: "",
      stderr: `Piston error ${res.status}`,
      time: null as number | null,
      memory: null as number | null,
      statusId: -1,
      statusDesc: "Piston Error",
    }
  }

  const data = await res.json()
  const stderr = data.run?.stderr || data.run?.compile?.stderr || ""
  const stdout = data.run?.stdout || ""
  const ok = data.run?.code === 0 && !stderr
  return {
    stdout,
    stderr,
    time: null as number | null,
    memory: null as number | null,
    statusId: ok ? 3 : -1,
    statusDesc: ok ? "Accepted" : stderr || "Runtime Error",
  }
}

export async function runCode(languageId: number, code: string, stdin: string) {
  const preferPiston = process.env.CODE_EXECUTOR === "piston"

  if (!preferPiston) {
    let judgeResult = await runJudge0(languageId, code, stdin)
    if (judge0InfraFailure(judgeResult) && JUDGE0_URL !== JUDGE0_CE_URL) {
      judgeResult = await runJudge0(languageId, code, stdin, 12_000, JUDGE0_CE_URL)
    }
    if (!judge0InfraFailure(judgeResult)) return judgeResult
  }

  return runPiston(languageId, code, stdin)
}export function resolveLanguageId(language?: string, fallback = 71): number {
  if (!language) return fallback
  return LANG_NAME_TO_ID[language.toLowerCase()] || fallback
}

export function normalizeOutput(value: string): string {
  return value.replace(/\r\n/g, "\n").trim()
}

export function isCodingQuestionType(type?: string): boolean {
  const t = (type || "").toLowerCase()
  return t === "code_snippet" || t === "coding" || t === "code"
}

export function findAnswerForQuestion(
  answers: Array<{ questionId: string; answer: string | string[]; language?: string }>,
  question: any,
  index: number,
) {
  const ids = [
    question._id?.toString(),
    question.id?.toString(),
    String(index),
  ].filter(Boolean) as string[]

  return answers.find(a => ids.includes(String(a.questionId)))
}

export async function scoreCodingAnswer(
  question: any,
  answer: { answer: string | string[]; language?: string },
) {
  const code = typeof answer.answer === "string" ? answer.answer : ""
  const maxScore = question.points || 10
  const testCases: Array<{ input?: string; expectedOutput?: string; hidden?: boolean }> =
    Array.isArray(question.testCases) ? question.testCases : []

  if (!code.trim()) {
    return { earned: 0, maxScore, passed: false, passedCases: 0, totalCases: testCases.length, error: "No code submitted" }
  }

  if (testCases.length === 0) {
    return { earned: 0, maxScore, passed: false, passedCases: 0, totalCases: 0, error: "No test cases configured" }
  }

  const languageId = resolveLanguageId(answer.language || question.language, 71)
  let passedCases = 0
  let lastError: string | null = null

  for (const tc of testCases) {
    try {
      const result = await runCode(languageId, code, tc.input || "")
      const actual = normalizeOutput(result.stdout || "")
      const expected = normalizeOutput(tc.expectedOutput || (tc as any).output || "")
      if (result.statusId === 3 && actual === expected) {
        passedCases++
      } else {
        lastError = result.stderr || result.statusDesc || "Wrong answer"
      }
    } catch (e: any) {
      lastError = e?.message || "Execution failed"
    }
  }

  const ratio = passedCases / testCases.length
  const earned = Math.round(maxScore * ratio)
  return {
    earned,
    maxScore,
    passed: ratio >= 1,
    passedCases,
    totalCases: testCases.length,
    error: passedCases === testCases.length ? null : lastError,
  }
}
