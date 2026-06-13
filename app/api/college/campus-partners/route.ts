import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { CampusDriveInvite, backfillInviteDirections } from "@/models/CampusDriveInvite"
import { CollegePartnership } from "@/models/CollegePartnership"
import {
  computeInviteStats,
  shapeInvite,
  splitInvitesForCollege,
  toMongoId,
} from "@/lib/campus-drive-utils"
import { buildActivityFeed } from "@/lib/campus-drive-pipeline-shared"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    await backfillInviteDirections()

    const populateFields = "name email companyName businessLocation companyDescription website"
    const collegeId = toMongoId(session.userId)

    const [all, partnerships] = await Promise.all([
      CampusDriveInvite.find({ collegeId })
        .populate("recruiterId", populateFields)
        .sort({ createdAt: -1 })
        .lean(),
      CollegePartnership.find({ collegeId: session.userId })
        .sort({ updatedAt: -1 })
        .lean(),
    ])

    const { sent, received } = splitInvitesForCollege(all)
    const shapedSent = sent.map(shapeInvite)
    const shapedReceived = received.map(shapeInvite)
    const allInvites = [...shapedSent, ...shapedReceived]

    return NextResponse.json({
      stats: {
        ...computeInviteStats(received as any[], sent as any[]),
        activePartnerships: partnerships.filter((p) => p.status === "Active").length,
        totalPartnerships: partnerships.length,
        liveDrives: allInvites.filter((i) => i.linkedDriveId).length,
      },
      sentInvites: shapedSent,
      receivedInvites: shapedReceived,
      activity: buildActivityFeed(allInvites),
      partnerships,
    })
  } catch (error) {
    console.error("[college/campus-partners GET]", error)
    return NextResponse.json({ message: "Failed to load campus partners" }, { status: 500 })
  }
}
