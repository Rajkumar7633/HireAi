import mongoose from "mongoose"
import Application from "@/models/Application"
import User from "@/models/User"
import { getTestSubmissionModel } from "@/lib/test-submission"
import { extractSubmissionLanguage } from "@/lib/submission-utils"

function getFlexJobApplicationModel() {
  return (
    mongoose.models.FlexJobApplication ||
    mongoose.model("FlexJobApplication", new mongoose.Schema({}, { strict: false }), "jobapplications")
  )
}

function getTestResultModel() {
  return (
    mongoose.models.TestResultRecord ||
    mongoose.model("TestResultRecord", new mongoose.Schema({}, { strict: false }), "testresults")
  )
}

function getFlexAssessmentResultModel() {
  return (
    mongoose.models.FlexAssessmentResult ||
    mongoose.model("FlexAssessmentResult", new mongoose.Schema({}, { strict: false }), "assessmentresults")
  )
}

function hasMeaningfulCode(answers: any[] | undefined): boolean {
  return (answers || []).some(a => {
    const code = typeof a?.answer === "string" ? a.answer : ""
    return code.trim().length > 8
  })
}

export function normalizeStoredAnswers(raw: any[]): any[] {
  return (raw || []).map(a => ({
    questionId: a.questionId?.toString?.() || String(a.questionId || ""),
    questionType: a.questionType || "code_snippet",
    answer: typeof a.answer === "string" ? a.answer : JSON.stringify(a.answer ?? ""),
    language: a.language,
    passedTestCases: a.passedTestCases ?? a.passedCases,
    totalTestCases: a.totalTestCases ?? a.totalCases,
    score: a.score ?? a.points,
  }))
}

async function loadApplicationBundle(applicationId: string | undefined) {
  if (!applicationId) return null
  const FlexApp = getFlexJobApplicationModel()
  const [nextApp, backendApp] = await Promise.all([
    Application.findById(applicationId).lean(),
    FlexApp.findById(applicationId).lean(),
  ])
  return (nextApp || backendApp) as any
}

async function loadStoredTestAnswers(testId: string, applicationId?: string, candidateId?: string) {
  const TestResult = getTestResultModel()
  const FlexAssessment = getFlexAssessmentResultModel()
  const oid = mongoose.Types.ObjectId.isValid(testId) ? new mongoose.Types.ObjectId(testId) : testId

  const queries: Promise<any>[] = [
    TestResult.findOne({ testId: oid, ...(applicationId ? { applicationId } : {}) })
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean(),
    FlexAssessment.findOne({ testId: oid, ...(applicationId ? { applicationId } : {}) })
      .sort({ submittedAt: -1, createdAt: -1 })
      .lean(),
  ]
  if (candidateId) {
    queries.push(
      FlexAssessment.findOne({ testId: oid, candidateId })
        .sort({ submittedAt: -1, createdAt: -1 })
        .lean(),
    )
  }

  const results = await Promise.all(queries)
  for (const doc of results) {
    if (doc?.answers && hasMeaningfulCode(doc.answers)) {
      return normalizeStoredAnswers(doc.answers)
    }
  }
  return []
}

export async function enrichSubmissionRecord(submission: any, testId: string): Promise<any> {
  const applicationId = extractId(submission.applicationId) || undefined
  const candidateId = extractId(submission.candidateId) || undefined

  let answers = normalizeStoredAnswers(submission.answers || [])

  if (!hasMeaningfulCode(answers) && submission._id) {
    const TestSubmissionModel = getTestSubmissionModel()
    const full = await TestSubmissionModel.findById(submission._id).lean() as {
      answers?: unknown[]
    } | null
    if (full?.answers && hasMeaningfulCode(full.answers as any[])) {
      answers = normalizeStoredAnswers(full.answers as any[])
    }
  }

  if (!hasMeaningfulCode(answers)) {
    const fromResults = await loadStoredTestAnswers(testId, applicationId, candidateId)
    if (hasMeaningfulCode(fromResults)) answers = fromResults
  }

  if (!hasMeaningfulCode(answers)) {
    const app = await loadApplicationBundle(applicationId)
    const fromApp = normalizeStoredAnswers(
      app?.testAnswers || app?.answers || [],
    )
    if (hasMeaningfulCode(fromApp)) answers = fromApp
  }

  if (!hasMeaningfulCode(answers) && submission.applicationId?.testAnswers) {
    const fromPopulated = normalizeStoredAnswers(submission.applicationId.testAnswers)
    if (hasMeaningfulCode(fromPopulated)) answers = fromPopulated
  }

  const language = submission.language || extractSubmissionLanguage({ ...submission, answers })

  return {
    ...submission,
    answers,
    language: language || undefined,
    percentage: submission.percentage ?? submission.score ?? submission.applicationId?.testScore,
  }
}

function extractId(value: any): string | null {
  if (!value) return null
  if (typeof value === "string") {
    return mongoose.Types.ObjectId.isValid(value) ? value : null
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString()
  }
  if (typeof value.toHexString === "function") {
    const hex = value.toHexString()
    return mongoose.Types.ObjectId.isValid(hex) ? hex : null
  }
  if (value._id && value._id !== value) {
    const nested = extractId(value._id)
    if (nested) return nested
  }
  try {
    const str = String(value)
    if (/^[a-f0-9]{24}$/i.test(str)) return str
  } catch {
    return null
  }
  return null
}

export async function populateSubmissionPeople(submissions: any[]) {
  const candidateIds = Array.from(new Set(
    submissions.map(s => extractId(s.candidateId)).filter(Boolean) as string[],
  ))
  const appIds = Array.from(new Set(
    submissions.map(s => extractId(s.applicationId) || extractId(s._id)).filter(Boolean) as string[],
  ))

  const FlexApp = getFlexJobApplicationModel()
  const [candidates, applications, flexApplications] = await Promise.all([
    candidateIds.length ? User.find({ _id: { $in: candidateIds } }).select("name email").lean() : [],
    appIds.length ? Application.find({ _id: { $in: appIds } }).select("status testScore testAnswers answers").lean() : [],
    appIds.length ? FlexApp.find({ _id: { $in: appIds } }).lean() : [],
  ])

  const candidateMap = Object.fromEntries(candidates.map(c => [String((c as any)._id), c]))
  const appMap: Record<string, any> = {}
  for (const app of [...applications, ...flexApplications]) {
    const id = String((app as any)._id)
    const prev = appMap[id]
    appMap[id] = prev
      ? {
          ...prev,
          ...app,
          testAnswers: (app.testAnswers?.length ? app.testAnswers : prev.testAnswers) || [],
          answers: (app.answers?.length ? app.answers : prev.answers) || [],
        }
      : app
  }

  return submissions.map(s => {
    const cid = extractId(s.candidateId)
    const aid = extractId(s.applicationId) || extractId(s._id)
    const populatedCandidate =
      s.candidateId && typeof s.candidateId === "object" && (s.candidateId.name || s.candidateId.email)
        ? s.candidateId
        : null
    return {
      ...s,
      candidateId: populatedCandidate || (cid ? candidateMap[cid] : null) || s.candidateId,
      applicationId: (aid ? appMap[aid] : null) || s.applicationId,
    }
  })
}

export function getTestResultModelForWrite() {
  return getTestResultModel()
}
