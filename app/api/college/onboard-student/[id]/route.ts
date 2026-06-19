import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
export { dynamic } from "@/lib/api-dynamic"


function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

// PATCH /api/college/onboard-student/[id] — update student placement status
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!requireCollege(session)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const { placementStatus, companyPlacedAt, packageLPA, cgpa, department, batch } = body

    const allowed: Record<string, unknown> = {}
    if (placementStatus) allowed.placementStatus = placementStatus
    if (companyPlacedAt) { allowed.companyPlacedAt = companyPlacedAt; allowed.placedAt = new Date() }
    if (packageLPA != null) allowed.packageLPA = Number(packageLPA)
    if (cgpa != null) allowed.cgpa = Number(cgpa)
    if (body.marks10th != null) allowed.marks10th = Number(body.marks10th)
    if (body.marks12th != null) allowed.marks12th = Number(body.marks12th)
    if (body.backlogs != null) allowed.backlogs = Number(body.backlogs)
    if (department) allowed.department = department
    if (batch) allowed.batch = batch

    const student = await User.findOneAndUpdate(
      { _id: params.id, onboardedByCollege: session!.userId },
      { $set: allowed },
      { new: true },
    ).select("name email department batch placementStatus companyPlacedAt packageLPA cgpa")

    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error("Error updating student:", error)
    return NextResponse.json({ message: "Failed to update student" }, { status: 500 })
  }
}

// DELETE /api/college/onboard-student/[id] — remove student from college's roster (does not delete the account)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!requireCollege(session)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const student = await User.findOneAndUpdate(
      { _id: params.id, onboardedByCollege: session!.userId },
      { $unset: { onboardedByCollege: 1 } },
      { new: true },
    )

    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Student removed from college roster" })
  } catch (error) {
    console.error("Error removing student:", error)
    return NextResponse.json({ message: "Failed to remove student" }, { status: 500 })
  }
}
