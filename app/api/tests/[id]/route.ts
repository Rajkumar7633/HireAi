import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Test from "@/models/Test"
import Application from "@/models/Application"
import { getCollegeAssignmentModel, getFlexTestModel } from "@/lib/flex-test"
export { dynamic } from "@/lib/api-dynamic"


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

      let hasCollegeAssignment = false
      if (!hasApplication) {
        const AssignmentModel = getCollegeAssignmentModel()
        hasCollegeAssignment = !!(await AssignmentModel.exists({
          testId: params.id,
          studentIds: { $in: [session.userId, String(session.userId)] },
        }))
      }

      if (!hasApplication && !hasCollegeAssignment) {
        return NextResponse.json({ message: "Test not assigned to this user" }, { status: 403 })
      }

      let test = await Test.findById(params.id).lean() as any

      if (!test) {
        const FlexTest = getFlexTestModel()
        test = await FlexTest.findById(params.id).lean()
      }

      // Tests may live in the Express backend collection with a slightly different shape
      if (!test) {
        const token = request.cookies.get("auth-token")?.value
        if (token) {
          try {
            const response = await fetch(`${BACKEND_URL}/api/tests/${params.id}`, {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            })
            if (response.ok) {
              const data = await response.json()
              test = data.test || data
            }
          } catch {
            // fall through to 404
          }
        }
      }

      if (!test) {
        return NextResponse.json({ message: "Test not found" }, { status: 404 })
      }

      const durationMinutes = test.durationMinutes ?? test.timeLimit ?? 30

      // ✅ SECURITY: Strip correctAnswer (and hidden test cases) before sending to candidate
      const safeTest = {
        ...test,
        durationMinutes,
        timeLimit: test.timeLimit ?? durationMinutes,
        settings: test.settings || {},
        questions: (test.questions || []).map((q: any, i: number) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { correctAnswer, testCases, ...safeQuestion } = q
          const hiddenCount = (testCases || []).filter((tc: any) => tc.hidden).length
          return {
            ...safeQuestion,
            _id: safeQuestion._id || safeQuestion.id || String(i),
            questionText: safeQuestion.questionText || safeQuestion.question || "",
            type: safeQuestion.type === "coding" ? "code_snippet" : safeQuestion.type,
            hiddenTestCaseCount: hiddenCount,
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

  // Recruiter / admin path: try backend first, fall back to MongoDB
  const { id } = params
  const token = request.cookies.get("auth-token")?.value

  if (token) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8_000)

      const response = await fetch(`${BACKEND_URL}/api/tests/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        return NextResponse.json(data, { status: 200 })
      }
    } catch {
      // Backend unavailable — fall through to MongoDB fallback
    }
  }

  // MongoDB fallback for recruiters when backend is unavailable
  try {
    await connectDB()
    const test = await Test.findById(id).lean() as any
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }
    return NextResponse.json(test, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching test by ID:", error)
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
