import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
export { dynamic } from "@/lib/api-dynamic"


export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"

    const response = await fetch(`${backendUrl}/api/student-tracking/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Student tracking API error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get("studentId")
    const collegeId = searchParams.get("collegeId")
    const analytics = searchParams.get("analytics")

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = "/api/student-tracking"

    if (studentId) {
      endpoint = `/api/student-tracking/student/${studentId}`
    } else if (collegeId) {
      if (analytics) {
        endpoint = `/api/student-tracking/analytics/${collegeId}`
      } else {
        endpoint = `/api/student-tracking/college/${collegeId}`
      }
    }

    const response = await fetch(`${backendUrl}${endpoint}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Get student tracking error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { trackingId, action, ...data } = await req.json()

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = `/api/student-tracking/${trackingId}`

    if (action === "update-progress") {
      endpoint += "/update-progress"
    } else if (action === "update-readiness") {
      endpoint += "/update-readiness"
    } else if (action === "add-alert") {
      endpoint += "/add-alert"
    } else if (action === "add-recommendation") {
      endpoint += "/add-recommendation"
    }

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: responseData.msg || "Update failed" }, { status: response.status })
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("Update student tracking error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
