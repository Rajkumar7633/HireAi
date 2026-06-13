import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import CampusDrive from "@/models/CampusDrive"
import CampusDriveApplication from "@/models/CampusDriveApplication"
import User from "@/models/User"
import Notification from "@/models/Notification"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    const query: any = { collegeId: new mongoose.Types.ObjectId(session.userId) }
    if (status) query.status = status

    const drives = await (CampusDrive as any)
      .find(query)
      .sort({ createdAt: -1 })
      .lean()

    const driveIds = drives.map((d: any) => d._id)
    const appCounts = await (CampusDriveApplication as any).aggregate([
      { $match: { driveId: { $in: driveIds } } },
      { $group: { _id: "$driveId", count: { $sum: 1 } } },
    ])
    const countMap: Record<string, number> = {}
    for (const ac of appCounts) countMap[ac._id.toString()] = ac.count

    const enriched = drives.map((d: any) => ({
      ...d,
      applicantCount: countMap[d._id.toString()] || d.totalApplicants || 0,
    }))

    return NextResponse.json({ drives: enriched })
  } catch (error) {
    console.error("GET campus-drives error:", error)
    return NextResponse.json({ drives: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()
    const collegeId = new mongoose.Types.ObjectId(session.userId)

    const drive = await (CampusDrive as any).create({
      collegeId,
      companyName: body.companyName,
      companyLogo: body.companyLogo || "",
      role: body.role,
      description: body.description || "",
      packageMin: body.packageMin || 0,
      packageMax: body.packageMax || 0,
      jobType: body.jobType || "Full Time",
      location: body.location || "",
      eligibility: {
        minCGPA: body.eligibility?.minCGPA || 0,
        branches: body.eligibility?.branches || [],
        years: body.eligibility?.years || [],
        batches: body.eligibility?.batches || [],
        skills: body.eligibility?.skills || [],
        backlogsAllowed: body.eligibility?.backlogsAllowed || false,
      },
      rounds: body.rounds || [],
      driveDate: new Date(body.driveDate),
      applicationDeadline: new Date(body.applicationDeadline || body.driveDate),
      venue: body.venue || "",
      status: body.status || "active",
    })

    // Notify eligible students
    if (drive.status === "active") {
      const eligibleStudents = await findEligibleStudents(collegeId.toString(), drive)
      if (eligibleStudents.length > 0) {
        const notifications = eligibleStudents.map((s: any) => ({
          userId: s._id,
          type: "campus_drive_published",
          message: `New campus drive: ${drive.companyName} is hiring for ${drive.role}. Check your eligibility and apply!`,
          read: false,
          relatedEntity: { id: drive._id, type: "campus_drive" },
        }))
        await (Notification as any).insertMany(notifications, { ordered: false })
        await (CampusDrive as any).findByIdAndUpdate(drive._id, { notificationsSent: true })
      }
    }

    return NextResponse.json({ drive, success: true }, { status: 201 })
  } catch (error) {
    console.error("POST campus-drives error:", error)
    return NextResponse.json({ error: "Failed to create campus drive" }, { status: 500 })
  }
}

export async function findEligibleStudents(collegeId: string, drive: any) {
  const studentQuery: any = {
    onboardedByCollege: collegeId,
    role: "job_seeker",
  }

  const e = drive.eligibility
  if (e?.minCGPA > 0) studentQuery.cgpa = { $gte: e.minCGPA }
  if (e?.branches?.length > 0) studentQuery.department = { $in: e.branches }
  if (e?.batches?.length > 0) studentQuery.batch = { $in: e.batches }

  return await (User as any).find(studentQuery).select("_id name email").lean()
}
