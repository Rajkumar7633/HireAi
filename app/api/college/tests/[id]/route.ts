import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { getFlexTestModel } from "@/lib/flex-test"
import { assertCollegeOwnsTest } from "@/lib/college-test-stats"
import mongoose from "mongoose"
export { dynamic } from "@/lib/api-dynamic"


function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

function collegeOwnershipFilter(collegeId: string) {
  const collegeOid = mongoose.Types.ObjectId.isValid(collegeId)
    ? new mongoose.Types.ObjectId(collegeId)
    : null
  return {
    $or: [
      { collegeId },
      ...(collegeOid ? [{ collegeId: collegeOid }] : []),
      ...(collegeOid ? [{ ownerType: "college", createdBy: collegeOid }] : []),
    ],
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const test = await assertCollegeOwnsTest(params.id, session!.userId)
    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }
    return NextResponse.json(test)
  } catch (error) {
    console.error("[college/tests GET id]", error)
    return NextResponse.json({ message: "Failed to fetch test" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 })
  }

  try {
    await connectDB()
    const FlexTest = getFlexTestModel()
    const existing = await assertCollegeOwnsTest(params.id, session!.userId)
    if (!existing) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (body.title != null) update.title = String(body.title).trim()
    if (body.description != null) update.description = body.description
    if (body.durationMinutes != null) {
      update.durationMinutes = body.durationMinutes
      update.timeLimit = body.durationMinutes
    }
    if (body.passingScore != null) update.passingScore = body.passingScore
    if (body.maxAttempts != null) update.maxAttempts = body.maxAttempts
    if (body.settings != null) update.settings = body.settings

    if (Array.isArray(body.questions)) {
      update.questions = body.questions.map((q: Record<string, unknown>) => ({
        questionText: q.questionText || q.question || "",
        type: q.type || "multiple_choice",
        options: q.options || [],
        correctAnswer: q.correctAnswer || "",
        points: q.points || 10,
        language: q.language,
        starterCode: q.starterCode,
        testCases: q.testCases || [],
        difficulty: q.difficulty || "Medium",
        tags: q.tags || [],
        constraints: q.constraints || "",
        examples: q.examples || [],
        timeLimitMs: q.timeLimitMs || 2000,
        memoryLimitMb: q.memoryLimitMb || 256,
      }))
    }

    const test = await FlexTest.findOneAndUpdate(
      { _id: params.id, ...collegeOwnershipFilter(session!.userId) },
      { $set: update },
      { new: true },
    ).lean()

    if (!test) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Test updated", test })
  } catch (error) {
    console.error("[college/tests PUT]", error)
    return NextResponse.json({ message: "Failed to update test" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getSession(req)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const FlexTest = getFlexTestModel()
    const result = await FlexTest.deleteOne({
      _id: params.id,
      ...collegeOwnershipFilter(session!.userId),
    })
    if (result.deletedCount === 0) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[college/tests DELETE]", error)
    return NextResponse.json({ message: "Failed to delete test" }, { status: 500 })
  }
}
