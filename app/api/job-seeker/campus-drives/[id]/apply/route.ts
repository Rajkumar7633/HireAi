import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import CampusDrive from "@/models/CampusDrive"
import CampusDriveApplication from "@/models/CampusDriveApplication"
import User from "@/models/User"
import Notification from "@/models/Notification"
import mongoose from "mongoose"

function checkEligibility(student: any, drive: any): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = []
  const e = drive.eligibility
  if (e?.minCGPA > 0 && (student.cgpa || 0) < e.minCGPA) reasons.push(`Min CGPA: ${e.minCGPA}`)
  if (e?.branches?.length > 0 && student.department && !e.branches.includes(student.department)) reasons.push("Branch not eligible")
  if (e?.batches?.length > 0 && student.batch && !e.batches.includes(student.batch)) reasons.push("Batch not eligible")
  return { eligible: reasons.length === 0, reasons }
}

// POST: student applies to a drive
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const student = await (User as any).findById(session.userId).lean() as any
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 })

    const drive = await (CampusDrive as any).findById(params.id).lean() as any
    if (!drive) return NextResponse.json({ error: "Drive not found" }, { status: 404 })

    if (drive.status !== "active") {
      return NextResponse.json({ error: "Drive is not active" }, { status: 400 })
    }
    if (new Date(drive.applicationDeadline) < new Date()) {
      return NextResponse.json({ error: "Application deadline passed" }, { status: 400 })
    }
    if (student.onboardedByCollege?.toString() !== drive.collegeId.toString()) {
      return NextResponse.json({ error: "This drive is not for your college" }, { status: 403 })
    }

    const { eligible, reasons } = checkEligibility(student, drive)
    if (!eligible) {
      return NextResponse.json({ error: "Not eligible", reasons }, { status: 403 })
    }

    // Get resume URL from Resume model if available
    let resumeUrl = ""
    try {
      const Resume = (await import("@/models/Resume")).default
      const resume = await (Resume as any).findOne({ userId: session.userId }).lean() as any
      resumeUrl = resume?.fileUrl || ""
    } catch { /**/ }

    const application = await (CampusDriveApplication as any).create({
      driveId: new mongoose.Types.ObjectId(params.id),
      studentId: new mongoose.Types.ObjectId(session.userId),
      collegeId: drive.collegeId,
      studentSnapshot: {
        name: student.name,
        email: student.email,
        phone: student.phone || "",
        cgpa: student.cgpa || 0,
        department: student.department || "",
        batch: student.batch || "",
        skills: student.skills || [],
        resumeUrl,
      },
    })

    // Increment applicant count
    await (CampusDrive as any).findByIdAndUpdate(params.id, { $inc: { totalApplicants: 1 } })

    // Notify college admin
    await (Notification as any).create({
      userId: drive.collegeId,
      type: "campus_drive_application",
      message: `${student.name} applied for ${drive.companyName} - ${drive.role} drive.`,
      read: false,
      relatedEntity: { id: drive._id, type: "campus_drive" },
    })

    return NextResponse.json({ application, success: true }, { status: 201 })
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Already applied to this drive" }, { status: 409 })
    }
    console.error("POST apply error:", error)
    return NextResponse.json({ error: "Failed to apply" }, { status: 500 })
  }
}
