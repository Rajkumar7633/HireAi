import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, ...data } = body

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = "/api/calendar"

    switch (action) {
      case "sync":
        endpoint += "/sync"
        break
      case "create-event":
        endpoint += "/event"
        break
      default:
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
    console.error("Calendar API error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const availability = searchParams.get("availability")

    if (availability) {
      const startDate = searchParams.get("startDate")
      const endDate = searchParams.get("endDate")
      const provider = searchParams.get("provider")
      const accessToken = searchParams.get("accessToken")

      const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      if (provider) params.append("provider", provider)
      if (accessToken) params.append("accessToken", accessToken)

      const response = await fetch(`${backendUrl}/api/calendar/availability?${params}`)
      const data = await response.json()

      if (!response.ok) {
        return NextResponse.json({ message: data.msg || "Request failed" }, { status: response.status })
      }

      return NextResponse.json(data, { status: 200 })
    }

    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Get calendar error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { eventId, ...data } = await req.json()

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/calendar/event/${eventId}`, {
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
    console.error("Update calendar error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get("eventId")
    const provider = searchParams.get("provider")
    const accessToken = searchParams.get("accessToken")

    if (!eventId || !provider || !accessToken) {
      return NextResponse.json({ message: "Missing required parameters" }, { status: 400 })
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const params = new URLSearchParams()
    params.append("provider", provider)
    params.append("accessToken", accessToken)

    const response = await fetch(`${backendUrl}/api/calendar/event/${eventId}?${params}`, {
      method: "DELETE",
    })

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Delete failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Delete calendar error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
