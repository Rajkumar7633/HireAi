import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
export { dynamic } from "@/lib/api-dynamic"


export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    const body = await req.json()
    const { action, ...data } = body

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"

    let endpoint = "/api/referral"
    let method = "POST"

    switch (action) {
      case "create":
        endpoint = "/api/referral/create"
        break
      case "apply":
        endpoint = "/api/referral/apply"
        break
      default:
        return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" }

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method,
      headers,
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: responseData.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("Referral API error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    const { searchParams } = new URL(req.url)
    const referralCode = searchParams.get("code")
    const leaderboard = searchParams.get("leaderboard")
    const myReferrals = searchParams.get("my-referrals")

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = "/api/referral"

    if (referralCode) {
      endpoint = `/api/referral/code/${referralCode}`
    } else if (leaderboard) {
      endpoint = "/api/referral/leaderboard"
    } else if (myReferrals) {
      endpoint = "/api/referral/my-referrals"
    }

    const headers: Record<string, string> = {}

    const response = await fetch(`${backendUrl}${endpoint}`, { headers })
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Get referral error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { referralId, action, ...data } = await req.json()

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = `/api/referral/${referralId}`

    if (action === "update-status") {
      endpoint += "/update-status"
    } else if (action === "approve-bonus") {
      endpoint += "/approve-bonus"
    } else if (action === "pay-bonus") {
      endpoint += "/pay-bonus"
    }

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: responseData.msg || "Update failed" }, { status: response.status })
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("Update referral error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
