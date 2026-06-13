import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import CampusDrive from "@/models/CampusDrive"
import CampusDriveApplication from "@/models/CampusDriveApplication"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const drive = await (CampusDrive as any)
      .findOne({ _id: params.id, collegeId: session.userId })
      .lean()

    if (!drive) return NextResponse.json({ error: "Drive not found" }, { status: 404 })

    const applicants = await (CampusDriveApplication as any)
      .find({ driveId: params.id })
      .sort({ appliedAt: -1 })
      .lean()

    return NextResponse.json({ drive, applicants })
  } catch (error) {
    console.error("GET drive [id] error:", error)
    return NextResponse.json({ error: "Failed to fetch drive" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const body = await req.json()

    const drive = await (CampusDrive as any).findOneAndUpdate(
      { _id: params.id, collegeId: session.userId },
      { $set: body },
      { new: true }
    )

    if (!drive) return NextResponse.json({ error: "Drive not found" }, { status: 404 })
    return NextResponse.json({ drive, success: true })
  } catch (error) {
    console.error("PATCH drive [id] error:", error)
    return NextResponse.json({ error: "Failed to update drive" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "college" && session.role !== "college_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    await (CampusDrive as any).findOneAndDelete({ _id: params.id, collegeId: session.userId })
    await (CampusDriveApplication as any).deleteMany({ driveId: params.id })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE drive error:", error)
    return NextResponse.json({ error: "Failed to delete drive" }, { status: 500 })
  }
}
