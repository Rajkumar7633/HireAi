import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getCollegeTestAssignmentStats } from "@/lib/college-test-stats"
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
    const stats = await getCollegeTestAssignmentStats(params.id, session!.userId)
    if (!stats) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    const test = stats.test
    return NextResponse.json({
      testId: params.id,
      title: test.title,
      passingScore: stats.passingScore,
      durationMinutes: (test.durationMinutes as number) ?? (test.timeLimit as number) ?? 90,
      totalAssigned: stats.totalAssigned,
      totalAttempts: stats.completedCount,
      completedCount: stats.completedCount,
      inProgressCount: stats.inProgressCount,
      notStartedCount: stats.notStartedCount,
      completionRate: stats.totalAssigned
        ? Math.round((stats.completedCount / stats.totalAssigned) * 100)
        : 0,
      averageScore: stats.averageScore,
      passRate: stats.passRate,
      avgPlagiarismScore: 0,
    })
  } catch (error) {
    console.error("[college/tests analytics GET]", error)
    return NextResponse.json({ message: "Failed to load analytics" }, { status: 500 })
  }
}
