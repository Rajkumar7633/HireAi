import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Notification from "@/models/Notification"
import User from "@/models/User"
import { CampusDriveInvite } from "@/models/CampusDriveInvite"
import { CollegePartnership } from "@/models/CollegePartnership"
import { collegeLabel, recruiterLabel, shapeInvite } from "@/lib/campus-drive-utils"
import { createDriveFromAcceptedInvite } from "@/lib/campus-drive-pipeline"

async function upsertPartnership(invite: any) {
  const companyName =
    invite.companyName ||
    (await User.findById(invite.recruiterId).select("companyName name").lean())?.companyName ||
    "Partner Company"

  await CollegePartnership.findOneAndUpdate(
    {
      collegeId: invite.collegeId.toString(),
      companyName,
      recruiterId: invite.recruiterId.toString(),
    },
    {
      $set: {
        status: "Active",
        partnershipType: "Campus Drive",
        agreementDetails: invite.description || "",
      },
      $setOnInsert: {
        collegeId: invite.collegeId.toString(),
        companyName,
        recruiterId: invite.recruiterId.toString(),
        drivesConducted: 0,
        studentsPlaced: 0,
        totalPackageValue: 0,
      },
    },
    { upsert: true },
  )
}

// PATCH — recipient accepts or declines (college or recruiter depending on initiator)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { status } = await request.json()
    if (!["accepted", "declined"].includes(status)) {
      return NextResponse.json(
        { message: "Status must be 'accepted' or 'declined'" },
        { status: 400 },
      )
    }

    const invite = await CampusDriveInvite.findById(params.id)
    if (!invite) {
      return NextResponse.json({ message: "Invitation not found" }, { status: 404 })
    }

    const isCollege =
      session.role === "college" || session.role === "college_admin"
    const isRecruiter = session.role === "recruiter"

    const senderRole =
      invite.createdByRole || invite.initiatedBy || "college"

    if (senderRole === "college") {
      // College sent → only the targeted recruiter can accept/decline
      if (!isRecruiter || invite.recruiterId.toString() !== session.userId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      }
    } else if (senderRole === "recruiter") {
      // Recruiter sent → only the college can accept/decline
      if (!isCollege || invite.collegeId.toString() !== session.userId) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
      }
    } else {
      return NextResponse.json({ message: "Invalid invitation direction" }, { status: 400 })
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ message: "Invitation already responded to" }, { status: 409 })
    }

    invite.status = status
    await invite.save()

    if (status === "accepted") {
      await upsertPartnership(invite)
      const drive = await createDriveFromAcceptedInvite(invite)
      await CollegePartnership.findOneAndUpdate(
        {
          collegeId: invite.collegeId.toString(),
          recruiterId: invite.recruiterId.toString(),
        },
        { $inc: { drivesConducted: 1 } },
      )
      if (drive?._id) {
        await Notification.create({
          userId: invite.recruiterId,
          type: "campus_drive_published",
          message: `Campus drive "${invite.driveTitle}" is now live for ${invite.collegeName} students.`,
          relatedEntity: { id: drive._id, type: "campus_drive" },
        }).catch(() => {})
      }
    }

    const responder = (await User.findById(session.userId)
      .select("name companyName collegeName")
      .lean()) as any

    const notifyUserId =
      senderRole === "college" ? invite.collegeId : invite.recruiterId

    const responderLabel = isRecruiter
      ? recruiterLabel(responder)
      : collegeLabel(responder)

    await Notification.create({
      userId: notifyUserId,
      type: "campus_drive_published",
      message: `${responderLabel} has ${status} your campus drive proposal "${invite.driveTitle}".`,
      relatedEntity: { id: invite._id, type: "campus_drive" },
    }).catch(() => {})

    return NextResponse.json({ invite: shapeInvite(invite.toObject()) })
  } catch (error) {
    console.error("Error updating invite:", error)
    return NextResponse.json({ message: "Failed to update invitation" }, { status: 500 })
  }
}

// DELETE — sender cancels a pending invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const invite = await CampusDriveInvite.findById(params.id)
    if (!invite) {
      return NextResponse.json({ message: "Invitation not found" }, { status: 404 })
    }

    const isCollege =
      session.role === "college" || session.role === "college_admin"
    const isRecruiter = session.role === "recruiter"

    const senderRole =
      invite.createdByRole || invite.initiatedBy || "college"

    const isSender =
      (senderRole === "college" &&
        isCollege &&
        invite.collegeId.toString() === session.userId) ||
      (senderRole === "recruiter" &&
        isRecruiter &&
        invite.recruiterId.toString() === session.userId)

    if (!isSender) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    if (invite.status !== "pending") {
      return NextResponse.json({ message: "Only pending invitations can be cancelled" }, { status: 409 })
    }

    invite.status = "cancelled"
    await invite.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error cancelling invite:", error)
    return NextResponse.json({ message: "Failed to cancel invitation" }, { status: 500 })
  }
}
