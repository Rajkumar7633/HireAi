import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { CollegeInterview } from "@/models/CollegeInterview"
import Notification from "@/models/Notification"
import CampusDrive from "@/models/CampusDrive"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const interviews = await CollegeInterview.find({ collegeId: session.userId })
      .populate("studentId", "name email department batch profileImage")
      .populate("driveId", "companyName role")
      .sort({ date: -1 })
      .lean()

    const shaped = interviews.map((iv: any) => ({
      ...iv,
      interviewId: iv._id,
      student: iv.studentId,
      driveTitle: iv.driveId?.role
        ? `${iv.driveId.companyName} — ${iv.driveId.role}`
        : iv.driveId?.companyName || "",
      company: iv.driveId?.companyName || "",
    }))

    return NextResponse.json({ interviews: shaped })
  } catch (err) {
    console.error("[interviews GET]", err)
    return NextResponse.json({ error: "Failed to fetch interviews" }, { status: 500 })
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
    const {
      driveId,
      studentId,
      date,
      time,
      venue,
      type = "Technical",
      notes,
    } = body

    if (!studentId || !date) {
      return NextResponse.json({ error: "studentId and date are required" }, { status: 400 })
    }

    const interview = await CollegeInterview.create({
      collegeId: session.userId,
      driveId: driveId || undefined,
      studentId,
      date: new Date(date),
      time: time || "",
      venue: venue || "",
      type,
      notes: notes || "",
      status: "Scheduled",
      result: "Pending",
    })

    // Notify student
    try {
      let driveLabel = ""
      if (driveId) {
        const drive = await CampusDrive.findById(driveId).select("companyName role").lean() as any
        if (drive) driveLabel = ` for ${drive.companyName} (${drive.role})`
      }
      await Notification.create({
        userId: studentId,
        type: "interview_scheduled",
        message: `You have been scheduled for a ${type} interview${driveLabel} on ${new Date(date).toLocaleDateString()}.`,
        read: false,
        relatedEntity: { id: interview._id, type: "interview" },
      })
    } catch (notifErr) {
      console.warn("[interviews POST] notification failed:", notifErr)
    }

    const populated = await CollegeInterview.findById(interview._id)
      .populate("studentId", "name email department batch profileImage")
      .populate("driveId", "companyName role")
      .lean() as any

    return NextResponse.json(
      {
        interview: {
          ...populated,
          interviewId: populated._id,
          student: populated.studentId,
          driveTitle: populated.driveId?.role
            ? `${populated.driveId.companyName} — ${populated.driveId.role}`
            : populated.driveId?.companyName || "",
          company: populated.driveId?.companyName || "",
        },
        success: true,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[interviews POST]", err)
    return NextResponse.json({ error: "Failed to schedule interview" }, { status: 500 })
  }
}
