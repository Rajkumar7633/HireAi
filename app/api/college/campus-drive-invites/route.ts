import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Notification from "@/models/Notification"
import {
  CampusDriveInvite,
  backfillInviteDirections,
  persistInviteDirection,
} from "@/models/CampusDriveInvite"
import {
  collegeLabel,
  parseRolesInput,
  shapeInvite,
  splitInvitesForCollege,
  splitInvitesForRecruiter,
  toMongoId,
} from "@/lib/campus-drive-utils"

export const dynamic = "force-dynamic"

// POST — college sends invite to a specific recruiter/company
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { recruiterEmail, driveTitle, driveDate, roles, description, location, packageMin, packageMax } = body

    if (!recruiterEmail || !driveTitle || !driveDate) {
      return NextResponse.json(
        { message: "Recruiter email, drive title and date are required" },
        { status: 400 },
      )
    }

    const recruiter = (await User.findOne({
      email: recruiterEmail.toLowerCase(),
      role: "recruiter",
    }).lean()) as any
    if (!recruiter) {
      return NextResponse.json({ message: "No recruiter found with that email" }, { status: 404 })
    }

    const college = (await User.findById(session.userId).lean()) as any
    const collegeName = collegeLabel(college)
    const collegeId = toMongoId(session.userId)

    const existing = await CampusDriveInvite.findOne({
      collegeId,
      recruiterId: recruiter._id,
      driveTitle: driveTitle.trim(),
      status: "pending",
      createdByRole: "college",
    }).lean()
    if (existing) {
      return NextResponse.json(
        { message: "A pending invitation for this drive already exists" },
        { status: 409 },
      )
    }

    const invite = await CampusDriveInvite.create({
      collegeId,
      collegeName,
      recruiterId: recruiter._id,
      companyName: recruiter.companyName || recruiter.name || "",
      driveTitle: driveTitle.trim(),
      driveDate: new Date(driveDate),
      roles: parseRolesInput(roles),
      description: description || "",
      location: location || "",
      packageMin: Number(packageMin) || 0,
      packageMax: Number(packageMax) || 0,
      initiatedBy: "college",
      createdByRole: "college",
      createdByUserId: collegeId,
    })

    await persistInviteDirection(toMongoId(invite._id), "college", collegeId)

    await Notification.create({
      userId: recruiter._id,
      type: "campus_drive_published",
      message: `${collegeName} invited your company to a campus drive: "${driveTitle}" on ${new Date(driveDate).toLocaleDateString()}. Accept or decline in Campus Drive Hub.`,
      relatedEntity: { id: invite._id, type: "campus_drive" },
    }).catch(() => {})

    const fresh = await CampusDriveInvite.findById(invite._id).lean()
    return NextResponse.json({
      message: "Invitation sent to company",
      invite: shapeInvite({ ...fresh, createdByRole: "college" }),
    })
  } catch (error) {
    console.error("Error sending campus drive invite:", error)
    return NextResponse.json({ message: "Failed to send invitation" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    await backfillInviteDirections()

    const populateFields = "name email collegeName collegeLocation companyName businessLocation"

    if (session.role === "college" || session.role === "college_admin") {
      const collegeId = toMongoId(session.userId)
      const all = await CampusDriveInvite.find({ collegeId })
        .populate("recruiterId", populateFields)
        .sort({ createdAt: -1 })
        .lean()

      const { sent, received } = splitInvitesForCollege(all)

      return NextResponse.json({
        invites: [...sent, ...received].map(shapeInvite),
        sentInvites: sent.map(shapeInvite),
        receivedInvites: received.map(shapeInvite),
      })
    }

    if (session.role === "recruiter") {
      const recruiterId = toMongoId(session.userId)
      const all = await CampusDriveInvite.find({ recruiterId })
        .populate("collegeId", populateFields)
        .sort({ createdAt: -1 })
        .lean()

      const { received, sent } = splitInvitesForRecruiter(all, session.userId)

      return NextResponse.json({
        invites: [...received, ...sent].map(shapeInvite),
        receivedInvites: received.map(shapeInvite),
        sentInvites: sent.map(shapeInvite),
      })
    }

    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  } catch (error) {
    console.error("Error fetching campus drive invites:", error)
    return NextResponse.json({ message: "Failed to fetch invitations" }, { status: 500 })
  }
}
