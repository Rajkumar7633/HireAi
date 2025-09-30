import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/mongodb"
import User from "@/models/User"
import { getSession } from "@/lib/auth"
import { computeProfileScore } from "@/lib/scoring"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { userIds, limit = 200 } = body || {}

    const query: any = { role: "job_seeker" }
    if (Array.isArray(userIds) && userIds.length > 0) {
      query._id = { $in: userIds }
    }

    const { updatedCount } = await executeQuery(async () => {
      const candidates = await User.find(query)
        .select("name professionalSummary isProfileComplete linkedinUrl updatedAt scores profileScore scoreVersion")
        .limit(Math.min(limit, 1000))

      let count = 0
      for (const u of candidates) {
        const breakdown = await computeProfileScore(u as any)
        u.scores = breakdown as any
        u.profileScore = breakdown.total
        u.scoreVersion = 1
        ;(u as any).lastScoreComputedAt = new Date()
        await u.save()
        count++
      }
      return { updatedCount: count }
    }, "recompute-talent-pool-scores")

    return NextResponse.json({ success: true, updatedCount })
  } catch (error: any) {
    console.error("[talent-pool/recompute][POST] error:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to recompute" }, { status: 500 })
  }
}
