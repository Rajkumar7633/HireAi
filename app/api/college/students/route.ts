import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

// GET /api/college/students - Get all students for college
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "college" && session.role !== "college_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const department = searchParams.get("department")
    const branch = searchParams.get("branch")
    const year = searchParams.get("year")
    const placementStatus = searchParams.get("placementStatus")

    const params = new URLSearchParams()
    if (department) params.append("department", department)
    if (branch) params.append("branch", branch)
    if (year) params.append("year", year)
    if (placementStatus) params.append("placementStatus", placementStatus)

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5001"
    const response = await fetch(`${backendUrl}/api/college/students?${params}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.msg || "Failed to fetch students" }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching college students:", error)
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 })
  }
}

// POST /api/college/students - Add student to college
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "college" && session.role !== "college_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5001"
    const response = await fetch(`${backendUrl}/api/college/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.msg || "Failed to add student" }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error adding college student:", error)
    return NextResponse.json({ error: "Failed to add student" }, { status: 500 })
  }
}
