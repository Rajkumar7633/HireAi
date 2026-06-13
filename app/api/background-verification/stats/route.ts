import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { computeStats } from "@/lib/background-verification"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const stats = await computeStats(session.userId)
    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error("[background-verification/stats]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
