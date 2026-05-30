import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

// GET /api/college/campus-drives - Get all campus drives
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "college") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    const params = new URLSearchParams()
    if (status) params.append("status", status)

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/college/campus-drives?${params}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.msg || "Failed to fetch campus drives" }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching campus drives:", error)
    return NextResponse.json({ error: "Failed to fetch campus drives" }, { status: 500 })
  }
}

// POST /api/college/campus-drives - Create campus drive
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "college") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/college/campus-drives`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.msg || "Failed to create campus drive" }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating campus drive:", error)
    return NextResponse.json({ error: "Failed to create campus drive" }, { status: 500 })
  }
}
