import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { CollegePlacement } from "@/models/CollegePlacement"
import User from "@/models/User"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const placements = await CollegePlacement.find({ collegeId: session.userId })
      .populate("studentId", "name email department batch profileImage")
      .populate("driveId", "companyName role driveDate")
      .sort({ createdAt: -1 })
      .lean()

    // Shape response so frontend reads placement.companyId.name
    const shaped = placements.map((p: any) => ({
      ...p,
      companyId: { _id: p._id, name: p.companyName },
    }))

    return NextResponse.json({ placements: shaped })
  } catch (err) {
    console.error("[placements GET]", err)
    return NextResponse.json({ error: "Failed to fetch placements" }, { status: 500 })
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
      studentId,
      driveId,
      companyId,        // treated as companyName or ignored
      companyName: bodyCompanyName,
      recruiterId,
      jobTitle,
      jobDescription,
      package: pkg,
      packageType = "CTC",
      currency = "INR",
      location,
      offerDate,
      joiningDate,
      placementType = "Campus Placement",
    } = body

    if (!studentId || !jobTitle) {
      return NextResponse.json({ error: "studentId and jobTitle are required" }, { status: 400 })
    }

    // Resolve company name: accept explicit companyName or fall back to companyId string
    const resolvedCompanyName = bodyCompanyName || companyId || "Unknown Company"

    const placement = await CollegePlacement.create({
      collegeId: session.userId,
      studentId,
      driveId: driveId || undefined,
      companyName: resolvedCompanyName,
      recruiterId: recruiterId || undefined,
      jobTitle,
      jobDescription: jobDescription || "",
      package: Number(pkg) || 0,
      packageType,
      currency,
      location: location || "",
      offerDate: offerDate ? new Date(offerDate) : undefined,
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      placementType,
      offerStatus: "Pending",
    })

    // Update student placement status to offer_received
    await User.findByIdAndUpdate(studentId, {
      placementStatus: "offer_received",
      companyPlacedAt: resolvedCompanyName,
      packageLPA: Number(pkg) || 0,
    })

    const populated = await CollegePlacement.findById(placement._id)
      .populate("studentId", "name email department batch profileImage")
      .populate("driveId", "companyName role driveDate")
      .lean() as any

    return NextResponse.json(
      {
        placement: {
          ...populated,
          companyId: { name: resolvedCompanyName },
        },
        success: true,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[placements POST]", err)
    return NextResponse.json({ error: "Failed to create placement" }, { status: 500 })
  }
}
