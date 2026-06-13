import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Application from "@/models/Application"
import mongoose from "mongoose"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || (session.role !== "college" && session.role !== "college_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()

    const collegeId = new mongoose.Types.ObjectId(session.userId)

    // All students onboarded by this college
    const students = await (User as any)
      .find({ onboardedByCollege: collegeId })
      .select("_id name email department batch cgpa skills placementStatus companyPlacedAt packageLPA profileImage createdAt onboardingCompleted profileScore")
      .lean()

    const studentIds = students.map((s: any) => s._id)

    // Applications made by these students
    const applications = await (Application as any)
      .find({ jobSeekerId: { $in: studentIds } })
      .select("jobSeekerId status testScore testCompletedAt appliedAt jobDescriptionId")
      .populate({ path: "jobDescriptionId", select: "title companyName" })
      .sort({ appliedAt: -1 })
      .lean()

    // Test assignments from college
    const AssignmentModel = mongoose.models.CollegeTestAssignment ||
      mongoose.model("CollegeTestAssignment", new mongoose.Schema({}, { strict: false }))
    const assignments = await (AssignmentModel as any)
      .find({ collegeId: session.userId })
      .lean()

    // Per-student test completions
    const studentTestMap: Record<string, { assigned: number; completed: number; avgScore: number }> = {}
    for (const a of assignments) {
      for (const c of (a.completions || [])) {
        const sid = String(c.studentId)
        if (!studentTestMap[sid]) studentTestMap[sid] = { assigned: 0, completed: 0, avgScore: 0 }
        studentTestMap[sid].assigned++
        if (c.status === "completed") {
          studentTestMap[sid].completed++
          studentTestMap[sid].avgScore = c.score || 0
        }
      }
    }

    // Pipeline stages
    const total = students.length
    const placed = students.filter((s: any) => s.placementStatus === "placed").length
    const offerReceived = students.filter((s: any) => s.placementStatus === "offer_received").length
    const profileComplete = students.filter((s: any) => s.onboardingCompleted || (s.skills?.length > 0 && s.cgpa)).length
    const appliedCount = new Set(applications.map((a: any) => String(a.jobSeekerId))).size
    const testTakenCount = Object.values(studentTestMap).filter((t) => t.completed > 0).length

    // Avg & highest package
    const placedStudents = students.filter((s: any) => s.placementStatus === "placed" && s.packageLPA)
    const avgPackage = placedStudents.length > 0
      ? Math.round(placedStudents.reduce((sum: number, s: any) => sum + (s.packageLPA || 0), 0) / placedStudents.length * 10) / 10
      : 0
    const highestPackage = placedStudents.length > 0
      ? Math.max(...placedStudents.map((s: any) => s.packageLPA || 0))
      : 0

    // Department breakdown
    const deptMap: Record<string, { total: number; placed: number }> = {}
    for (const s of students as any[]) {
      const dept = s.department || "Unknown"
      if (!deptMap[dept]) deptMap[dept] = { total: 0, placed: 0 }
      deptMap[dept].total++
      if (s.placementStatus === "placed") deptMap[dept].placed++
    }
    const byDepartment = Object.entries(deptMap).map(([dept, v]) => ({
      department: dept,
      total: v.total,
      placed: v.placed,
      rate: Math.round((v.placed / Math.max(v.total, 1)) * 100),
    })).sort((a, b) => b.total - a.total)

    // Recent student activity (latest applications by this college's students)
    const recentActivity = applications.slice(0, 10).map((a: any) => {
      const student = students.find((s: any) => String(s._id) === String(a.jobSeekerId))
      return {
        studentName: student?.name || "Unknown",
        action: `Applied to ${a.jobDescriptionId?.title || "a job"} at ${a.jobDescriptionId?.companyName || "a company"}`,
        status: a.status,
        time: a.appliedAt,
      }
    })

    // Student list enriched
    const studentList = students.map((s: any) => {
      const sid = String(s._id)
      const appCount = applications.filter((a: any) => String(a.jobSeekerId) === sid).length
      const testInfo = studentTestMap[sid] || { assigned: 0, completed: 0, avgScore: 0 }
      return {
        _id: sid,
        name: s.name,
        email: s.email,
        department: s.department || "",
        batch: s.batch || "",
        cgpa: s.cgpa || null,
        skills: s.skills || [],
        placementStatus: s.placementStatus || "unplaced",
        companyPlacedAt: s.companyPlacedAt || "",
        packageLPA: s.packageLPA || null,
        profileImage: s.profileImage || null,
        profileScore: s.profileScore || 0,
        skillCount: (s.skills || []).length,
        applicationCount: appCount,
        testsCompleted: testInfo.completed,
        testsAssigned: testInfo.assigned,
        avgTestScore: testInfo.avgScore,
        onboardingCompleted: !!s.onboardingCompleted,
        joinedAt: s.createdAt,
      }
    })

    return NextResponse.json({
      pipeline: {
        total,
        profileComplete,
        appliedCount,
        testTakenCount,
        offerReceived,
        placed,
      },
      overview: {
        total,
        placed,
        offerReceived,
        unplaced: total - placed - offerReceived,
        placementRate: total > 0 ? Math.round(((placed + offerReceived) / total) * 100) : 0,
        avgPackage,
        highestPackage,
        totalApplications: applications.length,
        testsAssigned: assignments.length,
      },
      byDepartment,
      recentActivity,
      students: studentList,
    })
  } catch (err: any) {
    console.error("[pipeline-stats]", err)
    return NextResponse.json({ error: "Failed to fetch pipeline stats" }, { status: 500 })
  }
}
