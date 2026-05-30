import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001"

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/realtime-notifications`, {
      method: "GET",
      headers: {
        Authorization: request.headers.get("Authorization") || "",
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Realtime notifications error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
