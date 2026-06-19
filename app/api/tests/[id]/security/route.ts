import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import ProctorEvent from "@/models/ProctorEvent"
import {
  getAssignedApplicationsForTest,
  testIdFilter,
} from "@/lib/test-assignment-stats"
import { getTestSubmissionModel } from "@/lib/test-submission"
import { mergeTestSecurity } from "@/lib/coding-test-security"
import {
  aggregateSecuritySummary,
  buildCandidateSecurityProfile,
  type ProctorEventRow,
} from "@/lib/proctor-analytics"
import mongoose from "mongoose"
export { dynamic } from "@/lib/api-dynamic"


async function getTestSettings(testId: string) {
  const FlexTest =
    mongoose.models.FlexTest ||
    mongoose.model("FlexTest", new mongoose.Schema({}, { strict: false }), "tests")
  const test = await FlexTest.findById(testId).lean() as { settings?: Record<string, unknown> } | null
  return mergeTestSecurity(test?.settings)
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(request)
  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const testId = params.id

  try {
    await connectDB()
    const settings = await getTestSettings(testId)
    const maxTabSwitches = settings.maxTabSwitches ?? 2

    const [assignedApps, submissionDocs] = await Promise.all([
      getAssignedApplicationsForTest(testId),
      getTestSubmissionModel().find(testIdFilter(testId)).sort({ submittedAt: -1 }).lean(),
    ])

    const applicationIds = assignedApps.map(a => String(a._id))
    const applicationIdSet = new Set(applicationIds)

    const eventsByApp = new Map<string, ProctorEventRow[]>()
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

    const subByApp = new Map<string, any>()
    for (const doc of submissionDocs) {
      const appId = doc.applicationId?.toString?.() || String(doc.applicationId || "")
      if (appId && !subByApp.has(appId)) subByApp.set(appId, doc)
    }

    const candidateRows = assignedApps.map(app => {
      const appId = String(app._id)
      const sub = subByApp.get(appId) || {
        _id: appId,
        applicationId: appId,
        candidateId: app.jobSeekerId,
        name: app.jobSeekerId?.name || app.candidateName,
        email: app.jobSeekerId?.email || app.candidateEmail,
        integrityAudit: app.integrityAudit,
        tabSwitches: app.tabSwitches,
        testScore: app.testScore,
      }
      return buildCandidateSecurityProfile(
        sub,
        eventsByApp.get(appId) || [],
        maxTabSwitches,
      )
    })

    const profiles = Array.from(
      new Map(candidateRows.map(p => [p.candidateId || p.applicationId, p])).values(),
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
    console.error("[tests security GET]", error)
    return NextResponse.json({ message: "Failed to load security analytics" }, { status: 500 })
  }
}
