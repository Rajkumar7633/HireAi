import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import CampusDrive from "@/models/CampusDrive"
import {
  evaluateStudent,
  criteriaFromDrive,
  type EligibilityCriteria,
  type StudentRecord,
} from "@/lib/college-eligibility"

function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

function mapStudent(s: Record<string, unknown>): StudentRecord {
  return {
    _id: String(s._id),
    name: String(s.name || ""),
    email: String(s.email || ""),
    phone: s.phone as string | undefined,
    department: s.department as string | undefined,
    batch: s.batch as string | undefined,
    cgpa: s.cgpa != null ? Number(s.cgpa) : null,
    marks10th: s.marks10th != null ? Number(s.marks10th) : null,
    marks12th: s.marks12th != null ? Number(s.marks12th) : null,
    backlogs: s.backlogs != null ? Number(s.backlogs) : null,
    skills: Array.isArray(s.skills) ? (s.skills as string[]) : [],
    placementStatus: (s.placementStatus as string) || "unplaced",
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!requireCollege(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    let criteria: EligibilityCriteria = body.criteria || {}
    let driveMeta: { companyName?: string; role?: string; driveId?: string } = {}

    await connectDB()

    if (body.driveId) {
      const drive = await CampusDrive.findOne({
        _id: body.driveId,
        collegeId: session!.userId,
      }).lean()
      if (!drive) {
        return NextResponse.json({ error: "Campus drive not found" }, { status: 404 })
      }
      criteria = { ...criteriaFromDrive(drive as any), ...criteria }
      driveMeta = {
        companyName: (drive as any).companyName,
        role: (drive as any).role,
        driveId: String((drive as any)._id),
      }
    }

    const students = await User.find({
      role: "job_seeker",
      onboardedByCollege: session!.userId,
    })
      .select(
        "name email phone department batch cgpa marks10th marks12th backlogs skills placementStatus",
      )
      .lean()

    const eligible: Array<StudentRecord & { reasons: string[]; missingFields: string[] }> = []
    const ineligible: Array<StudentRecord & { reasons: string[]; missingFields: string[] }> = []
    const incomplete: Array<StudentRecord & { reasons: string[]; missingFields: string[] }> = []

    for (const raw of students) {
      const student = mapStudent(raw as Record<string, unknown>)
      const result = evaluateStudent(student, criteria)

      const row = {
        ...student,
        reasons: result.reasons,
        missingFields: result.missingFields,
      }

      if (result.missingFields.length > 0 && result.reasons.length === 0) {
        incomplete.push(row)
      } else if (result.eligible) {
        eligible.push(row)
      } else {
        ineligible.push(row)
      }
    }

    return NextResponse.json({
      criteria,
      drive: driveMeta,
      summary: {
        total: students.length,
        eligible: eligible.length,
        ineligible: ineligible.length,
        incomplete: incomplete.length,
      },
      eligible,
      ineligible,
      incomplete,
    })
  } catch (error) {
    console.error("eligibility-match error:", error)
    return NextResponse.json({ error: "Failed to match students" }, { status: 500 })
  }
}
