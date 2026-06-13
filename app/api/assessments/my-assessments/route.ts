import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { executeQuery } from "@/lib/mongodb"
import Application from "@/models/Application"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const result = await executeQuery(async () => {
      // ── Query 1: Legacy Assessment-model assignments ──────────────────────────
      const assessmentApps = await Application.find({
        $or: [
          { jobSeekerId: session.userId },
          { applicantId: session.userId },
        ],
        assessmentId: { $exists: true, $ne: null },
        status: {
          $in: [
            "Assessment Assigned",
            "Assessment Completed",
            "assigned",
            "in_progress",
            "completed",
            "Test Assigned",
            "Test Completed",
            "test_assigned",
            "test_completed",
          ],
        },
      })
        .populate({
          path: "assessmentId",
          select: "title description durationMinutes totalPoints questions securityFeatures requiresProctoring",
          options: { strictPopulate: false },
        })
        .select("assessmentId status assignedAt startedAt completedAt score answers timeSpent expiresAt")
        .limit(20)
        .maxTimeMS(5000)
        .lean()

      // ── Query 2: Tests-system assignments (coding tests + MCQ via Tests model) ─
      const testApps = await Application.find({
        jobSeekerId: session.userId,
        testId: { $exists: true, $ne: null },
        status: {
          $in: [
            "Test Assigned",
            "Test Completed",
            "test_assigned",
            "test_completed",
          ],
        },
      })
        .populate({
          path: "testId",
          select: "title description durationMinutes questions",
          options: { strictPopulate: false },
        })
        .populate({
          path: "jobDescriptionId",
          select: "title companyName",
          options: { strictPopulate: false },
        })
        .select("testId jobDescriptionId status testAssignedAt testCompletedAt testScore applicationDate")
        .limit(20)
        .maxTimeMS(5000)
        .lean()

      // ── Map Assessment-model results ──────────────────────────────────────────
      const defaultFeatures = [
        "AI Face Recognition",
        "Multi-Face Detection",
        "Audio Monitoring",
        "Screen Recording",
        "Tab Switch Detection",
        "Copy/Paste Block",
      ]

      const mappedAssessments = assessmentApps
        .map((app: any) => {
          const assessment = app.assessmentId
          if (!assessment) return null

          return {
            _id: assessment._id,
            type: "assessment" as const,
            title: assessment.title,
            description: assessment.description,
            durationMinutes: assessment.durationMinutes || assessment.duration || 60,
            totalQuestions: assessment.questions?.length || 0,
            totalPoints: assessment.totalPoints || 100,
            difficulty: "Medium" as const,
            status:
              app.status === "Assessment Completed" || app.status === "completed"
                ? ("Completed" as const)
                : app.status === "in_progress"
                ? ("In Progress" as const)
                : ("Available" as const),
            score: app.score || null,
            completedAt: app.completedAt || null,
            assignedAt: app.assignedAt,
            startedAt: app.startedAt || null,
            expiresAt: app.expiresAt || null,
            timeSpent: app.timeSpent || 0,
            jobTitle: "Technical Assessment",
            companyName: "HireAI",
            requiresProctoring:
              typeof assessment.requiresProctoring === "boolean" ? assessment.requiresProctoring : true,
            securityFeatures:
              assessment.securityFeatures?.length > 0 ? assessment.securityFeatures : defaultFeatures,
            applicationId: app._id,
            takeUrl: `/dashboard/job-seeker/assessments/${assessment._id}/take`,
          }
        })
        .filter(Boolean)

      // ── Map Test-model results ────────────────────────────────────────────────
      const mappedTests = testApps
        .map((app: any) => {
          const test = app.testId
          if (!test) return null

          const isCodingChallenge =
            Array.isArray(test.questions) &&
            test.questions.length > 0 &&
            test.questions.every((q: any) => q.type === "code_snippet")

          const jobDesc = app.jobDescriptionId
          const statusStr = (app.status || "").toLowerCase()
          const isDone =
            statusStr === "test_completed" ||
            statusStr === "test completed" ||
            app.status === "Test Completed"

          return {
            _id: `test_${app._id}`,
            type: "coding_test" as const,
            title: test.title,
            description: test.description || "",
            durationMinutes: test.durationMinutes || 90,
            totalQuestions: test.questions?.length || 0,
            totalPoints: (test.questions || []).reduce((s: number, q: any) => s + (q.points || 10), 0) || 100,
            difficulty: isCodingChallenge ? ("Hard" as const) : ("Medium" as const),
            status: isDone ? ("Completed" as const) : ("Available" as const),
            score: app.testScore || null,
            completedAt: app.testCompletedAt || null,
            assignedAt: (app as any).testAssignedAt || app.applicationDate,
            startedAt: null,
            expiresAt: null,
            timeSpent: 0,
            jobTitle: jobDesc?.title || "Technical Test",
            companyName: jobDesc?.companyName || "HireAI",
            requiresProctoring: false,
            securityFeatures: [],
            applicationId: app._id,
            isCodingChallenge,
            takeUrl: `/dashboard/job-seeker/tests/${app._id}`,
          }
        })
        .filter(Boolean)

      // ── Merge, de-duplicate by applicationId, sort newest first ──────────────
      // testApps may overlap with assessmentApps if both assessmentId and testId are set
      const seenAppIds = new Set<string>()
      const allItems: any[] = []

      for (const item of [...mappedTests, ...mappedAssessments]) {
        const key = String(item.applicationId)
        if (!seenAppIds.has(key)) {
          seenAppIds.add(key)
          allItems.push(item)
        }
      }

      allItems.sort((a, b) => {
        const da = new Date(a.assignedAt || 0).getTime()
        const db = new Date(b.assignedAt || 0).getTime()
        return db - da
      })

      if (allItems.length === 0) {
        const hasAny = await Application.countDocuments({ jobSeekerId: session.userId }).maxTimeMS(2000)
        return {
          success: true,
          assessments: [],
          hasApplications: hasAny > 0,
          message: hasAny > 0 ? "No assessments assigned yet" : "No applications found",
        }
      }

      return { success: true, assessments: allItems, hasApplications: true }
    }, "fetch-job-seeker-assessments")

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error fetching job seeker assessments:", error)
    const isTimeout = error.message?.includes("timed out") || error.message?.includes("buffering timed out")
    return NextResponse.json(
      {
        success: false,
        message: isTimeout
          ? "Database is taking too long. Please try again."
          : "Unable to load assessments. Please refresh.",
        assessments: [],
        hasApplications: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
