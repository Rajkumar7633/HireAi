import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import CampusDrive from "@/models/CampusDrive"
import CampusDriveApplication from "@/models/CampusDriveApplication"
import User from "@/models/User"
import mongoose from "mongoose"
import {
  checkCampusDriveEligibility,
  resolveStudentYear,
  resolveStudentSemester,
  shouldShowDriveToStudent,
} from "@/lib/campus-drive-eligibility"

// GET: drives for student's college with eligibility status
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const student = await User.findById(session.userId).lean() as {
      cgpa?: number
      department?: string
      batch?: string
      currentYear?: number
      semester?: number
      skills?: string[]
      backlogs?: number
      onboardedByCollege?: mongoose.Types.ObjectId
    } | null

    if (!student?.onboardedByCollege) {
      return NextResponse.json({ drives: [], message: "No college linked" })
    }

    const collegeId = student.onboardedByCollege
    const drives = await CampusDrive.find({
      collegeId: new mongoose.Types.ObjectId(collegeId),
      status: { $in: ["active", "completed"] },
    })
      .sort({ driveDate: 1 })
      .lean()

    const driveIds = drives.map((d) => d._id)
    const existingApps = await CampusDriveApplication.find({
      studentId: session.userId,
      driveId: { $in: driveIds },
    }).lean()

    const appliedMap: Record<string, { _id: mongoose.Types.ObjectId; status?: string }> = {}
    for (const app of existingApps) {
      appliedMap[app.driveId.toString()] = app
    }

    const now = new Date()
    const enriched = drives
      .map((drive) => {
        const applied = appliedMap[drive._id.toString()] || null
        const { eligible, reasons, missingFields } = checkCampusDriveEligibility(student, drive)
        const deadlinePassed = new Date(drive.applicationDeadline) < now
        return {
          ...drive,
          eligible,
          eligibilityReasons: reasons,
          missingFields,
          applied: !!applied,
          applicationStatus: applied?.status || null,
          applicationId: applied?._id || null,
          deadlinePassed,
          canApply: eligible && !applied && !deadlinePassed && drive.status === "active",
        }
      })
      .filter((drive) => shouldShowDriveToStudent(student, drive, drive.applied))

    return NextResponse.json({
      drives: enriched,
      student: {
        cgpa: student.cgpa,
        department: student.department,
        batch: student.batch,
        currentYear: resolveStudentYear(student),
        semester: resolveStudentSemester(student),
      },
    })
  } catch (error) {
    console.error("GET job-seeker campus-drives error:", error)
    return NextResponse.json({ drives: [] })
  }
}
