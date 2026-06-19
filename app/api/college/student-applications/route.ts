import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import CollegeStudentRegistration from "@/models/CollegeStudentRegistration"
import Notification from "@/models/Notification"
export { dynamic } from "@/lib/api-dynamic"


function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!requireCollege(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const status = new URL(request.url).searchParams.get("status") || "all"

  try {
    await connectDB()
    const filter: Record<string, unknown> = { collegeId: session!.userId }
    if (status !== "all") filter.status = status

    const applications = await CollegeStudentRegistration.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    const pendingCount = await CollegeStudentRegistration.countDocuments({
      collegeId: session!.userId,
      status: "pending",
    })

    return NextResponse.json({ applications, pendingCount })
  } catch (error) {
    console.error("[student-applications GET]", error)
    return NextResponse.json({ message: "Failed to fetch applications" }, { status: 500 })
  }
}
