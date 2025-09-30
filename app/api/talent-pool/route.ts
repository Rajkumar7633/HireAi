import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/mongodb"
import User from "@/models/User"
import JobDescription from "@/models/JobDescription"
import { getSession } from "@/lib/auth"
import { computeProfileScore, getLatestAssessmentScore } from "@/lib/scoring"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") || ""
    const minScore = Number(searchParams.get("minScore") || 0)
    const sortParam = searchParams.get("sort") || "score" // score|recent|job
    const skillsParam = searchParams.get("skills") || ""
    const minYearsParam = searchParams.get("minYears") || ""
    const jobId = searchParams.get("jobId") || ""
    const page = Number(searchParams.get("page") || 1)
    const limit = Math.min(Number(searchParams.get("limit") || 20), 50)

    const skip = (page - 1) * limit

    const query: any = { role: "job_seeker" }
    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { professionalSummary: { $regex: q, $options: "i" } },
      ]
    }
    if (!isNaN(minScore) && minScore > 0) {
      query.profileScore = { $gte: minScore }
    }
    // Skills filter (any match)
    const skills = skillsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (skills.length > 0) {
      query.skills = { $in: skills }
    }
    // Min years of experience
    const minYears = Number(minYearsParam)
    if (!isNaN(minYears) && minYears > 0) {
      query.yearsOfExperience = { $gte: minYears }
    }

    const sort: any = {}
    if (sortParam === "recent") sort.updatedAt = -1
    else if (sortParam === "score") sort.profileScore = -1
    // when sort=job, we'll sort after enrichment

    const result = await executeQuery(async () => {
      const [items, total] = await Promise.all([
        User.find(query)
          .select(
            "name email profileImage professionalSummary linkedinUrl businessLocation isProfileComplete profileScore scores updatedAt lastScoreComputedAt skills yearsOfExperience projects achievements"
          )
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(query),
      ])

      // Attach last assessment summary
      const enriched = await Promise.all(
        items.map(async (u: any) => {
          let latestAssessment: any = null
          try {
            latestAssessment = await getLatestAssessmentScore(String(u._id))
          } catch {}
          // If profileScore missing or zero, compute and persist a fresh score (best-effort)
          try {
            const currentScore = Number(u.profileScore || u?.scores?.total || 0)
            if (!currentScore || currentScore === 0) {
              const userDoc = await User.findById(u._id)
              if (userDoc) {
                const breakdown = await computeProfileScore(userDoc as any)
                userDoc.scores = breakdown as any
                userDoc.profileScore = breakdown.total
                ;(userDoc as any).scoreVersion = 1
                ;(userDoc as any).lastScoreComputedAt = new Date()
                await userDoc.save()
                u.scores = breakdown as any
                u.profileScore = breakdown.total
              }
            }
          } catch (e) {
            // non-fatal
          }
          return {
            ...u,
            latestAssessment,
          }
        })
      )

      // If jobId is provided and sort=job, compute job match score and composite
      let jobDoc: any = null
      if (jobId) {
        try {
          jobDoc = await JobDescription.findById(jobId).select("skillsRequired experience title").lean()
        } catch {}
      }

      let final = enriched
      if (sortParam === "job" && jobDoc) {
        const reqSkills: string[] = (jobDoc.skillsRequired || []).map((s: string) => (s || "").toLowerCase())
        const reqCount = reqSkills.length || 1
        // crude years parsing from job.experience string: e.g., "3+ years"
        let reqYears = 0
        if (typeof jobDoc.experience === "string") {
          const m = jobDoc.experience.toLowerCase().match(/(\d+)/)
          if (m) reqYears = parseInt(m[1] || "0", 10)
        }

        final = enriched.map((u: any) => {
          const skills: string[] = (u.skills || []).map((s: string) => (s || "").toLowerCase())
          const overlap = skills.filter((s) => reqSkills.includes(s))
          const skillsPct = Math.min(100, Math.round((overlap.length / reqCount) * 100))
          const years = Number(u.yearsOfExperience || 0)
          const yearsPct = reqYears > 0 ? Math.min(100, Math.round((Math.min(years, reqYears) / reqYears) * 100)) : 100
          const jobMatchScore = Math.round(0.8 * skillsPct + 0.2 * yearsPct) // weight skills heavier
          const profileScore = Number(u.profileScore || u.scores?.total || 0)
          const finalScore = Math.round(0.7 * profileScore + 0.3 * jobMatchScore)
          return { ...u, jobMatchScore, finalScore }
        })

        // Sort by job-aware finalScore desc
        final.sort((a: any, b: any) => (b.finalScore || 0) - (a.finalScore || 0))
      }

      return { items: final, total }
    }, "list-talent-pool")

    return NextResponse.json({
      success: true,
      page,
      limit,
      total: result.total,
      candidates: result.items,
      jobId,
    })
  } catch (error: any) {
    console.error("[talent-pool][GET] error:", error)
    return NextResponse.json({ success: false, message: error.message || "Failed to load" }, { status: 500 })
  }
}
