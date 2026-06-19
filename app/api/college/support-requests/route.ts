import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import SupportRequest from "@/models/SupportRequest"
import User from "@/models/User"
import Notification from "@/models/Notification"
import mongoose from "mongoose"
export { dynamic } from "@/lib/api-dynamic"


// GET: college admin reads all their support requests
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

    const requests = await (SupportRequest as any)
      .find(query)
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ requests, total: requests.length })
  } catch (error) {
    console.error("GET support-requests error:", error)
    return NextResponse.json({ requests: [], total: 0 })
  }
}

// POST: student creates a support request
export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ error: "Unauthorized - students only" }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()

    const student = await (User as any).findById(session.userId).lean() as any
    if (!student?.onboardedByCollege) {
      return NextResponse.json({ error: "No college linked to your account" }, { status: 400 })
    }

    const request = await (SupportRequest as any).create({
      studentId: new mongoose.Types.ObjectId(session.userId),
      collegeId: new mongoose.Types.ObjectId(student.onboardedByCollege),
      driveId: body.driveId ? new mongoose.Types.ObjectId(body.driveId) : undefined,
      subject: body.subject,
      message: body.message,
      type: body.type || "general",
      status: "open",
      studentName: student.name,
      studentEmail: student.email,
    })

    // Notify college admin
    await (Notification as any).create({
      userId: new mongoose.Types.ObjectId(student.onboardedByCollege),
      type: "message_received",
      message: `New support request from ${student.name}: "${body.subject}"`,
      read: false,
      relatedEntity: { id: request._id, type: "message" },
    })

    return NextResponse.json({ request, success: true }, { status: 201 })
  } catch (error) {
    console.error("POST support-requests error:", error)
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 })
  }
}

// PATCH: college admin responds to a support request
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const { requestId, response, status } = await req.json()

    const update: any = {}
    if (response) { update.response = response; update.respondedAt = new Date() }
    if (status) update.status = status

    const req2 = await (SupportRequest as any).findOneAndUpdate(
      { _id: requestId, collegeId: session.userId },
      { $set: update },
      { new: true }
    )
    if (!req2) return NextResponse.json({ error: "Request not found" }, { status: 404 })

    // Notify student
    if (response) {
      await (Notification as any).create({
        userId: req2.studentId,
        type: "message_received",
        message: `Your support request "${req2.subject}" has been responded to by your college.`,
        read: false,
        relatedEntity: { id: req2._id, type: "message" },
      })
    }

    return NextResponse.json({ request: req2, success: true })
  } catch (error) {
    console.error("PATCH support-requests error:", error)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }
}
