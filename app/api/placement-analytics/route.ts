import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import User from "@/models/User"
import Application from "@/models/Application"
import { CollegePlacement } from "@/models/CollegePlacement"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const url = new URL(req.url)
    const collegeId = session.userId

    // Fetch all students onboarded by this college
    const students = await User.find({
      onboardedByCollege: collegeId,
      role: "job_seeker",
    })
      .select(
        "_id name email department batch cgpa skills yearsOfExperience profileScore placementStatus companyPlacedAt packageLPA profileImage"
      )
      .lean() as any[]

    const studentIds = students.map((s: any) => s._id)

    // ── OVERVIEW ──────────────────────────────────────────────────────────────
    if (url.searchParams.has("overview")) {
      const readyForPlacement = students.filter((s: any) => (s.profileScore || 0) >= 70).length
      const needImprovement = students.filter(
        (s: any) => (s.profileScore || 0) >= 40 && (s.profileScore || 0) < 70
      ).length
      const notReady = students.filter((s: any) => (s.profileScore || 0) < 40).length
      const averageReadinessScore =
        students.length > 0
          ? Math.round(
              students.reduce((sum: number, s: any) => sum + (s.profileScore || 0), 0) /
                students.length
            )
          : 0

      // Skill gap analysis
      const allSkills: Record<string, number> = {}
      students.forEach((s: any) => {
        ;(s.skills || []).forEach((skill: string) => {
          const key = skill.toLowerCase().trim()
          allSkills[key] = (allSkills[key] || 0) + 1
        })
      })

      const commonRequired = [
        "JavaScript",
        "Python",
        "React",
        "Node.js",
        "SQL",
        "Data Structures",
        "Communication",
        "Problem Solving",
      ]
      const skillGaps: Record<string, { required: number; missing: number }> = {}
      commonRequired.forEach((skill) => {
        const key = skill.toLowerCase().split(" ")[0]
        const having = Object.entries(allSkills)
          .filter(([k]) => k.includes(key))
          .reduce((s, [, v]) => s + v, 0)
        skillGaps[skill] = {
          required: students.length,
          missing: Math.max(0, students.length - having),
        }
      })

      const sorted = [...students].sort(
        (a: any, b: any) => (b.profileScore || 0) - (a.profileScore || 0)
      )
      const topPerformers = sorted.slice(0, 5).map((s: any) => ({
        name: s.name,
        cgpa: s.cgpa || 0,
        readiness: s.profileScore || 0,
      }))
      const atRiskStudents = sorted
        .filter((s: any) => (s.profileScore || 0) < 40)
        .slice(0, 5)
        .map((s: any) => ({
          name: s.name,
          cgpa: s.cgpa || 0,
          readiness: s.profileScore || 0,
        }))

      return NextResponse.json({
        success: true,
        overview: {
          totalStudents: students.length,
          readyForPlacement,
          needImprovement,
          notReady,
          averageReadinessScore,
          skillGaps,
          topPerformers,
          atRiskStudents,
        },
      })
    }

    // ── SKILLS HEATMAP ────────────────────────────────────────────────────────
    if (url.searchParams.has("skills-heatmap")) {
      type SkillLevel = { beginner: number; intermediate: number; advanced: number }
      const skillsByYear: Record<string, Record<string, SkillLevel>> = {}
      const skillsByBranch: Record<string, Record<string, SkillLevel>> = {}
      const overallSkills: Record<string, SkillLevel> = {}

      students.forEach((s: any) => {
        const year = s.batch || "Unknown"
        const branch = s.department || "Unknown"
        const exp = s.yearsOfExperience || 0
        const level: keyof SkillLevel =
          exp >= 3 ? "advanced" : exp >= 1 ? "intermediate" : "beginner"

        ;(s.skills || []).forEach((skill: string) => {
          const sk = skill.trim()
          if (!overallSkills[sk]) overallSkills[sk] = { beginner: 0, intermediate: 0, advanced: 0 }
          overallSkills[sk][level]++

          if (!skillsByYear[year]) skillsByYear[year] = {}
          if (!skillsByYear[year][sk])
            skillsByYear[year][sk] = { beginner: 0, intermediate: 0, advanced: 0 }
          skillsByYear[year][sk][level]++

          if (!skillsByBranch[branch]) skillsByBranch[branch] = {}
          if (!skillsByBranch[branch][sk])
            skillsByBranch[branch][sk] = { beginner: 0, intermediate: 0, advanced: 0 }
          skillsByBranch[branch][sk][level]++
        })
      })

      return NextResponse.json({
        success: true,
        heatmap: {
          byYear: skillsByYear,
          byBranch: skillsByBranch,
          overall: overallSkills,
        },
      })
    }

    // ── LEADERBOARD ───────────────────────────────────────────────────────────
    if (url.searchParams.has("leaderboard")) {
      const leaderboard = students
        .map((s: any) => {
          const cgpa = s.cgpa || 0
          const readiness = s.profileScore || 0
          const score = cgpa * 10 * 0.6 + readiness * 0.4
          return {
            _id: s._id,
            name: s.name,
            email: s.email,
            cgpa,
            department: s.department || "",
            batch: s.batch || "",
            avatar: s.profileImage || null,
            readiness,
            score,
            placementStatus: s.placementStatus || "unplaced",
          }
        })
        .sort((a, b) => b.score - a.score)
        .map((s, idx) => ({ ...s, rank: idx + 1 }))

      return NextResponse.json({ success: true, leaderboard })
    }

    // ── PLACEMENT FUNNEL ──────────────────────────────────────────────────────
    if (url.searchParams.has("placement-funnel")) {
      const totalStudents = students.length
      const eligible = students.filter((s: any) => (s.profileScore || 0) >= 50).length

      const applications = await Application.find({
        jobSeekerId: { $in: studentIds },
      })
        .select("status jobSeekerId")
        .lean() as any[]

      const uniqueApplicants = new Set(
        applications.map((a: any) => String(a.jobSeekerId))
      ).size

      const shortlisted = applications.filter((a: any) =>
        [
          "shortlisted",
          "Shortlisted",
          "Under Review",
          "interview",
          "Interview Scheduled",
        ].includes(a.status)
      ).length

      const interviewed = applications.filter((a: any) =>
        ["interview", "Interview Scheduled"].includes(a.status)
      ).length

      const placed = students.filter((s: any) => s.placementStatus === "placed").length
      const offered = students.filter(
        (s: any) =>
          s.placementStatus === "offer_received" || s.placementStatus === "placed"
      ).length

      const safe = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)

      return NextResponse.json({
        success: true,
        funnel: {
          totalStudents,
          eligible,
          applied: uniqueApplicants,
          shortlisted,
          interviewed,
          offered,
          placed,
          conversionRates: {
            "Eligible Rate": safe(eligible, totalStudents),
            "Application Rate": safe(uniqueApplicants, eligible),
            "Shortlist Rate": safe(shortlisted, uniqueApplicants),
            "Interview Rate": safe(interviewed, shortlisted),
            "Offer Rate": safe(offered, interviewed),
            "Placement Rate": safe(placed, offered),
          },
        },
      })
    }

    // ── COMPANY PERFORMANCE ───────────────────────────────────────────────────
    if (url.searchParams.has("company-performance")) {
      const placements = (await CollegePlacement.find({ collegeId }).lean()) as any[]

      const companyMap: Record<
        string,
        {
          companyId: string
          companyName: string
          offers: number
          accepted: number
          rejected: number
          totalPackage: number
        }
      > = {}

      placements.forEach((p: any) => {
        const key = p.companyName
        if (!companyMap[key]) {
          companyMap[key] = {
            companyId: String(p._id),
            companyName: p.companyName,
            offers: 0,
            accepted: 0,
            rejected: 0,
            totalPackage: 0,
          }
        }
        companyMap[key].offers++
        if (p.offerStatus === "Accepted") companyMap[key].accepted++
        if (p.offerStatus === "Rejected") companyMap[key].rejected++
        companyMap[key].totalPackage += p.package || 0
      })

      const companyPerformance = Object.values(companyMap).map((c) => ({
        companyId: c.companyId,
        companyName: c.companyName,
        offers: c.offers,
        accepted: c.accepted,
        rejected: c.rejected,
        averagePackage: c.offers > 0 ? Math.round(c.totalPackage / c.offers) : 0,
      }))

      return NextResponse.json({ success: true, companyPerformance })
    }

    // Default: summary
    const placed = students.filter((s: any) => s.placementStatus === "placed").length
    return NextResponse.json({
      success: true,
      summary: {
        totalStudents: students.length,
        placed,
        placementRate:
          students.length > 0 ? Math.round((placed / students.length) * 100) : 0,
      },
    })
  } catch (error) {
    console.error("[placement-analytics GET]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
