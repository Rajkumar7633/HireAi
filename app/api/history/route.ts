import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { buildActivityTimeline } from "@/lib/activity-timeline"

export const dynamic = "force-dynamic"

// GET /api/history — unified activity timeline with pipeline metadata
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const days = searchParams.get("days")

    const result = await buildActivityTimeline(session.userId, session.role)

    let entries = result.entries

    if (category && category !== "all") {
      entries = entries.filter((e) => e.category === category)
    }

    if (days) {
      const n = parseInt(days, 10)
      if (!Number.isNaN(n) && n > 0) {
        const cutoff = Date.now() - n * 24 * 60 * 60 * 1000
        entries = entries.filter((e) => new Date(e.createdAt).getTime() >= cutoff)
      }
    }

    return NextResponse.json({
      entries,
      stats: result.stats,
      pipelineSummary: result.pipelineSummary,
      role: session.role,
    })
  } catch (error) {
    console.error("History GET error:", error)
    return NextResponse.json({ message: "Failed to fetch history" }, { status: 500 })
  }
}
