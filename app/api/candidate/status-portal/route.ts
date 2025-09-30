import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const applications = await Application.find({ jobSeekerId: session.userId })
      .populate({
        path: "jobDescriptionId",
        select: "title location company requirements",
        populate: {
          path: "recruiterId",
          select: "name email company",
        },
      })
      .populate("resumeId", "filename originalName")
      .populate("testId", "title description timeLimit")
      .sort({ applicationDate: -1 })

    // Enhanced application data with timeline and next steps
    const enhancedApplications = applications.map((app) => ({
      ...app.toObject(),
      timeline: generateTimeline(app),
      nextSteps: getNextSteps(app.status),
      estimatedTimeToResponse: getEstimatedResponseTime(app.status),
      canWithdraw: ["Pending", "Reviewed"].includes(app.status),
    }))

    return NextResponse.json({
      applications: enhancedApplications,
      summary: {
        total: applications.length,
        pending: applications.filter((app) => app.status === "Pending").length,
        inProgress: applications.filter((app) =>
          ["Reviewed", "Interview Scheduled", "Test Assigned"].includes(app.status),
        ).length,
        completed: applications.filter((app) => ["Hired", "Rejected"].includes(app.status)).length,
      },
    })
  } catch (error) {
    console.error("Error fetching candidate portal data:", error)
    return NextResponse.json({ message: "Failed to fetch application data" }, { status: 500 })
  }
}

function generateTimeline(application: any) {
  const timeline = [
    {
      status: "Applied",
      date: application.applicationDate,
      completed: true,
      description: "Application submitted successfully",
    },
  ]

  if (application.status !== "Pending") {
    timeline.push({
      status: "Under Review",
      date: application.reviewedAt || application.applicationDate,
      completed: true,
      description: "Application is being reviewed by the hiring team",
    })
  }

  if (application.testId) {
    timeline.push({
      status: "Test Assigned",
      date: application.testAssignedAt,
      completed: application.testScore !== undefined,
      description: `Assessment: ${application.testId.title}`,
    })
  }

  if (application.status === "Interview Scheduled") {
    timeline.push({
      status: "Interview Scheduled",
      date: application.interviewDate,
      completed: false,
      description: "Interview scheduled with hiring manager",
    })
  }

  if (["Hired", "Rejected"].includes(application.status)) {
    timeline.push({
      status: application.status,
      date: application.updatedAt,
      completed: true,
      description:
        application.status === "Hired" ? "Congratulations! You've been selected" : "Application not selected",
    })
  }

  return timeline
}

function getNextSteps(status: string) {
  switch (status) {
    case "Pending":
      return ["Wait for initial review", "Check your email for updates", "Prepare for potential next steps"]
    case "Reviewed":
      return ["Await decision from hiring team", "Prepare for potential interview or assessment"]
    case "Test Assigned":
      return ["Complete the assigned assessment", "Submit before the deadline", "Await results"]
    case "Interview Scheduled":
      return ["Prepare for your interview", "Research the company", "Confirm your availability"]
    case "Hired":
      return ["Await onboarding information", "Complete any required paperwork"]
    case "Rejected":
      return ["Consider feedback for future applications", "Continue your job search"]
    default:
      return ["Check back for updates"]
  }
}

function getEstimatedResponseTime(status: string) {
  switch (status) {
    case "Pending":
      return "3-5 business days"
    case "Reviewed":
      return "1-2 weeks"
    case "Test Assigned":
      return "After test completion"
    case "Interview Scheduled":
      return "1 week after interview"
    default:
      return "Varies"
  }
}
