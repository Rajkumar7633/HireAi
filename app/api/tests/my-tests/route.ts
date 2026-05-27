import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

/**
 * GET /api/tests/my-tests
 * Returns all tests created by the authenticated recruiter.
 * Proxies to backend /api/tests/my-tests.
 */
export async function GET(req: NextRequest) {
  const session = await getSession(req)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value
  if (!token) {
    return NextResponse.json({ message: "No authentication token found" }, { status: 401 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  try {
    const response = await fetch(`${BACKEND_URL}/api/tests/my-tests`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { message: (errorData as any).msg || "Failed to fetch tests" },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    clearTimeout(timeoutId)
    console.error("[tests/my-tests] Error:", error)

    if (error.name === "AbortError") {
      return NextResponse.json(
        { message: `Backend timeout. Check if backend is running on ${BACKEND_URL}` },
        { status: 504 }
      )
    }
    if (error.code === "ECONNREFUSED") {
      return NextResponse.json(
        { message: `Cannot connect to backend at ${BACKEND_URL}. Is it running?` },
        { status: 503 }
      )
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
