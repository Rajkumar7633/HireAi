import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { CollegeInterview } from "@/models/CollegeInterview"
import User from "@/models/User"
import Notification from "@/models/Notification"

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await req.json()
    const { result, status, feedback } = body

    const interview = await CollegeInterview.findOne({
      _id: params.id,
      collegeId: session.userId,
    })
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    const updates: Record<string, any> = {}
    if (result) updates.result = result
    if (status) updates.status = status
    if (feedback !== undefined) updates.feedback = feedback

    // Auto-set status to Completed when result is given
    if (result && result !== "Pending" && !status) {
      updates.status = "Completed"
    }

    const updated = await CollegeInterview.findByIdAndUpdate(
      params.id,
      { $set: updates },
      { new: true }
    )
      .populate("studentId", "name email department batch profileImage")
      .populate("driveId", "companyName role")
      .lean() as any

    // If selected, update student placement status
    if (result === "Selected" && updated?.studentId) {
      const drive = updated.driveId as any
      await User.findByIdAndUpdate(updated.studentId._id || updated.studentId, {
        placementStatus: "offer_received",
        ...(drive?.companyName ? { companyPlacedAt: drive.companyName } : {}),
      })

      // Notify student of selection
      try {
        await Notification.create({
          userId: updated.studentId._id || updated.studentId,
          type: "application_status_update",
          message: `Congratulations! You have been selected in the ${updated.type} interview${drive?.companyName ? ` at ${drive.companyName}` : ""}.`,
          read: false,
          relatedEntity: { id: updated._id, type: "interview" },
        })
      } catch (e) {
        console.warn("[interviews PUT] notification failed:", e)
      }
    }

    return NextResponse.json({
      interview: {
        ...updated,
        interviewId: updated._id,
        student: updated.studentId,
        driveTitle: updated.driveId?.role
          ? `${updated.driveId.companyName} — ${updated.driveId.role}`
          : updated.driveId?.companyName || "",
        company: updated.driveId?.companyName || "",
      },
      success: true,
    })
  } catch (err) {
    console.error("[interviews PUT]", err)
    return NextResponse.json({ error: "Failed to update interview" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const deleted = await CollegeInterview.findOneAndDelete({
      _id: params.id,
      collegeId: session.userId,
    })

    if (!deleted) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[interviews DELETE]", err)
    return NextResponse.json({ error: "Failed to delete interview" }, { status: 500 })
  }
}
