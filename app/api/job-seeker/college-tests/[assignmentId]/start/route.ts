import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { getCollegeAssignmentModel } from "@/lib/flex-test"
export { dynamic } from "@/lib/api-dynamic"


export async function POST(
  req: NextRequest,
  { params }: { params: { assignmentId: string } },
) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const AssignmentModel = getCollegeAssignmentModel()
    const assignment = await AssignmentModel.findById(params.assignmentId)

    if (!assignment) {
      return NextResponse.json({ message: "Assignment not found" }, { status: 404 })
    }

    const studentIds = (assignment.studentIds as string[]) || []
    const userId = session.userId
    if (!studentIds.some((sid) => String(sid) === userId)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const completions = assignment.completions || []
    const alreadyDone = completions.find(
      (c: { studentId?: string; status?: string }) =>
        String(c.studentId) === userId && c.status === "completed",
    )
    if (alreadyDone) {
      return NextResponse.json({ message: "Test already completed" }, { status: 400 })
    }

    const updated = completions.map((c: { studentId?: string }) =>
      String(c.studentId) === userId
        ? { ...c, studentId: userId, status: "in_progress", startedAt: new Date() }
        : c,
    )

    if (!updated.some((c: { studentId?: string }) => String(c.studentId) === userId)) {
      updated.push({ studentId: userId, status: "in_progress", startedAt: new Date() })
    }

    assignment.completions = updated
    assignment.markModified("completions")
    await assignment.save()

    return NextResponse.json({ ok: true, status: "in_progress" })
  } catch (error) {
    console.error("[college-tests start]", error)
    return NextResponse.json({ message: "Failed to start test" }, { status: 500 })
  }
}
