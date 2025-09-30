import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const applications = await Application.find({
      assessmentId: params.id,
    })
      .populate("jobSeekerId", "name email")
      .populate("jobDescriptionId", "title")
      .sort({ applicationDate: -1 })

    return NextResponse.json({
      success: true,
      applications,
    })
  } catch (error) {
    console.error("Error fetching applications:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch applications" }, { status: 500 })
  }
}
