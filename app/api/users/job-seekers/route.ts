import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(req.url)
    const q = searchParams.get("q")?.trim() || ""

    const filter: any = { role: "job_seeker" }
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ]
    }

    const users = await User.find(filter)
      .select("_id name email skills department batch profileImage")
      .limit(50)
      .lean()

    return NextResponse.json({ users })
  } catch (err) {
    console.error("[job-seekers GET]", err)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}
