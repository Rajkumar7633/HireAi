import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "job_seeker")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, ...data } = body

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    
    let endpoint = "/api/offer-letter"
    let method = "POST"

    switch (action) {
      case "create":
        endpoint = "/api/offer-letter/create"
        break
      case "send":
        endpoint = `/api/offer-letter/${data.offerLetterId}/send`
        break
      case "accept":
        endpoint = `/api/offer-letter/${data.offerLetterId}/accept`
        break
      case "reject":
        endpoint = `/api/offer-letter/${data.offerLetterId}/reject`
        break
      case "generate-pdf":
        endpoint = `/api/offer-letter/${data.offerLetterId}/generate-pdf`
        break
      default:
        return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: responseData.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("Offer letter API error:", error)
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
    const applicationId = searchParams.get("applicationId")
    const offerLetterId = searchParams.get("id")

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = "/api/offer-letter"

    if (applicationId) {
      endpoint = `/api/offer-letter/application/${applicationId}`
    } else if (offerLetterId) {
      endpoint = `/api/offer-letter/${offerLetterId}`
    }

    const response = await fetch(`${backendUrl}${endpoint}`)
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Get offer letter error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { offerLetterId, ...data } = await req.json()

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/offer-letter/${offerLetterId}/update`, {
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
    console.error("Update offer letter error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const offerLetterId = searchParams.get("id")

    if (!offerLetterId) {
      return NextResponse.json({ message: "Offer letter ID is required" }, { status: 400 })
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/offer-letter/${offerLetterId}`, {
      method: "DELETE",
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Delete failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Delete offer letter error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
