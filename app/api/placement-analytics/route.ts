import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const collegeId = searchParams.get("collegeId")
    const overview = searchParams.get("overview")
    const skillsHeatmap = searchParams.get("skills-heatmap")
    const leaderboard = searchParams.get("leaderboard")
    const placementFunnel = searchParams.get("placement-funnel")
    const companyPerformance = searchParams.get("company-performance")

    if (!collegeId) {
      return NextResponse.json({ message: "College ID is required" }, { status: 400 })
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = `/api/placement-analytics/${collegeId}`

    if (overview) {
      endpoint += "/overview"
    } else if (skillsHeatmap) {
      endpoint += "/skills-heatmap"
    } else if (leaderboard) {
      endpoint += "/leaderboard"
    } else if (placementFunnel) {
      endpoint += "/placement-funnel"
    } else if (companyPerformance) {
      endpoint += "/company-performance"
    }

    const response = await fetch(`${backendUrl}${endpoint}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Placement analytics API error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
