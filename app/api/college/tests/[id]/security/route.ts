import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import ProctorEvent from "@/models/ProctorEvent"
import { mergeTestSecurity } from "@/lib/coding-test-security"
import {
export { dynamic } from "@/lib/api-dynamic"

  aggregateSecuritySummary,
  buildCandidateSecurityProfile,
  type ProctorEventRow,
} from "@/lib/proctor-analytics"
import {
  assertCollegeOwnsTest,
  getCollegeAssignedCandidates,
} from "@/lib/college-test-stats"
import { getTestSubmissionModel } from "@/lib/test-submission"
import { testIdFilter } from "@/lib/test-assignment-stats"

function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(request)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const testId = params.id

  try {
    await connectDB()
    const test = await assertCollegeOwnsTest(testId, session!.userId)
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    const settings = mergeTestSecurity(test.settings as Record<string, unknown> | undefined)
    const maxTabSwitches = settings.maxTabSwitches ?? 2

    const assignedApps = await getCollegeAssignedCandidates(testId, session!.userId)
    const applicationIds = assignedApps.map((a) => String(a.applicationId))
    const applicationIdSet = new Set(applicationIds)

    const submissionDocs = await getTestSubmissionModel()
      .find(testIdFilter(testId))
      .sort({ submittedAt: -1 })
      .lean()

    const proctorQuery = applicationIds.length > 0
      ? {
          $or: [
            { assessmentId: { $in: applicationIds } },
            { "meta.testId": testId },
          ],
        }
      : { "meta.testId": testId }

    const scopedEvents = await ProctorEvent.find(proctorQuery)
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean()

    const eventsByApp = new Map<string, ProctorEventRow[]>()
    for (const ev of scopedEvents) {
      const appId = String(ev.assessmentId || "")
      const metaTestId = (ev.meta as { testId?: string } | undefined)?.testId
      if (!applicationIdSet.has(appId) && metaTestId !== testId) continue

      const row: ProctorEventRow = {
        _id: String(ev._id),
        assessmentId: appId,
        candidateId: String(ev.candidateId || ""),
        type: ev.type,
        message: ev.message,
        snapshot: ev.snapshot,
        meta: ev.meta as Record<string, unknown>,
        createdAt: (ev.createdAt ? new Date(ev.createdAt) : new Date()).toISOString(),
      }
      const list = eventsByApp.get(appId) || []
      list.push(row)
      eventsByApp.set(appId, list)
    }

    const subByApp = new Map<string, Record<string, unknown>>()
    for (const doc of submissionDocs) {
      const appId =
        doc.collegeAssignmentId?.toString?.() ||
        String(doc.collegeAssignmentId || doc.applicationId || "")
      if (appId && !subByApp.has(appId)) subByApp.set(appId, doc as Record<string, unknown>)
    }

    const candidateRows = assignedApps.map((app) => {
      const appId = String(app.applicationId)
      const sub = subByApp.get(appId) || {
        _id: appId,
        applicationId: appId,
        candidateId: app.candidateId,
        name: app.candidateName,
        email: app.candidateEmail,
        integrityAudit: (app as { integrityAudit?: unknown }).integrityAudit,
        tabSwitches: (app as { tabSwitches?: number }).tabSwitches,
        testScore: app.testScore,
      }
      return buildCandidateSecurityProfile(
        sub,
        eventsByApp.get(appId) || [],
        maxTabSwitches,
      )
    })

    const profiles = Array.from(
      new Map(candidateRows.map((p) => [p.candidateId || p.applicationId, p])).values(),
    )

    return NextResponse.json({
      testId,
      settings,
      summary: aggregateSecuritySummary(profiles),
      candidates: profiles.sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2 }
        const dr = riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
        if (dr !== 0) return dr
        return b.eventCount - a.eventCount
      }),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[college/tests security GET]", error)
    return NextResponse.json({ message: "Failed to load security analytics" }, { status: 500 })
  }
}
