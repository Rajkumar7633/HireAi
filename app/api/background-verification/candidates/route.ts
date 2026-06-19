import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { getEligibleCandidates } from "@/lib/background-verification"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const candidates = await getEligibleCandidates(session.userId)
    return NextResponse.json({ success: true, candidates })
  } catch (error) {
    console.error("[background-verification/candidates]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
