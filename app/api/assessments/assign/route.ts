import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Assessment from "@/models/Assessment"
import Application from "@/models/Application"
import Notification from "@/models/Notification"
export { dynamic } from "@/lib/api-dynamic"


export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { assessmentId, applicationIds, userIds, expirationDays = 7 } = await request.json()

    if (!assessmentId) {
      return NextResponse.json({ message: "assessmentId is required" }, { status: 400 })
    }

    const assessment = await Assessment.findById(assessmentId)
    if (!assessment) {
      return NextResponse.json({ message: "Assessment not found" }, { status: 404 })
    }

    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
    const assignedJobSeekerIds: string[] = []

    // ── Path A: update existing Application records (from job applicants list) ──
    if (Array.isArray(applicationIds) && applicationIds.length > 0) {
      // Fetch the applications so we know their jobSeekerIds
      const apps = await Application.find({ _id: { $in: applicationIds } }).select("jobSeekerId")
      const jsIds = apps.map((a) => a.jobSeekerId?.toString()).filter(Boolean) as string[]

      await Application.updateMany(
        { _id: { $in: applicationIds } },
        {
          $set: {
            assessmentId,
            assignedBy: session.userId,
            status: "Assessment Assigned",
            assignedAt: new Date(),
            expiresAt,
          },
        }
      )

      assignedJobSeekerIds.push(...jsIds)
    }

    // ── Path B: direct user assignment (from "All Job Seekers" search) ──────────
    if (Array.isArray(userIds) && userIds.length > 0) {
      for (const userId of userIds) {
        const existing = await Application.findOne({ jobSeekerId: userId, assessmentId })

        if (existing) {
          // Re-assign if not currently in progress
          if (existing.status !== "in_progress") {
            await Application.findByIdAndUpdate(existing._id, {
              $set: {
                assessmentId,
                assignedBy: session.userId,
                status: "Assessment Assigned",
                assignedAt: new Date(),
                expiresAt,
              },
            })
          }
        } else {
          // Create a new assessment-only application record
          await Application.create({
            jobSeekerId: userId,
            assessmentId,
            assignedBy: session.userId,
            status: "Assessment Assigned",
            assignedAt: new Date(),
            expiresAt,
          })
        }
        assignedJobSeekerIds.push(String(userId))
      }
    }

    if (assignedJobSeekerIds.length === 0) {
      return NextResponse.json(
        { message: "No candidates provided. Pass applicationIds or userIds." },
        { status: 400 }
      )
    }

    // ── Send notifications ────────────────────────────────────────────────────
    const notifPromises = assignedJobSeekerIds.map(async (jsId) => {
      try {
        await Notification.create({
          userId: jsId,
          type: "assessment_assigned",
          message: `New assessment "${assessment.title}" has been assigned to you. Complete it before ${expiresAt.toLocaleDateString()}.`,
          relatedEntity: { id: assessmentId, type: "assessment" },
          read: false,
        })
      } catch (e) {
        console.error("[assign] notification error:", e)
      }
    })
    await Promise.all(notifPromises)

    // ── Update assessment candidate count ─────────────────────────────────────
    await Assessment.findByIdAndUpdate(assessmentId, {
      $set: { candidatesAssigned: await Application.countDocuments({ assessmentId }) },
    })

    return NextResponse.json({
      success: true,
      message: `Assessment assigned to ${assignedJobSeekerIds.length} candidate(s)`,
      assignedCount: assignedJobSeekerIds.length,
      expiresAt,
    })
  } catch (error: any) {
    console.error("[assign] error:", error)
    return NextResponse.json(
      { message: "Failed to assign assessment", error: error.message },
      { status: 500 }
    )
  }
}
