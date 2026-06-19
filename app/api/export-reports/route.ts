import { type NextRequest, NextResponse } from "next/server"
export { dynamic } from "@/lib/api-dynamic"


const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await fetch(`${BACKEND_URL}/api/export-reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("Authorization") || "",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Export reports error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}