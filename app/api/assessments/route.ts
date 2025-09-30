import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Assessment from "@/models/Assessment"
import Application from "@/models/Application"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Assessment creation API called")

    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      console.log("[v0] Unauthorized access attempt")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    console.log("[v0] Database connected successfully")

    const assessmentData = await request.json()
    console.log("[v0] Creating assessment with data:", assessmentData)

    const newAssessment = new Assessment({
      ...assessmentData,
      createdBy: session.userId,
      status: "Active",
      totalQuestions: assessmentData.questions?.length || 0,
      totalPoints: assessmentData.questions?.reduce((sum: number, q: any) => sum + (q.points || 1), 0) || 0,
      candidatesAssigned: 0,
      candidatesCompleted: 0,
    })

    const savedAssessment = await newAssessment.save()
    console.log("[v0] Assessment created successfully:", savedAssessment._id)

    return NextResponse.json({
      success: true,
      message: "Assessment created successfully",
      assessment: savedAssessment,
    })
  } catch (error) {
    console.error("[v0] Error creating assessment:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create assessment",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Fetching assessments")

    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const assessments = await Assessment.find({ createdBy: session.userId }).sort({ createdAt: -1 }).lean()

    const assessmentsWithCounts = await Promise.all(
      assessments.map(async (assessment) => {
        const assignedCount = await Application.countDocuments({
          assessmentId: assessment._id,
          status: { $in: [
            "Assessment Assigned",
            "Assessment Completed",
            // legacy statuses
            "assigned",
            "in_progress",
            "completed",
          ] },
        })

        const completedCount = await Application.countDocuments({
          assessmentId: assessment._id,
          status: { $in: ["Assessment Completed", "completed"] },
        })

        return {
          ...assessment,
          candidatesAssigned: assignedCount,
          candidatesCompleted: completedCount,
        }
      }),
    )

    console.log("[v0] Found assessments:", assessmentsWithCounts.length)
    console.log(
      "[v0] Assessment counts:",
      assessmentsWithCounts.map((a) => ({
        id: (a as any)._id,
        title: (a as any).title,
        assigned: (a as any).candidatesAssigned,
        completed: (a as any).candidatesCompleted,
      })),
    )

    return NextResponse.json({
      success: true,
      assessments: assessmentsWithCounts,
    })
  } catch (error) {
    console.error("[v0] Error fetching assessments:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch assessments",
      },
      { status: 500 },
    )
  }
}
