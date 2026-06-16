import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import {
  createCollegeStudentAccount,
  sendCollegeStudentWelcomeEmail,
} from "@/lib/college-onboard-student"

function requireCollege(session: Awaited<ReturnType<typeof getSession>>) {
  return session && (session.role === "college" || session.role === "college_admin")
}

// GET /api/college/onboard-student — list students onboarded by this college
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!requireCollege(session)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const collegeUser = await User.findById(session!.userId).lean() as { collegeName?: string } | null
    const collegeName = collegeUser?.collegeName || ""

    const students = await User.find({
      role: "job_seeker",
      onboardedByCollege: session!.userId,
    })
      .select("name email phone skills yearsOfExperience onboardingCompleted createdAt placementStatus placedAt companyPlacedAt packageLPA department batch cgpa marks10th marks12th backlogs")
      .lean()

    return NextResponse.json({ students, collegeName })
  } catch (error) {
    console.error("Error fetching onboarded students:", error)
    return NextResponse.json({ message: "Failed to fetch students" }, { status: 500 })
  }
}

// POST /api/college/onboard-student — create a job_seeker account for a student
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!requireCollege(session)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const body = await request.json()
    const {
      name,
      email,
      phone,
      department,
      batch,
      skills,
      cgpa,
      marks10th,
      marks12th,
      backlogs,
      generatePassword,
      customPassword,
    } = body

    if (!name || !email) {
      return NextResponse.json({ message: "Name and email are required" }, { status: 400 })
    }

    const collegeUser = await User.findById(session!.userId).lean() as { collegeName?: string; name?: string } | null
    const collegeName = collegeUser?.collegeName || collegeUser?.name || "Your College"

    const useGenerated = generatePassword !== false
    if (!useGenerated && !customPassword?.trim()) {
      return NextResponse.json({ message: "Password is required" }, { status: 400 })
    }

    const { student, temporaryPassword } = await createCollegeStudentAccount({
      collegeId: session!.userId,
      collegeName,
      name,
      email,
      phone,
      department,
      batch,
      skills,
      cgpa,
      marks10th,
      marks12th,
      backlogs,
      customPassword: useGenerated ? undefined : customPassword,
    })

    const emailSent = await sendCollegeStudentWelcomeEmail({
      to: student.email,
      name: student.name,
      collegeName,
      email: student.email,
      temporaryPassword,
    })

    return NextResponse.json({
      message: "Student onboarded successfully",
      emailSent,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        department: student.department,
        batch: student.batch,
      },
      temporaryPassword: useGenerated ? temporaryPassword : undefined,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to onboard student"
    const status = message.includes("already exists") ? 409 : 500
    console.error("Error onboarding student:", error)
    return NextResponse.json({ message }, { status })
  }
}
