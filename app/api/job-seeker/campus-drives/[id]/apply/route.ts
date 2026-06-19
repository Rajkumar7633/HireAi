import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import CampusDrive from "@/models/CampusDrive"
import CampusDriveApplication from "@/models/CampusDriveApplication"
import User from "@/models/User"
import Notification from "@/models/Notification"
import mongoose from "mongoose"
import {
export { dynamic } from "@/lib/api-dynamic"

  checkCampusDriveEligibility,
  type CampusDriveStudent,
} from "@/lib/campus-drive-eligibility"
import type { ICampusDrive } from "@/models/CampusDrive"

type LeanStudent = CampusDriveStudent & {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  phone?: string
  skills?: string[]
  onboardedByCollege?: mongoose.Types.ObjectId
}

type LeanDrive = Pick<
  ICampusDrive,
  | "status"
  | "applicationDeadline"
  | "collegeId"
  | "companyName"
  | "role"
  | "eligibility"
> & {
  _id: mongoose.Types.ObjectId
}

// POST: student applies to a drive
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const driveId = params?.id?.trim()
    if (!driveId || !mongoose.Types.ObjectId.isValid(driveId)) {
      return NextResponse.json({ error: "Invalid drive id" }, { status: 400 })
    }

    await connectDB()

    const student = await User.findById(session.userId)
      .select("name email phone cgpa department batch currentYear semester skills backlogs onboardedByCollege")
      .lean() as LeanStudent | null

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    const drive = await CampusDrive.findById(driveId).lean() as LeanDrive | null
    if (!drive) {
      return NextResponse.json({ error: "Drive not found" }, { status: 404 })
    }

    if (drive.status !== "active") {
      return NextResponse.json({ error: "Drive is not active" }, { status: 400 })
    }

    const deadline = drive.applicationDeadline
      ? new Date(drive.applicationDeadline)
      : null
    if (deadline && !Number.isNaN(deadline.getTime()) && deadline < new Date()) {
      return NextResponse.json({ error: "Application deadline passed" }, { status: 400 })
    }

    if (student.onboardedByCollege?.toString() !== drive.collegeId.toString()) {
      return NextResponse.json({ error: "This drive is not for your college" }, { status: 403 })
    }

    const existing = await CampusDriveApplication.findOne({
      driveId: new mongoose.Types.ObjectId(driveId),
      studentId: new mongoose.Types.ObjectId(session.userId),
    }).lean()

    if (existing) {
      return NextResponse.json({ error: "Already applied to this drive" }, { status: 409 })
    }

    const { eligible, reasons } = checkCampusDriveEligibility(student, drive)
    if (!eligible) {
      return NextResponse.json({ error: "Not eligible", reasons }, { status: 403 })
    }

    let resumeUrl = ""
    try {
      const Resume = (await import("@/models/Resume")).default
      const resume = await Resume.findOne({ userId: session.userId })
        .select("fileUrl")
        .lean() as { fileUrl?: string } | null
      resumeUrl = resume?.fileUrl || ""
    } catch {
      resumeUrl = ""
    }

    const application = await CampusDriveApplication.create({
      driveId: new mongoose.Types.ObjectId(driveId),
      studentId: new mongoose.Types.ObjectId(session.userId),
      collegeId: drive.collegeId,
      status: "applied",
      studentSnapshot: {
        name: student.name || "",
        email: student.email || "",
        phone: student.phone || "",
        cgpa: student.cgpa ?? 0,
        department: student.department || "",
        batch: student.batch || "",
        skills: student.skills || [],
        resumeUrl,
      },
    })

    await CampusDrive.findByIdAndUpdate(driveId, { $inc: { totalApplicants: 1 } })

    await Notification.create({
      userId: drive.collegeId,
      type: "campus_drive_application",
      message: `${student.name} applied for ${drive.companyName} - ${drive.role} drive.`,
      read: false,
      relatedEntity: { id: drive._id, type: "campus_drive" },
    }).catch((err) => {
      console.error("[campus-drive apply] notification failed:", err)
    })

    return NextResponse.json({ application, success: true }, { status: 201 })
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json({ error: "Already applied to this drive" }, { status: 409 })
    }
    console.error("POST apply error:", error)
    const message =
      error instanceof Error ? error.message : "Failed to apply"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
