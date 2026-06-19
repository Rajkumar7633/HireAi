import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import {
  assertCollegeOwnsTest,
  getCollegeAssignedCandidates,
} from "@/lib/college-test-stats"
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
    const test = await assertCollegeOwnsTest(params.id, session!.userId)
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    const assigned = await getCollegeAssignedCandidates(params.id, session!.userId)
    return NextResponse.json({ assigned })
  } catch (error) {
    console.error("[college/tests assignments GET]", error)
    return NextResponse.json({ message: "Failed to load assignments" }, { status: 500 })
  }
}
