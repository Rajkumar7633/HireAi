import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import {
  applicationToSubmissionRow,
  dedupeApplicationsByCandidate,
  getAssignedApplicationsForTest,
  getTestAssignmentStats,
  testIdFilter,
} from "@/lib/test-assignment-stats"
import { enrichSubmissionRecord, populateSubmissionPeople } from "@/lib/enrich-submission"
import { getTestSubmissionModel } from "@/lib/test-submission"
import { dedupeByCandidate, getCandidateDedupeKey, mergeSubmissionRecords } from "@/lib/submission-utils"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

async function fetchRawSubmissionsFromMongo(testId: string) {
  const TestSubmissionModel = getTestSubmissionModel()
  const submissionDocs = await TestSubmissionModel.find(testIdFilter(testId)).sort({ createdAt: -1 }).lean()

  const assignedApps = await getAssignedApplicationsForTest(testId)
  const appRows = assignedApps.map(app => applicationToSubmissionRow(app, testId))

  if (submissionDocs.length > 0) {
    const appById = new Map(appRows.map(r => [String(r._id), r]))
    const rows = submissionDocs.map(doc => {
      const appId = doc.applicationId?.toString?.() || String(doc.applicationId || "")
      const fromApp = appById.get(appId)
      return {
        ...(fromApp || {}),
        ...doc,
        candidateId: fromApp?.candidateId || doc.candidateId,
      }
    })
    return dedupeByCandidate(rows)
  }

  return dedupeByCandidate(appRows)
}

async function fetchBackendSubmissions(testId: string, token: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/tests/${testId}/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (response.ok) {
      const data = await response.json()
      return Array.isArray(data) ? data : []
    }
  } catch {
    /* ignore */
  }
  return []
}

function submissionKey(sub: any): string {
  return getCandidateDedupeKey(sub)
}

function mergeSubmissionLists(mongoSubs: any[], backendSubs: any[]) {
  const map = new Map<string, any>()
  for (const sub of [...mongoSubs, ...backendSubs]) {
    const key = submissionKey(sub)
    if (!key) continue
    const existing = map.get(key)
    map.set(key, existing ? mergeSubmissionRecords(existing, sub) : sub)
  }
  return Array.from(map.values())
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(request)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id: testId } = params
  const token = request.cookies.get("auth-token")?.value

  try {
    await connectDB()

    const [mongoSubs, backendSubs, stats] = await Promise.all([
      fetchRawSubmissionsFromMongo(testId),
      token ? fetchBackendSubmissions(testId, token) : Promise.resolve([]),
      getTestAssignmentStats(testId),
    ])

    const merged = mergeSubmissionLists(mongoSubs, backendSubs)

    // Ensure every assigned candidate appears (even if not submitted yet)
    const mergedKeys = new Set(merged.map(submissionKey))
    for (const app of stats.assignedApps) {
      const row = applicationToSubmissionRow(app, testId)
      const key = submissionKey(row)
      if (key && !mergedKeys.has(key)) {
        merged.push(row)
        mergedKeys.add(key)
      }
    }

    const populated = await populateSubmissionPeople(merged)
    const enriched = await Promise.all(
      populated.map(async sub => {
        try {
          return await enrichSubmissionRecord(sub, testId)
        } catch (err) {
          console.warn("[submissions] enrich failed for", sub._id, err)
          return sub
        }
      }),
    )

    return NextResponse.json(dedupeByCandidate(enriched), {
      status: 200,
      headers: {
        "X-Total-Assigned": String(stats.totalAssigned),
        "X-Completed-Count": String(stats.completedCount),
        "X-In-Progress-Count": String(stats.inProgressCount ?? 0),
      },
    })
  } catch (error) {
    console.error("Error fetching test submissions:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
