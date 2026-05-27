import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Test from "@/models/Test"
import Application from "@/models/Application"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(request)

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  // Job seeker path: read directly from Mongo and enforce that this test
  // is actually assigned to one of their applications.
  if (session.role === "job_seeker") {
    try {
      await connectDB()

      const hasApplication = await Application.exists({
        jobSeekerId: session.userId,
        testId: params.id,
      })

      if (!hasApplication) {
        return NextResponse.json({ message: "Test not assigned to this user" }, { status: 403 })
      }

      const test = await Test.findById(params.id).lean() as any
      if (!test) {
        return NextResponse.json({ message: "Test not found" }, { status: 404 })
      }

      // ✅ SECURITY: Strip correctAnswer (and hidden test cases) before sending to candidate
      const safeTest = {
        ...test,
        questions: (test.questions || []).map((q: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { correctAnswer, testCases, ...safeQuestion } = q
          return {
            ...safeQuestion,
            // Only send non-hidden test cases (visible examples only)
            testCases: (testCases || [])
              .filter((tc: any) => !tc.hidden)
              .map(({ input, expectedOutput }: any) => ({ input, expectedOutput })),
          }
        }),
      }

      return NextResponse.json(safeTest, { status: 200 })
    } catch (error) {
      console.error("Error fetching test for job seeker:", error)
      return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
  }

  // Recruiter / admin path: proxy to backend tests route
  try {
    const { id } = params
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ message: "No authentication token found" }, { status: 401 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(`${BACKEND_URL}/api/tests/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { message: (errorData as any).msg || "Failed to fetch test" },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching test by ID:", error)
    if (error.name === "AbortError") {
      return NextResponse.json({ message: "Backend timeout" }, { status: 504 })
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }

}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(request)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await request.json()
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ message: "No authentication token found" }, { status: 401 })
    }

    const response = await fetch(`${BACKEND_URL}/api/tests/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to update test" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg, test: data.test }, { status: 200 })
  } catch (error) {
    console.error("Error updating test:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(request)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ message: "No authentication token found" }, { status: 401 })
    }

    const response = await fetch(`${BACKEND_URL}/api/tests/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to delete test" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg }, { status: 200 })
  } catch (error) {
    console.error("Error deleting test:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
