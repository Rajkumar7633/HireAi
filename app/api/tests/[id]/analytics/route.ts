import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import { getTestAssignmentStats } from "@/lib/test-assignment-stats"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

async function fetchAnalyticsFromMongo(testId: string) {
  await connectDB()

  const FlexTest =
    mongoose.models.FlexTest ||
    mongoose.model("FlexTest", new mongoose.Schema({}, { strict: false }), "tests")
  const test = await FlexTest.findById(testId).lean() as any
  if (!test) return null

  const stats = await getTestAssignmentStats(testId)
  const passingScore = test.passingScore ?? 70

  return {
    testId: test._id,
    title: test.title,
    passingScore,
    durationMinutes: test.durationMinutes ?? test.timeLimit ?? 90,
    totalAssigned: stats.totalAssigned,
    totalAttempts: stats.totalAttempts,
    completedCount: stats.completedCount,
    averageScore: stats.averageScore,
    passRate: stats.passRate,
    avgPlagiarismScore: 0,
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(request)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const { id } = params
  const token = request.cookies.get("auth-token")?.value

  try {
    const mongoAnalytics = await fetchAnalyticsFromMongo(id)
    if (!mongoAnalytics) {
      return NextResponse.json({ message: "Test not found" }, { status: 404 })
    }

    if (token) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/tests/${id}/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })

        if (response.ok) {
          const backend = await response.json()
          return NextResponse.json({
            ...mongoAnalytics,
            averageScore: mongoAnalytics.totalAttempts > 0
              ? mongoAnalytics.averageScore
              : (backend.averageScore ?? mongoAnalytics.averageScore),
            passRate: mongoAnalytics.totalAttempts > 0
              ? mongoAnalytics.passRate
              : (backend.passRate ?? mongoAnalytics.passRate),
            totalAttempts: mongoAnalytics.totalAttempts > 0
              ? mongoAnalytics.totalAttempts
              : (backend.totalAttempts ?? 0),
            completedCount: mongoAnalytics.completedCount > 0
              ? mongoAnalytics.completedCount
              : (backend.totalAttempts ?? 0),
            totalAssigned: mongoAnalytics.totalAssigned > 0
              ? mongoAnalytics.totalAssigned
              : (backend.totalAssigned ?? 0),
          }, { status: 200 })
        }
      } catch {
        /* use mongo only */
      }
    }

    return NextResponse.json(mongoAnalytics, { status: 200 })
  } catch (error) {
    console.error("Error fetching test analytics:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
