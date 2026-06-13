import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Notification from "@/models/Notification"
import { CampusDriveInvite, backfillInviteDirections, persistInviteDirection } from "@/models/CampusDriveInvite"
import { CollegePartnership } from "@/models/CollegePartnership"
import {
  computeInviteStats,
  parseRolesInput,
  recruiterLabel,
  shapeInvite,
  splitInvitesForRecruiter,
  toMongoId,
} from "@/lib/campus-drive-utils"
import { buildActivityFeed } from "@/lib/campus-drive-pipeline-shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    await backfillInviteDirections()

    const recruiterId = toMongoId(session.userId)
    const populateFields = "name email collegeName collegeLocation companyName"

    const [allForRecruiter, colleges, partnerships, profile] = await Promise.all([
      CampusDriveInvite.find({ recruiterId })
        .populate("collegeId", populateFields)
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ role: { $in: ["college", "college_admin"] } })
        .select("name email collegeName collegeLocation totalStudents placementRate")
        .sort({ collegeName: 1 })
        .limit(50)
        .lean(),
      CollegePartnership.find({ recruiterId: session.userId, status: "Active" })
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      User.findById(session.userId).select("companyName name").lean(),
    ])

    const { received, sent } = splitInvitesForRecruiter(allForRecruiter, session.userId)
    const shapedReceived = received.map(shapeInvite)
    const shapedSent = sent.map(shapeInvite)
    const allInvites = [...shapedReceived, ...shapedSent]

    return NextResponse.json({
      profile: {
        companyName: (profile as any)?.companyName || (profile as any)?.name || "",
      },
      stats: {
        ...computeInviteStats(received as any[], sent as any[]),
        collegesAvailable: colleges.length,
        activePartnerships: partnerships.length,
        liveDrives: allInvites.filter((i) => i.linkedDriveId).length,
      },
      receivedInvites: shapedReceived,
      sentInvites: shapedSent,
      activity: buildActivityFeed(allInvites),
      colleges: colleges.map((c: any) => ({
        _id: c._id.toString(),
        name: c.name,
        email: c.email,
        collegeName: c.collegeName || c.name,
        collegeLocation: c.collegeLocation || "",
        totalStudents: c.totalStudents || 0,
        placementRate: c.placementRate || 0,
      })),
      partnerships,
    })
  } catch (error) {
    console.error("[recruiter/campus-drives GET]", error)
    return NextResponse.json({ message: "Failed to load campus drives" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const {
      collegeEmail,
      collegeId,
      driveTitle,
      driveDate,
      roles,
      description,
      location,
      packageMin,
      packageMax,
    } = body

    if ((!collegeEmail && !collegeId) || !driveTitle || !driveDate) {
      return NextResponse.json(
        { message: "College, drive title and date are required" },
        { status: 400 },
      )
    }

    const collegeQuery = collegeId
      ? { _id: toMongoId(collegeId), role: { $in: ["college", "college_admin"] } }
      : { email: String(collegeEmail).toLowerCase(), role: { $in: ["college", "college_admin"] } }

    const college = (await User.findOne(collegeQuery).lean()) as any
    if (!college) {
      return NextResponse.json({ message: "College not found" }, { status: 404 })
    }

    const recruiter = (await User.findById(session.userId).lean()) as any
    const companyName = recruiterLabel(recruiter)
    const collegeName = college.collegeName || college.name || "College"
    const recruiterId = toMongoId(session.userId)

    const existing = await CampusDriveInvite.findOne({
      collegeId: college._id,
      recruiterId,
      driveTitle: driveTitle.trim(),
      status: "pending",
      createdByRole: "recruiter",
    }).lean()
    if (existing) {
      return NextResponse.json(
        { message: "You already have a pending proposal for this drive" },
        { status: 409 },
      )
    }

    const invite = await CampusDriveInvite.create({
      collegeId: college._id,
      collegeName,
      recruiterId,
      companyName: recruiter.companyName || recruiter.name || "",
      driveTitle: driveTitle.trim(),
      driveDate: new Date(driveDate),
      roles: parseRolesInput(roles),
      description: description || "",
      location: location || "",
      packageMin: Number(packageMin) || 0,
      packageMax: Number(packageMax) || 0,
      initiatedBy: "recruiter",
      createdByRole: "recruiter",
      createdByUserId: recruiterId,
    })

    await persistInviteDirection(String(invite._id), "recruiter", session.userId)

    await Notification.create({
      userId: college._id,
      type: "campus_drive_published",
      message: `${companyName} proposed a campus drive: "${driveTitle}" on ${new Date(driveDate).toLocaleDateString()}. Review and accept or decline.`,
      relatedEntity: { id: invite._id, type: "campus_drive" },
    }).catch(() => {})

    const fresh = await CampusDriveInvite.findById(invite._id).lean()
    const shaped = shapeInvite({ ...fresh, createdByRole: "recruiter" })

    return NextResponse.json({
      message: "Campus drive proposal sent to college",
      invite: shaped,
    })
  } catch (error) {
    console.error("[recruiter/campus-drives POST]", error)
    return NextResponse.json({ message: "Failed to send proposal" }, { status: 500 })
  }
}
