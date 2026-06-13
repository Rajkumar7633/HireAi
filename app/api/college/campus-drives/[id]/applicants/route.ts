import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import CampusDrive from "@/models/CampusDrive"
import CampusDriveApplication from "@/models/CampusDriveApplication"
import Notification from "@/models/Notification"
import User from "@/models/User"
import mongoose from "mongoose"

// GET: list all applicants for a drive (college admin)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const drive = await (CampusDrive as any).findOne({ _id: params.id, collegeId: session.userId }).lean()
    if (!drive) return NextResponse.json({ error: "Drive not found" }, { status: 404 })

    const applicants = await (CampusDriveApplication as any)
      .find({ driveId: params.id })
      .sort({ appliedAt: -1 })
      .lean()

    return NextResponse.json({ applicants, total: applicants.length })
  } catch (error) {
    console.error("GET applicants error:", error)
    return NextResponse.json({ error: "Failed to fetch applicants" }, { status: 500 })
  }
}

// PATCH: update applicant status (shortlist / select / reject)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { applicationId, status } = await req.json()
    if (!["applied", "shortlisted", "selected", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const app = await (CampusDriveApplication as any).findByIdAndUpdate(
      applicationId,
      { status },
      { new: true }
    )
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 })

    // Notify the student
    const drive = await (CampusDrive as any).findById(params.id).lean() as any
    const statusMsg: Record<string, string> = {
      shortlisted: `Congratulations! You have been shortlisted for ${drive?.companyName} - ${drive?.role} campus drive.`,
      selected: `Great news! You have been SELECTED for ${drive?.companyName} - ${drive?.role}!`,
      rejected: `Your application for ${drive?.companyName} - ${drive?.role} was not successful this time.`,
    }
    if (statusMsg[status]) {
      await (Notification as any).create({
        userId: app.studentId,
        type: "campus_drive_application",
        message: statusMsg[status],
        read: false,
        relatedEntity: { id: app.driveId, type: "campus_drive" },
      })
    }

    // Update placement status if selected
    if (status === "selected" && drive) {
      await (User as any).findByIdAndUpdate(app.studentId, {
        placementStatus: "offer_received",
        companyPlacedAt: drive.companyName,
      })
    }

    return NextResponse.json({ application: app, success: true })
  } catch (error) {
    console.error("PATCH applicant status error:", error)
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 })
  }
}
