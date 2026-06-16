import mongoose from "mongoose"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import { getCollegeAssignmentModel, getFlexTestModel } from "@/lib/flex-test"
import { getTestSubmissionModel } from "@/lib/test-submission"
import { testIdFilter } from "@/lib/test-assignment-stats"
import { dedupeByCandidate, getCandidateDedupeKey } from "@/lib/submission-utils"

function collegeIdFilter(collegeId: string) {
  const oid = mongoose.Types.ObjectId.isValid(collegeId)
    ? new mongoose.Types.ObjectId(collegeId)
    : null
  return oid
    ? { $or: [{ collegeId }, { collegeId: oid }] }
    : { collegeId }
}

export async function assertCollegeOwnsTest(testId: string, collegeId: string) {
  await connectDB()
  const FlexTest = getFlexTestModel()
  const collegeOid = mongoose.Types.ObjectId.isValid(collegeId)
    ? new mongoose.Types.ObjectId(collegeId)
    : null

  return FlexTest.findOne({
    _id: testId,
    $or: [
      { collegeId },
      ...(collegeOid ? [{ collegeId: collegeOid }] : []),
      ...(collegeOid ? [{ ownerType: "college", createdBy: collegeOid }] : []),
    ],
  }).lean() as Record<string, unknown> | null
}

export async function getCollegeAssignmentsForTest(testId: string, collegeId: string) {
  await connectDB()
  const AssignmentModel = getCollegeAssignmentModel()
  const testOid = mongoose.Types.ObjectId.isValid(testId)
    ? new mongoose.Types.ObjectId(testId)
    : testId

  return AssignmentModel.find({
    ...collegeIdFilter(collegeId),
    testId: testOid,
  }).lean()
}

export async function getCollegeAssignedCandidates(testId: string, collegeId: string) {
  const assignments = await getCollegeAssignmentsForTest(testId, collegeId)
  const studentMap = new Map<string, Record<string, unknown>>()

  for (const assignment of assignments) {
    const assignmentId = String(assignment._id)
    const completions = (assignment.completions as Array<Record<string, unknown>>) || []
    const studentIds = (assignment.studentIds as string[]) || []

    for (const sid of studentIds) {
      const completion = completions.find((c) => String(c.studentId) === sid)
      const existing = studentMap.get(sid)
      const row: Record<string, unknown> = {
        _id: assignmentId,
        applicationId: assignmentId,
        collegeAssignmentId: assignmentId,
        jobSeekerId: sid,
        candidateId: sid,
        candidateName: completion?.studentName || "",
        candidateEmail: "",
        testScore: completion?.score ?? null,
        testCompletedAt: completion?.completedAt ?? null,
        status: completion?.status === "completed"
          ? "Test Completed"
          : completion?.status === "in_progress"
            ? "in_progress"
            : "assigned",
        testAssignedAt: assignment.assignedAt,
      }

      if (!existing || (row.testScore != null && existing.testScore == null)) {
        studentMap.set(sid, row)
      }
    }
  }

  const assigned = Array.from(studentMap.values())
  const userIds = assigned.map((a) => a.jobSeekerId).filter(Boolean)
  if (userIds.length > 0) {
    const users = await User.find({ _id: { $in: userIds } }).select("name email").lean()
    const userById = new Map(users.map((u) => [String(u._id), u]))
    for (const app of assigned) {
      const u = userById.get(String(app.jobSeekerId))
      if (u) {
        app.candidateName = app.candidateName || u.name
        app.candidateEmail = u.email
        app.jobSeekerId = { _id: u._id, name: u.name, email: u.email }
        app.candidateId = { _id: u._id, name: u.name, email: u.email }
      }
    }
  }

  return assigned
}

export async function getCollegeTestAssignmentStats(testId: string, collegeId: string) {
  const test = await assertCollegeOwnsTest(testId, collegeId)
  if (!test) return null

  const assignedApps = await getCollegeAssignedCandidates(testId, collegeId)
  const passingScore = (test.passingScore as number) ?? 70
  const completedApps = assignedApps.filter(
    (a) => a.status === "Test Completed" || a.testScore != null,
  )
  const inProgressApps = assignedApps.filter((a) => a.status === "in_progress")
  const scores = completedApps
    .map((a) => a.testScore as number)
    .filter((s) => typeof s === "number")

  return {
    test,
    passingScore,
    totalAssigned: assignedApps.length,
    completedCount: completedApps.length,
    inProgressCount: inProgressApps.length,
    notStartedCount: Math.max(0, assignedApps.length - completedApps.length - inProgressApps.length),
    averageScore: scores.length
      ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length)
      : 0,
    passRate: scores.length
      ? Math.round((scores.filter((s) => s >= passingScore).length / scores.length) * 100)
      : 0,
    assignedApps,
  }
}

export async function getCollegeTestSubmissions(testId: string, collegeId: string) {
  await connectDB()
  const stats = await getCollegeTestAssignmentStats(testId, collegeId)
  if (!stats) return null

  const TestSubmissionModel = getTestSubmissionModel()
  const assignmentIds = stats.assignedApps.map((a) => a.applicationId).filter(Boolean)
  const submissionQuery =
    assignmentIds.length > 0
      ? {
          $or: [
            { $and: [testIdFilter(testId), collegeIdFilter(collegeId)] },
            { collegeAssignmentId: { $in: assignmentIds } },
          ],
        }
      : { $and: [testIdFilter(testId), collegeIdFilter(collegeId)] }

  const submissionDocs = await TestSubmissionModel.find(submissionQuery)
    .sort({ submittedAt: -1 })
    .lean()

  const appByAssignment = new Map(
    stats.assignedApps.map((a) => [String(a.applicationId), a]),
  )

  const rows = submissionDocs.map((doc) => {
    const appId =
      doc.collegeAssignmentId?.toString?.() ||
      String(doc.collegeAssignmentId || doc.applicationId || "")
    const fromApp = appByAssignment.get(appId)
    return {
      ...(fromApp || {}),
      ...doc,
      _id: doc._id,
      applicationId: appId || doc._id,
      candidateId: fromApp?.candidateId || doc.candidateId,
      score: doc.percentage ?? doc.totalScore ?? doc.score,
      percentage: doc.percentage ?? doc.totalScore ?? doc.score,
      submittedAt: doc.submittedAt,
      status: "completed",
    }
  })

  const mergedKeys = new Set(rows.map((r) => getCandidateDedupeKey(r)))
  for (const app of stats.assignedApps) {
    const key = getCandidateDedupeKey(app)
    if (key && !mergedKeys.has(key)) {
      rows.push({
        ...app,
        score: app.testScore,
        percentage: app.testScore,
        submittedAt: app.testCompletedAt,
        status: app.testScore != null ? "completed" : "assigned",
      })
      mergedKeys.add(key)
    }
  }

  return {
    stats,
    submissions: dedupeByCandidate(rows),
  }
}
