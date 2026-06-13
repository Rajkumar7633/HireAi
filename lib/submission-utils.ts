const CODING_TYPES = new Set(["code_snippet", "coding", "code"])

export const COMPLETED_TEST_STATUSES = new Set([
  "Test Passed",
  "Test Failed",
  "Test Completed",
  "test_completed",
  "Reviewed",
])

export function isCodingAnswerType(type?: string): boolean {
  return CODING_TYPES.has((type || "").toLowerCase())
}

export function isApplicationTestCompleted(app: any): boolean {
  if (!app) return false
  if (COMPLETED_TEST_STATUSES.has(app.status)) return true
  if (app.testScore != null && (app.testCompletedAt || app.completedAt)) return true

  const rounds: any[] = app.rounds || []
  if (rounds.some(r => Array.isArray(r.submissions) && r.submissions.length > 0)) return true
  if (rounds.some(r => r.latestScore != null && r.status && r.status !== "pending")) return true

  return false
}

export function getApplicationTestScore(app: any): number | null {
  if (app?.testScore != null) return app.testScore
  const round = (app?.rounds || []).find((r: any) => r.latestScore != null)
  return round?.latestScore ?? null
}

export function getApplicationCompletedAt(app: any): Date | null {
  if (app?.testCompletedAt) return new Date(app.testCompletedAt)
  if (app?.completedAt) return new Date(app.completedAt)
  return null
}

/** Stable key for deduping the same person across Application + jobapplications + submissions. */
export function getCandidateDedupeKey(entity: any): string {
  const cand = entity?.candidateId ?? entity?.jobSeekerId ?? entity?.applicantId
  if (cand && typeof cand === "object") {
    const id = cand._id?.toString?.() || cand.id?.toString?.()
    if (id && /^[a-f0-9]{24}$/i.test(id)) return `user:${id}`
    const email = cand.email?.toLowerCase?.()
    if (email) return `email:${email}`
  }
  if (typeof cand === "string" && /^[a-f0-9]{24}$/i.test(cand)) return `user:${cand}`

  const email = entity?.email || entity?.candidateEmail
  if (email) return `email:${String(email).toLowerCase()}`

  const appId =
    entity?.applicationId?._id?.toString?.() ||
    entity?.applicationId?.toString?.() ||
    entity?._id?.toString?.()
  return appId ? `app:${appId}` : `row:${JSON.stringify(entity).slice(0, 40)}`
}

function submissionRichness(sub: any): number {
  let score = 0
  if (sub.testScore != null || sub.score != null || sub.percentage != null) score += 100
  score += (sub.answers?.length || sub.testAnswers?.length || 0) * 10
  if (sub.language) score += 5
  if (sub.testCompletedAt || sub.submittedAt || sub.completedAt) score += 1
  return score
}

export function mergeSubmissionRecords(existing: any, incoming: any): any {
  const keepIncoming = submissionRichness(incoming) > submissionRichness(existing)
  const primary = keepIncoming ? incoming : existing
  const secondary = keepIncoming ? existing : incoming
  const pct = secondary.percentage ?? secondary.score ?? primary.percentage ?? primary.score
  const answers =
    (secondary.answers?.length ? secondary.answers : null) ||
    (primary.answers?.length ? primary.answers : null) ||
    (secondary.testAnswers?.length ? secondary.testAnswers : null) ||
    (primary.testAnswers?.length ? primary.testAnswers : null) ||
    []

  return {
    ...primary,
    ...secondary,
    _id: primary._id || secondary._id,
    applicationId: primary.applicationId || secondary.applicationId,
    candidateId: primary.candidateId || secondary.candidateId,
    percentage: pct,
    score: pct,
    answers,
    language: secondary.language || primary.language,
  }
}

export function dedupeByCandidate<T extends Record<string, any>>(rows: T[]): T[] {
  const map = new Map<string, T>()
  for (const row of rows) {
    const key = getCandidateDedupeKey(row)
    const existing = map.get(key)
    map.set(key, existing ? (mergeSubmissionRecords(existing, row) as T) : row)
  }
  return Array.from(map.values())
}

function inferLanguageFromCode(code: string): string {
  const src = code.trim()
  if (!src) return ""
  if (/\bpublic\s+class\s+\w+/.test(src) || /\bSystem\.out\.println/.test(src) || /\bimport\s+java\./.test(src)) {
    return "java"
  }
  if (/\b#include\s*</.test(src) || /\bstd::/.test(src)) return "cpp"
  if (/\bfn\s+main\s*\(/.test(src) || /\bprintln!\s*\(/.test(src)) return "rust"
  if (/\bfunc\s+\w+\s*\(/.test(src) && /\bfmt\.Print/.test(src)) return "go"
  if (/\bconsole\.log\s*\(/.test(src) || /\bconst\s+\w+\s*=/.test(src) && /\bfunction\s+/.test(src)) {
    return "javascript"
  }
  if (/\bdef\s+\w+\s*\(/.test(src) && !/\bconsole\.log/.test(src)) return "python"
  return ""
}

/** Language the candidate actually used (not the question default). */
export function extractSubmissionLanguage(submission: any): string {
  if (submission?.language) return submission.language

  const answers: any[] = submission?.answers || []
  const coding = answers.find(a => a.language && isCodingAnswerType(a.questionType))
    || answers.find(a => a.language)
  if (coding?.language) return coding.language

  for (const a of answers) {
    const code = typeof a.answer === "string" ? a.answer : ""
    const inferred = inferLanguageFromCode(code)
    if (inferred) return inferred
  }
  return ""
}

export function extractCandidateInfo(submission: any): { name: string; email: string; id: string } {
  const cand = submission?.candidateId
  if (cand && typeof cand === "object" && (cand.name || cand.email)) {
    return {
      id: cand._id?.toString() || submission.candidateId?.toString?.() || "",
      name: cand.name || "Candidate",
      email: cand.email || "",
    }
  }
  return {
    id: typeof cand === "string" ? cand : cand?.toString?.() || submission._id?.toString() || "",
    name: submission.name || submission.candidateName || "Candidate",
    email: submission.email || "",
  }
}

export function extractCodeAnswers(submission: any): Array<{
  questionId: string
  language: string
  code: string
  passedTestCases: number
  totalTestCases: number
  score: number
}> {
  const answers: any[] = submission?.answers || []
  const items = answers.filter(a => {
    const code = typeof a.answer === "string" ? a.answer : ""
    if (code.trim().length < 3) return false
    return isCodingAnswerType(a.questionType) || code.trim().length > 8
  })

  if (items.length === 0 && answers.length > 0) {
    return answers
      .filter(a => typeof a.answer === "string" && a.answer.trim().length > 0)
      .map(a => ({
        questionId: a.questionId?.toString?.() || String(a.questionId || ""),
        language: a.language || extractSubmissionLanguage(submission) || "text",
        code: a.answer,
        passedTestCases: a.passedTestCases ?? 0,
        totalTestCases: a.totalTestCases ?? 0,
        score: a.score ?? 0,
      }))
  }

  return items.map(a => ({
    questionId: a.questionId?.toString?.() || String(a.questionId || ""),
    language: a.language || extractSubmissionLanguage(submission) || "text",
    code: typeof a.answer === "string" ? a.answer : JSON.stringify(a.answer, null, 2),
    passedTestCases: a.passedTestCases ?? 0,
    totalTestCases: a.totalTestCases ?? 0,
    score: a.score ?? 0,
  }))
}
