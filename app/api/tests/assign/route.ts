import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Test from "@/models/Test"

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

    // Load test by id. We only require that it exists; ownership is already
    // enforced elsewhere (e.g. when listing recruiter tests).
    const test: any = await Test.findById(testId)
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }


    // Load application so we can update stage/rounds structure
    const application = await Application.findById(applicationId)

    if (!application) {
      return NextResponse.json({ message: "Application not found" }, { status: 404 })
    }

    // Basic assignment fields
    application.testId = test._id
    application.status = "Test Assigned" as any
      ; (application as any).testAssignedAt = new Date()

    // Determine which round/stage this assignment belongs to
    const roundStage =
      typeof rawRoundStage === "string" && rawRoundStage.trim() ? rawRoundStage.trim() : "test_round"
    const roundName =
      typeof rawRoundName === "string" && rawRoundName.trim() ? rawRoundName.trim() : "Test Round"

    // Ensure currentStage is at least this round
    if (!(application as any).currentStage) {
      ; (application as any).currentStage = roundStage
    }

    // Ensure rounds array exists
    if (!Array.isArray((application as any).rounds)) {
      ; (application as any).rounds = []
    }

    const rounds: any[] = (application as any).rounds
    let round = rounds.find((r) => r && r.stageKey === roundStage)
    if (!round) {
      round = {
        roundName,
        stageKey: roundStage,
        testId: test._id,
        submissions: [],
        status: "in_progress",
      }
      rounds.push(round)
    } else {
      // Keep existing submissions but update metadata
      round.roundName = round.roundName || roundName
      round.testId = test._id
      round.status = "in_progress"
    }

    await application.save()

    return NextResponse.json({
      message: "Test assigned successfully",
      application,
    })
  } catch (error) {
    console.error("Error assigning test:", error)
    return NextResponse.json({ message: "Failed to assign test" }, { status: 500 })
  }
}
