import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { executeQuery } from "@/lib/mongodb"
import Application from "@/models/Application"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    console.log("[v0] Session verification result:", session ? "SUCCESS" : "FAILED")
    console.log("[v0] Session details:", {
      userId: session?.userId,
      email: session?.email,
      role: session?.role,
    })

    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const result = await executeQuery(async () => {
      console.log("[v0] Fetching applications for user:", session.userId)

      const applicationsWithAssessments = await Application.find({
        jobSeekerId: session.userId,
        status: {
          $in: [
            "Assessment Assigned",
            "Assessment Completed",
            // include legacy statuses if any exist
            "assigned",
            "in_progress",
            "completed",
            // include test assignment synonyms used elsewhere
            "Test Assigned",
            "Test Completed",
            "test_assigned",
            "test_completed",
          ],
        },
      })
        .populate({
          path: "assessmentId",
          select: "title description durationMinutes totalPoints questions",
          options: { strictPopulate: false },
        })
        .select("assessmentId status assignedAt startedAt completedAt score answers timeSpent expiresAt")
        .limit(20)
        .maxTimeMS(5000)
        .lean()

      console.log("[v0] Found applications with assessments:", applicationsWithAssessments.length)

      if (applicationsWithAssessments.length === 0) {
        console.log("[v0] No assigned assessments found for user")

        const hasAnyApplications = await Application.countDocuments({
          jobSeekerId: session.userId,
        }).maxTimeMS(2000)

        return {
          success: true,
          assessments: [],
          hasApplications: hasAnyApplications > 0,
          message: hasAnyApplications > 0 ? "No assessments assigned yet" : "No applications found",
        }
      }

      const assessments = applicationsWithAssessments
        .map((app) => {
          const assessment = app.assessmentId

          if (assessment) {
            return {
              _id: assessment._id,
              title: assessment.title,
              description: assessment.description,
              durationMinutes: (assessment as any).durationMinutes || (assessment as any).duration || 60,
              totalQuestions: assessment.questions?.length || 0,
              totalPoints: assessment.totalPoints || 100,
              difficulty: "Medium",
              status:
                app.status === "Assessment Completed" || app.status === "completed"
                  ? "Completed"
                  : app.status === "in_progress"
                    ? "In Progress"
                    : "Available",
              score: app.score || null,
              completedAt: app.completedAt || null,
              assignedAt: app.assignedAt,
              startedAt: app.startedAt || null,
              expiresAt: app.expiresAt || null,
              timeSpent: app.timeSpent || 0,
              jobTitle: "Technical Assessment",
              companyName: "HireAI",
              requiresProctoring: true,
              securityFeatures: [
                "AI Face Recognition",
                "Screen Recording",
                "Tab Switch Detection",
                "Copy-Paste Prevention",
              ],
              applicationId: app._id,
            }
          }
          return null
        })
        .filter(Boolean)

      assessments.sort((a, b) => {
        const dateA = new Date(a.assignedAt || 0).getTime()
        const dateB = new Date(b.assignedAt || 0).getTime()
        return dateB - dateA
      })

      console.log("[v0] Successfully processed assessments:", assessments.length)

      return {
        success: true,
        assessments: assessments,
        hasApplications: true,
      }
    }, "fetch-job-seeker-assessments")

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] [DEBUG] Error fetching job seeker assessments:", error)

    const isTimeoutError = error.message?.includes("timed out") || error.message?.includes("buffering timed out")

    return NextResponse.json(
      {
        success: false,
        message: isTimeoutError
          ? "Database is taking too long to respond. Please try again in a moment."
          : "Unable to load assessments. Please refresh the page.",
        assessments: [],
        hasApplications: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
