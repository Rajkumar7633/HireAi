import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import EmailLog from "@/models/EmailLog"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") || 25), 100)
    const category = request.nextUrl.searchParams.get("category")

    await connectDB()

    const filter: Record<string, unknown> = { recruiterId: session.userId }
    if (category) filter.category = category

    const logs = await EmailLog.find(filter)
      .sort({ sentAt: -1 })
      .limit(limit)
      .select("to subject category sentAt opens clicks templateId")
      .lean()

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("email logs GET error", error)
    return NextResponse.json({ message: "Failed to load logs" }, { status: 500 })
  }
}
