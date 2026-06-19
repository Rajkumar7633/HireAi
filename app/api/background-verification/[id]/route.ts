import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { formatVerificationRow } from "@/lib/background-verification"
import BackgroundVerification from "@/models/BackgroundVerification"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession(_req)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const verification = await BackgroundVerification.findById(params.id)
      .populate("candidateId", "name email")
      .populate("recruiterId", "name")
      .lean()

    if (!verification) {
      return NextResponse.json({ message: "Not found" }, { status: 404 })
    }

    const isRecruiter =
      String(verification.recruiterId?._id || verification.recruiterId) === session.userId
    const isCandidate =
      String(verification.candidateId?._id || verification.candidateId) === session.userId

    if (!isRecruiter && !isCandidate && session.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      verification: formatVerificationRow(verification),
    })
  } catch (error) {
    console.error("[background-verification/id GET]", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
