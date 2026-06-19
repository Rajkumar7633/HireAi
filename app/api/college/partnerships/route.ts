import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { getSession } from "@/lib/auth"
import { CollegePartnership } from "@/models/CollegePartnership"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const partnerships = await CollegePartnership.find({ collegeId: session.userId })
      .sort({ createdAt: -1 })
      .lean()

    // Shape so frontend reads partnership.companyId.name
    const shaped = partnerships.map((p: any) => ({
      ...p,
      companyId: { _id: p._id, name: p.companyName },
    }))

    return NextResponse.json({ partnerships: shaped })
  } catch (err) {
    console.error("[partnerships GET]", err)
    return NextResponse.json({ error: "Failed to fetch partnerships" }, { status: 500 })
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
      recruiterId,
      companyId,         // treated as company name
      companyName: bodyCompanyName,
      partnershipType = "Placement",
      agreementDetails,
      startDate,
      endDate,
    } = body

    const resolvedCompanyName = bodyCompanyName || companyId || "Unknown Company"

    if (!resolvedCompanyName || resolvedCompanyName === "Unknown Company") {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 })
    }

    const partnership = await CollegePartnership.create({
      collegeId: session.userId,
      companyName: resolvedCompanyName,
      recruiterId: recruiterId || undefined,
      partnershipType,
      agreementDetails: agreementDetails || "",
      status: "Pending",
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      drivesConducted: 0,
      studentsPlaced: 0,
      totalPackageValue: 0,
    })

    return NextResponse.json(
      {
        partnership: {
          ...partnership.toObject(),
          companyId: { name: resolvedCompanyName },
        },
        success: true,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("[partnerships POST]", err)
    return NextResponse.json({ error: "Failed to create partnership" }, { status: 500 })
  }
}
