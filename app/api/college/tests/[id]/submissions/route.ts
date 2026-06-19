import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCollegeTestSubmissions } from "@/lib/college-test-stats"
import { enrichSubmissionRecord } from "@/lib/enrich-submission"
export { dynamic } from "@/lib/api-dynamic"


function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(request)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await getCollegeTestSubmissions(params.id, session!.userId)
    if (!result) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    const enriched = await Promise.all(
      result.submissions.map(async (sub) => {
        try {
          return await enrichSubmissionRecord(sub, params.id)
        } catch {
          return sub
        }
      }),
    )

    const { stats } = result
    return NextResponse.json(enriched, {
      status: 200,
      headers: {
        "X-Total-Assigned": String(stats.totalAssigned),
        "X-Completed-Count": String(stats.completedCount),
        "X-In-Progress-Count": String(stats.inProgressCount),
      },
    })
  } catch (error) {
    console.error("[college/tests submissions GET]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
