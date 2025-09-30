import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import AssessmentResult from "@/models/AssessmentResult"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Screen recording data received")

    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const formData = await request.formData()
    const recording = formData.get("recording") as File
    const assessmentId = formData.get("assessmentId") as string
    const timestamp = formData.get("timestamp") as string

    if (!recording || !assessmentId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Convert recording to base64 for storage
    const arrayBuffer = await recording.arrayBuffer()
    const base64Recording = Buffer.from(arrayBuffer).toString("base64")

    // Store recording data in assessment result
    const result = await AssessmentResult.findOneAndUpdate(
      {
        assessmentId: assessmentId,
        candidateId: session.userId,
        status: "In Progress",
      },
      {
        $push: {
          "proctoringData.screenRecordings": {
            timestamp: new Date(timestamp),
            data: base64Recording,
            size: recording.size,
            type: recording.type,
          },
        },
      },
      { new: true, upsert: true },
    )

    console.log("[v0] Screen recording stored successfully")

    return NextResponse.json({
      success: true,
      message: "Screen recording stored",
      recordingId: `recording_${Date.now()}`,
    })
  } catch (error) {
    console.error("[v0] Error storing screen recording:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to store screen recording",
      },
      { status: 500 },
    )
  }
}
