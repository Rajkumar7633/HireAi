import { NextResponse, type NextRequest } from "next/server"
import { connectDB } from "@/lib/mongodb"
import JobDescription from "@/models/JobDescription"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    await connectDB()
    const jobs = await JobDescription.find({ recruiterId: session.userId }).select("title _id status isActive postedDate").sort({ createdAt: -1 }).lean()
    return NextResponse.json({ jobs })
  } catch (e) {
    console.error("jobs list error", e)
    return NextResponse.json({ message: "Failed to load jobs" }, { status: 500 })
  }
}
