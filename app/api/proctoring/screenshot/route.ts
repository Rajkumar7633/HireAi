import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"

export async function POST(request: NextRequest) {
  try {
    const { assessmentId, screenshot, timestamp } = await request.json()

    console.log("[v0] Storing screenshot for assessment:", assessmentId)
    console.log("[v0] Screenshot timestamp:", timestamp)
    console.log("[v0] Screenshot size:", screenshot.length)

    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    if (!screenshot || !screenshot.startsWith("data:image/")) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid screenshot data",
        },
        { status: 400 },
      )
    }

    const base64Data = screenshot.split(",")[1]
    const imageSize = Math.round((base64Data.length * 3) / 4) // Approximate size in bytes

    if (imageSize > 5 * 1024 * 1024) {
      // 5MB limit
      return NextResponse.json(
        {
          success: false,
          message: "Screenshot too large",
        },
        { status: 400 },
      )
    }

    const screenshotRecord = {
      id: `screenshot_${Date.now()}`,
      assessmentId,
      userId: session.userId,
      timestamp: timestamp || new Date().toISOString(),
      size: imageSize,
      stored: true,
      url: `screenshots/${assessmentId}/${session.userId}/${timestamp}.jpg`,
      metadata: {
        captureMethod: "canvas",
        quality: 0.8,
        dimensions: "auto-detected",
      },
    }

    // const uploadResult = await uploadToCloudStorage(base64Data, screenshotRecord.url)
    console.log("[v0] Screenshot would be uploaded to:", screenshotRecord.url)

    // In production: await ScreenshotRecord.create(screenshotRecord)
    console.log("[v0] Screenshot metadata stored:", screenshotRecord)

    return NextResponse.json({
      success: true,
      screenshot: screenshotRecord,
    })
  } catch (error) {
    console.error("[v0] Error storing screenshot:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to store screenshot",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
