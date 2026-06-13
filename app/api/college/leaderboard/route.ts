import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || (session.role !== "college" && session.role !== "college_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const department = searchParams.get("department") || ""
  const year = searchParams.get("year") || ""
  const limit = searchParams.get("limit") || "50"

  const token = req.cookies.get("auth-token")?.value

  if (token) {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 8_000)
    try {
      const params = new URLSearchParams({ limit })
      if (department) params.set("department", department)
      if (year) params.set("year", year)
      const res = await fetch(`${BACKEND_URL}/api/college/leaderboard?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        cache: "no-store",
      })
      clearTimeout(tid)
      if (res.ok) return NextResponse.json(await res.json())
    } catch {
      clearTimeout(tid)
    }
  }

  // Fallback: fetch all students and compute ranking locally
  if (token) {
    const controller2 = new AbortController()
    const tid2 = setTimeout(() => controller2.abort(), 8_000)
    try {
      const params = new URLSearchParams()
      if (department) params.set("department", department)
      if (year) params.set("year", year)
      const res = await fetch(`${BACKEND_URL}/api/college/students?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller2.signal,
        cache: "no-store",
      })
      clearTimeout(tid2)
      if (res.ok) {
        const students = await res.json()
        const arr = Array.isArray(students) ? students : students.students || []
        const ranked = arr
          .map((s: any) => {
            const cgpa = s.academicInfo?.cgpa || s.cgpa || 0
            const readiness = s.placementReadiness?.interviewReadiness?.overall || s.readiness || 0
            const score = Math.round(cgpa * 10 * 0.6 + readiness * 0.4)
            return {
              _id: s._id,
              name: s.studentId?.name || s.name || "Unknown",
              email: s.studentId?.email || s.email || "",
              cgpa,
              department: s.academicInfo?.branch || s.department || "N/A",
              year: s.academicInfo?.currentYear || s.year || 1,
              batch: s.academicInfo?.batch || s.batch || "",
              placementStatus: s.placementStatus || "Not Placed",
              readinessScore: readiness,
              overallScore: score,
              testsCompleted: s.testsCompleted || 0,
              avatar: s.avatar || null,
            }
          })
          .sort((a: any, b: any) => b.overallScore - a.overallScore)
          .map((s: any, i: number) => ({ ...s, rank: i + 1 }))
          .slice(0, Number(limit))
        return NextResponse.json({ leaderboard: ranked, total: arr.length })
      }
    } catch {
      clearTimeout(tid2)
    }
  }

  return NextResponse.json({ leaderboard: [], total: 0 })
}
