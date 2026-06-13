import mongoose from "mongoose"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import { getTestSubmissionModel } from "@/lib/test-submission"
import { getCandidateDedupeKey } from "@/lib/submission-utils"

function getFlexJobApplicationModel() {
  return (
    mongoose.models.FlexJobApplication ||
    mongoose.model("FlexJobApplication", new mongoose.Schema({}, { strict: false }), "jobapplications")
  )
}

export function testIdFilter(testId: string) {
  const clauses: any[] = [{ testId }]
  if (mongoose.Types.ObjectId.isValid(testId)) {
    clauses.push({ testId: new mongoose.Types.ObjectId(testId) })
  }
  return { $or: clauses }
}

function mergeApplicationRecords(existing: any, incoming: any): any {
  const scoreExisting = existing.testScore != null
  const scoreIncoming = incoming.testScore != null
  const answersExisting = (existing.testAnswers?.length || 0) + (existing.answers?.length || 0)
  const answersIncoming = (incoming.testAnswers?.length || 0) + (incoming.answers?.length || 0)

  let winner = existing
  let loser = incoming
  if (scoreIncoming && !scoreExisting) {
    winner = incoming
    loser = existing
  } else if (scoreIncoming && scoreExisting && answersIncoming > answersExisting) {
    winner = incoming
    loser = existing
  } else if (!scoreIncoming && !scoreExisting && answersIncoming > answersExisting) {
    winner = incoming
    loser = existing
  } else {
    const tExisting = new Date(existing.testCompletedAt || existing.updatedAt || 0).getTime()
    const tIncoming = new Date(incoming.testCompletedAt || incoming.updatedAt || 0).getTime()
    if (tIncoming > tExisting) {
      winner = incoming
      loser = existing
    }
  }

  return {
    ...loser,
    ...winner,
    testAnswers: winner.testAnswers?.length ? winner.testAnswers : loser.testAnswers,
    answers: winner.answers?.length ? winner.answers : loser.answers,
    jobSeekerId: winner.jobSeekerId || loser.jobSeekerId,
  }
}

export function dedupeApplicationsByCandidate(apps: any[]): any[] {
  const map = new Map<string, any>()
  for (const app of apps) {
    const key = getCandidateDedupeKey(app)
    const existing = map.get(key)
    map.set(key, existing ? mergeApplicationRecords(existing, app) : app)
  }
  return Array.from(map.values())
}

/** Same source as assign page (/api/tests/[id]/invite GET). */
export async function getAssignedApplicationsForTest(testId: string) {
  await connectDB()

  const filter = testIdFilter(testId)
  const FlexApp = getFlexJobApplicationModel()

  const [nextApps, backendApps] = await Promise.all([
    Application.find(filter)
      .populate({ path: "jobSeekerId", select: "name email" })
      .lean(),
    FlexApp.find(filter).lean(),
  ])

  const byId = new Map<string, any>()
  for (const app of [...nextApps, ...backendApps]) {
    byId.set(String((app as any)._id), app)
  }
  return dedupeApplicationsByCandidate(Array.from(byId.values()))
}

export async function getTestAssignmentStats(testId: string) {
  const assignedApps = await getAssignedApplicationsForTest(testId)
  const completedApps = assignedApps.filter(app => app.testScore != null && app.testScore !== undefined)

  const TestSubmissionModel = getTestSubmissionModel()
  const submissionDocs = await TestSubmissionModel.find(testIdFilter(testId)).lean()

  const totalAssigned = assignedApps.length
  const totalAttempts = completedApps.length
  const passingScore = 70

  const scoreSources = completedApps.length > 0
    ? completedApps.map(a => a.testScore as number)
    : submissionDocs.map(s => s.percentage ?? 0)

  const totalScoreSum = scoreSources.reduce((sum, s) => sum + (s || 0), 0)
  const averageScore = scoreSources.length > 0 ? Math.round(totalScoreSum / scoreSources.length) : 0
  const passCount = scoreSources.filter(s => (s || 0) >= passingScore).length
  const passRate = scoreSources.length > 0 ? Math.round((passCount / scoreSources.length) * 100) : 0

  return {
    totalAssigned,
    totalAttempts,
    completedCount: totalAttempts,
    averageScore,
    passRate,
    assignedApps,
    completedApps,
    submissionDocs,
  }
}

export function applicationToSubmissionRow(app: any, testId: string) {
  const seeker = app.jobSeekerId
  const seekerObj = seeker && typeof seeker === "object" ? seeker : null
  const hasScore = app.testScore != null && app.testScore !== undefined

  return {
    _id: app._id,
    testId,
    candidateId: seekerObj || app.jobSeekerId,
    applicationId: app._id,
    percentage: hasScore ? app.testScore : undefined,
    score: hasScore ? app.testScore : undefined,
    totalScore: hasScore ? app.testScore : undefined,
    submittedAt: app.testCompletedAt || app.completedAt || app.assignedAt || app.updatedAt,
    assignedAt: app.assignedAt || app.updatedAt,
    status: hasScore ? "completed" : "assigned",
    answers: app.testAnswers || app.answers || [],
    name: seekerObj?.name,
    email: seekerObj?.email,
  }
}
