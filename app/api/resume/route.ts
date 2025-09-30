import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Resume from "@/models/Resume"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    await connectDB()

    const resumes = await Resume.find({ userId: session.userId }).select("fileName uploadDate").sort({ uploadDate: -1 })

    return NextResponse.json({ resumes })
  } catch (error) {
    console.error("Error fetching resumes:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
