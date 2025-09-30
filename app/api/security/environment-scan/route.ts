import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { assessmentId, scanData } = await request.json()

    console.log("[Security] Environment scan for assessment:", assessmentId)
    console.log("[Security] Risk score:", scanData.riskScore)
    console.log("[Security] Multiple monitors:", scanData.multipleMonitors)
    console.log("[Security] Suspicious processes:", scanData.suspiciousProcesses.length)
    console.log("[Security] Browser extensions:", scanData.browserExtensions.length)

    // Process scan results
    const scanResult = {
      assessmentId,
      scanId: `scan_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...scanData,
      recommendation: getScanRecommendation(scanData.riskScore),
      allowAssessment: scanData.riskScore < 50, // Block if risk score too high
    }

    // Store scan results
    console.log("[Security] Scan recommendation:", scanResult.recommendation)
    console.log("[Security] Assessment allowed:", scanResult.allowAssessment)

    return NextResponse.json({
      success: true,
      scanResult,
      message: "Environment scan completed",
    })
  } catch (error) {
    console.error("[Security] Error processing environment scan:", error)
    return NextResponse.json({ success: false, message: "Failed to process environment scan" }, { status: 500 })
  }
}

function getScanRecommendation(riskScore: number): string {
  if (riskScore >= 75) {
    return "High risk - Assessment should be blocked or conducted under strict supervision"
  } else if (riskScore >= 50) {
    return "Medium risk - Enhanced monitoring recommended"
  } else if (riskScore >= 25) {
    return "Low risk - Standard monitoring sufficient"
  } else {
    return "Minimal risk - Proceed with normal assessment"
  }
}
