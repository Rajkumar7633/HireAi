import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

/**
 * POST /api/applications/[id]/submit-test
 * Submits a candidate's test answers for a given application.
 * Proxies to backend /api/applications/:id/submit-test.
 * Only job_seekers may call this.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req)

  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value
  if (!token) {
    return NextResponse.json({ message: "No authentication token found" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
  }

  const { id } = params
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000) // allow longer for scoring

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/applications/${id}/submit-test`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { message: (errorData as any).msg || (errorData as any).message || "Failed to submit test" },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(
      {
        message: data.msg || "Test submitted successfully",
        score: data.score,
        submissionId: data.submissionId,
        application: data.application,
      },
      { status: 200 }
    )
  } catch (error: any) {
    clearTimeout(timeoutId)
    console.error("[applications/submit-test] Error:", error)

    if (error.name === "AbortError") {
      return NextResponse.json(
        { message: "Request timed out. Please check your connection and try again." },
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
