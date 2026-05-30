import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

// GET /api/college/profile - Get college profile
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "college") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/college/profile?userId=${session.userId}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.msg || "Failed to fetch profile" }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching college profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PUT /api/college/profile - Update college profile
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "college") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/college/profile?userId=${session.userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ error: data.msg || "Failed to update profile" }, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating college profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
