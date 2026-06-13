import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import CampusDrive from "@/models/CampusDrive"
import CampusDriveApplication from "@/models/CampusDriveApplication"
import User from "@/models/User"
import mongoose from "mongoose"

function checkEligibility(student: any, drive: any): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = []
  const e = drive.eligibility

  if (e?.minCGPA > 0 && (student.cgpa || 0) < e.minCGPA) {
    reasons.push(`Min CGPA required: ${e.minCGPA} (yours: ${student.cgpa || "N/A"})`)
  }
  if (e?.branches?.length > 0 && student.department && !e.branches.includes(student.department)) {
    reasons.push(`Branch not eligible (allowed: ${e.branches.join(", ")})`)
  }
  if (e?.batches?.length > 0 && student.batch && !e.batches.includes(student.batch)) {
    reasons.push(`Batch not eligible (allowed: ${e.batches.join(", ")})`)
  }

  return { eligible: reasons.length === 0, reasons }
}

// GET: drives for student's college with eligibility status
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const student = await (User as any).findById(session.userId).lean() as any
    if (!student?.onboardedByCollege) {
      return NextResponse.json({ drives: [], message: "No college linked" })
    }

    const collegeId = student.onboardedByCollege
    const drives = await (CampusDrive as any)
      .find({ collegeId: new mongoose.Types.ObjectId(collegeId), status: { $in: ["active", "completed"] } })
      .sort({ driveDate: 1 })
      .lean()

    const driveIds = drives.map((d: any) => d._id)
    const existingApps = await (CampusDriveApplication as any)
      .find({ studentId: session.userId, driveId: { $in: driveIds } })
      .lean()
    const appliedMap: Record<string, any> = {}
    for (const app of existingApps) appliedMap[app.driveId.toString()] = app

    const now = new Date()
    const enriched = drives.map((drive: any) => {
      const { eligible, reasons } = checkEligibility(student, drive)
      const applied = appliedMap[drive._id.toString()] || null
      const deadlinePassed = new Date(drive.applicationDeadline) < now
      return {
        ...drive,
        eligible,
        eligibilityReasons: reasons,
        applied: !!applied,
        applicationStatus: applied?.status || null,
        applicationId: applied?._id || null,
        deadlinePassed,
        canApply: eligible && !applied && !deadlinePassed && drive.status === "active",
      }
    })

    return NextResponse.json({ drives: enriched, student: { cgpa: student.cgpa, department: student.department, batch: student.batch } })
  } catch (error) {
    console.error("GET job-seeker campus-drives error:", error)
    return NextResponse.json({ drives: [] })
  }
}
