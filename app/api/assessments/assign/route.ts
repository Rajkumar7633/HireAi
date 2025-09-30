


import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Assessment from "@/models/Assessment"
import Application from "@/models/Application"
import Notification from "@/models/Notification"

export async function POST(request: NextRequest) {
  try {
    console.log("[DEBUG] Assessment assignment API called")

    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { assessmentId, applicationIds, jobSeekerIds, expirationDays = 7 } = await request.json()
    console.log("[DEBUG] Input data:", { assessmentId, applicationIds, jobSeekerIds, sessionUserId: session.userId })

    // Support both applicationIds (from frontend) and jobSeekerIds (direct assignment)
    let targetJobSeekerIds = jobSeekerIds;
    
    if (!targetJobSeekerIds && applicationIds && Array.isArray(applicationIds)) {
      // Convert applicationIds to jobSeekerIds by fetching the applications
      const applications = await Application.find({ _id: { $in: applicationIds } });
      targetJobSeekerIds = applications.map(app => app.jobSeekerId.toString());
      console.log("[DEBUG] Converted applicationIds to jobSeekerIds:", { applicationIds, targetJobSeekerIds });
    }

    if (!assessmentId || !targetJobSeekerIds || !Array.isArray(targetJobSeekerIds)) {
      return NextResponse.json(
        {
          message: "Assessment ID and job seeker IDs are required",
        },
        { status: 400 },
      )
    }

    // Verify assessment exists and belongs to recruiter
    const assessment = await Assessment.findById(assessmentId)
    console.log("[DEBUG] Assessment found:", {
      exists: !!assessment,
      id: assessment?._id,
      createdBy: assessment?.createdBy?.toString(),
      sessionUserId: session.userId,
    })

    if (!assessment) {
      return NextResponse.json(
        {
          message: "Assessment not found",
        },
        { status: 404 },
      )
    }

    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000)
    const assignedApplications = []

    // If we have applicationIds, update existing applications
    if (applicationIds && Array.isArray(applicationIds)) {
      const updateResult = await Application.updateMany(
        {
          _id: { $in: applicationIds },
          assessmentId: { $exists: false } // Only update if not already assigned
        },
        {
          $set: {
            assessmentId: assessmentId,
            assignedBy: session.userId,
            status: "Assessment Assigned",
            assignedAt: new Date(),
            expiresAt: expiresAt,
          },
        }
      )

      console.log("[DEBUG] Updated existing applications:", updateResult.modifiedCount)

      // Get the updated applications for notifications
      const updatedApplications = await Application.find({
        _id: { $in: applicationIds },
        assessmentId: assessmentId
      })
      assignedApplications.push(...updatedApplications)
    } else {
      // Direct assignment to job seekers (create new application records)
      for (const jobSeekerId of targetJobSeekerIds) {
        // Check if already assigned
        const existingApplication = await Application.findOne({
          jobSeekerId: jobSeekerId,
          assessmentId: assessmentId,
        })

        if (!existingApplication) {
          const newApplication = new Application({
            jobSeekerId: jobSeekerId,
            assessmentId: assessmentId,
            assignedBy: session.userId,
            status: "Assessment Assigned",
            assignedAt: new Date(),
            expiresAt: expiresAt,
          })

          const savedApplication = await newApplication.save()
          assignedApplications.push(savedApplication)
        }
      }
    }

    console.log("[DEBUG] Created new assignments:", assignedApplications.length)

    const notificationPromises = assignedApplications.map(async (application) => {
      try {
        const notification = new Notification({
          userId: application.jobSeekerId,
          type: "assessment_assigned",
          message: `New assessment "${assessment.title}" has been assigned to you. Complete it before ${expiresAt.toLocaleDateString()}.`,
          relatedEntity: {
            id: assessmentId,
            type: "assessment",
          },
          read: false,
          createdAt: new Date(),
        })

        return await notification.save()
      } catch (error) {
        console.error("[DEBUG] Error creating notification:", error)
        return null
      }
    })

    await Promise.all(notificationPromises)
    console.log("[DEBUG] Created notifications for", assignedApplications.length, "job seekers")

    return NextResponse.json({
      success: true,
      message: `Assessment assigned to ${assignedApplications.length} candidates`,
      assignedCount: assignedApplications.length,
      expiresAt: expiresAt,
    })
  } catch (error) {
    console.error("[DEBUG] Error assigning assessment:", error)
    return NextResponse.json(
      {
        message: "Failed to assign assessment",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
