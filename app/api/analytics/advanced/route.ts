import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const recruiterDashboard = searchParams.get("recruiter-dashboard")
    const timeseries = searchParams.get("timeseries")
    const skillDemand = searchParams.get("skill-demand")
    const candidateQuality = searchParams.get("candidate-quality")

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = "/api/analytics"

    if (recruiterDashboard) {
      endpoint += "/recruiter-dashboard"
    } else if (timeseries) {
      endpoint += "/timeseries"
    } else if (skillDemand) {
      endpoint += "/skill-demand"
    } else if (candidateQuality) {
      endpoint += "/candidate-quality"
    }

    // Append query params for timeseries
    if (timeseries) {
      const period = searchParams.get("period") || "30d"
      const metric = searchParams.get("metric") || "applications"
      endpoint += `?period=${period}&metric=${metric}`
    }

    const response = await fetch(`${backendUrl}${endpoint}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Advanced analytics API error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
