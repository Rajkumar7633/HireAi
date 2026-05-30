import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

// GET /api/college/analytics - Get college analytics
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "college") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const year = searchParams.get("year")
    const department = searchParams.get("department")
    const branch = searchParams.get("branch")

    const params = new URLSearchParams()
    if (year) params.append("year", year)
    if (department) params.append("department", department)
    if (branch) params.append("branch", branch)

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/college/analytics?${params}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.msg || "Failed to fetch analytics" }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching college analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
