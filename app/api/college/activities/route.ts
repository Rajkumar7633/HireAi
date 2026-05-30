import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

// GET /api/college/activities - Get recent activities
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "college") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/college/activities`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.msg || "Failed to fetch activities" }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching college activities:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}
