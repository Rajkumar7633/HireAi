import { type NextRequest, NextResponse } from "next/server"
export { dynamic } from "@/lib/api-dynamic"


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15_000)

    const response = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    if (error.name === "AbortError") {
      return NextResponse.json({ message: "Request timed out" }, { status: 504 })
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
