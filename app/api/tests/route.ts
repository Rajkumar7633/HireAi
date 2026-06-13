import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Test from "@/models/Test"
import mongoose from "mongoose"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

// GET — list recruiter's tests (proxies to backend, falls back to MongoDB)
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value

  if (token) {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 8_000)
    try {
      const res = await fetch(`${BACKEND_URL}/api/tests/my-tests`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      })
      clearTimeout(tid)
      if (res.ok) return NextResponse.json(await res.json(), { status: 200 })
    } catch {
      clearTimeout(tid)
    }
  }

  // MongoDB fallback
  try {
    await connectDB()
    const tests = await (Test as any).find({ recruiterId: session.userId }).sort({ createdAt: -1 }).lean()
    return NextResponse.json(tests ?? [], { status: 200 })
  } catch {
    return NextResponse.json({ message: "Failed to fetch tests." }, { status: 500 })
  }
}

// POST — create test (proxies to backend, falls back to direct MongoDB save)
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 })
  }

  if (token) {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 10_000)
    try {
      const res = await fetch(`${BACKEND_URL}/api/tests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(tid)
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ message: data.msg || "Test created", test: data.test }, { status: 201 })
      }
      // Backend returned error — try to read message
      const errData = await res.json().catch(() => ({}))
      const errMsg = (errData as any).msg || (errData as any).message || "Failed to create test"
      return NextResponse.json({ message: errMsg }, { status: res.status })
    } catch {
      clearTimeout(tid)
      // Fall through to MongoDB fallback
    }
  }

  // MongoDB fallback — save directly when backend unreachable
  try {
    await connectDB()

    if (!body.title?.trim()) {
      return NextResponse.json({ message: "Title is required" }, { status: 400 })
    }

    const testData = {
      recruiterId: new mongoose.Types.ObjectId(session.userId),
      title: body.title.trim(),
      description: body.description || "",
      durationMinutes: body.durationMinutes || 90,
      questions: (body.questions || []).map((q: any) => ({
        questionText: q.questionText || q.question || "",
        type: q.type || "short_answer",
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
      passingScore: body.passingScore ?? body.passScore ?? 70,
      createdAt: new Date(),
    }

    const TestModel = (Test as any).db
      ? Test
      : mongoose.models.Test || mongoose.model("Test", new mongoose.Schema({}, { strict: false }))

    const newTest = await (TestModel as any).create(testData)
    return NextResponse.json({ message: "Test created successfully", test: newTest }, { status: 201 })
  } catch (error: any) {
    console.error("[tests POST] MongoDB fallback error:", error)
    return NextResponse.json({ message: "Failed to create test." }, { status: 500 })
  }
}
