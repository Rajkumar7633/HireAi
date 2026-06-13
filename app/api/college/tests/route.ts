import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"

function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

function getTestModel() {
  const schema = new mongoose.Schema({}, { strict: false, timestamps: true })
  return mongoose.models.CollegeOwnedTest || mongoose.model("CollegeOwnedTest", schema, "tests")
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const TestModel = getTestModel()
    const collegeId = session!.userId
    const tests = await TestModel.find({
      $or: [
        { collegeId: collegeId },
        { collegeId: new mongoose.Types.ObjectId(collegeId) },
        { ownerType: "college", createdBy: new mongoose.Types.ObjectId(collegeId) },
      ],
    })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(Array.isArray(tests) ? tests : [])
  } catch (error) {
    console.error("[college/tests GET]", error)
    return NextResponse.json({ message: "Failed to fetch tests" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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

  if (!body.title || !String(body.title).trim()) {
    return NextResponse.json({ message: "Title is required" }, { status: 400 })
  }

  try {
    await connectDB()
    const TestModel = getTestModel()
    const questions = Array.isArray(body.questions) ? body.questions : []

    const testData = {
      collegeId: new mongoose.Types.ObjectId(session!.userId),
      createdBy: new mongoose.Types.ObjectId(session!.userId),
      recruiterId: new mongoose.Types.ObjectId(session!.userId),
      ownerType: "college",
      title: String(body.title).trim(),
      description: body.description || "",
      durationMinutes: body.durationMinutes || body.timeLimit || 60,
      timeLimit: body.durationMinutes || body.timeLimit || 60,
      passingScore: body.passingScore || 60,
      maxAttempts: body.maxAttempts || 1,
      isPublic: body.isPublic || false,
      questions: questions.map((q: any) => ({
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
      })),
      settings: body.settings || {},
      createdAt: new Date(),
    }

    const newTest = await TestModel.create(testData)
    return NextResponse.json({ message: "Test created", test: newTest }, { status: 201 })
  } catch (error: any) {
    console.error("[college/tests POST]", error)
    return NextResponse.json({ message: error.message || "Failed to create test" }, { status: 500 })
  }
}
