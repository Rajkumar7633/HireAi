import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
export { dynamic } from "@/lib/api-dynamic"


export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, ...data } = body

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = "/api/interview-scorecards"

    if (action === "create") {
      endpoint += "/create"
    } else {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()
    if (!response.ok) {
      return NextResponse.json({ message: responseData.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("Interview scorecards API error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    const { searchParams } = new URL(req.url)
    const scorecardId = searchParams.get("id")
    const applicationId = searchParams.get("applicationId")

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = "/api/interview-scorecards"

    if (scorecardId) {
      endpoint += `/${scorecardId}`
    } else if (applicationId) {
      endpoint += `/application/${applicationId}`
    }

    const response = await fetch(`${backendUrl}${endpoint}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Get interview scorecards error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { scorecardId, action, ...data } = await req.json()

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = `/api/interview-scorecards/${scorecardId}`

    if (action === "submit") {
      endpoint += "/submit"
    } else if (action === "review") {
      endpoint += "/review"
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
    console.error("Update interview scorecards error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
