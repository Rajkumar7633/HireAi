import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value
  if (!token) return NextResponse.json({ message: "No auth token" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 35_000)

    const response = await fetch(`${BACKEND_URL}/api/recruiter-agent/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch (error: any) {
    if (error.name === "AbortError") {
      return NextResponse.json({ message: "Agent execution timed out. Please try again." }, { status: 504 })
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
