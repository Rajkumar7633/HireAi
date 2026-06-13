import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Test from "@/models/Test"
import Notification from "@/models/Notification"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { applicationId, testId, roundStage: rawRoundStage, roundName: rawRoundName } = body

    if (!applicationId || !testId) {
      return NextResponse.json({ message: "Application ID and Test ID are required" }, { status: 400 })
    }

    const test: any = await Test.findById(testId)
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    // Verify recruiter owns the test
    if (test.recruiterId && test.recruiterId.toString() !== session.userId) {
      return NextResponse.json({ message: "You can only assign your own tests" }, { status: 403 })
    }

    const application = await Application.findById(applicationId)
    if (!application) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 })
    }

    const roundStage =
      typeof rawRoundStage === "string" && rawRoundStage.trim() ? rawRoundStage.trim() : "test_round"
    const roundName =
      typeof rawRoundName === "string" && rawRoundName.trim() ? rawRoundName.trim() : "Test Round"

    // Update application
    application.testId = test._id
    application.status = "Test Assigned" as any
    const assignedNow = new Date()
    application.assignedAt = application.assignedAt || assignedNow
    ;(application as any).testAssignedAt = assignedNow

    if (!(application as any).currentStage) {
      ;(application as any).currentStage = roundStage
    }

    if (!Array.isArray((application as any).rounds)) {
      ;(application as any).rounds = []
    }

    const rounds: any[] = (application as any).rounds
    let round = rounds.find((r: any) => r && r.stageKey === roundStage)
    if (!round) {
      round = { roundName, stageKey: roundStage, testId: test._id, submissions: [], status: "in_progress" }
      rounds.push(round)
    } else {
      round.roundName = round.roundName || roundName
      round.testId = test._id
      round.status = "in_progress"
    }

    await application.save()

    // Notify the candidate
    await Notification.create({
      userId: application.jobSeekerId,
      type: "test_assigned",
      message: `You have been assigned a new test: "${test.title}". Please complete it at your earliest convenience.`,
      relatedEntity: { id: test._id, type: "test" },
    }).catch(() => {})

    return NextResponse.json({ message: "Test assigned successfully", application })
  } catch (error) {
    console.error("Error assigning test:", error)
    return NextResponse.json({ message: "Failed to assign test" }, { status: 500 })
  }
}
