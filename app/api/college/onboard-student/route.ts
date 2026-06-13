import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"
import Notification from "@/models/Notification"
import bcrypt from "bcryptjs"

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

    const collegeUser = await User.findById(session!.userId).lean() as any
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

    const existing = await User.findOne({ email: email.toLowerCase().trim() })
    if (existing) {
      return NextResponse.json({ message: "A user with this email already exists" }, { status: 409 })
    }

    const collegeUser = await User.findById(session!.userId).lean() as any
    const collegeName = collegeUser?.collegeName || "Your College"

    // Use provided password or generate a temporary one
    const rawPassword = customPassword?.trim() || (generatePassword ? `${name.split(" ")[0].toLowerCase()}@${Date.now().toString().slice(-4)}` : null)
    if (!rawPassword) {
      return NextResponse.json({ message: "Password is required" }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(rawPassword, 12)

    const student = new (User as any)({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "job_seeker",
      phone: phone?.trim(),
      skills: Array.isArray(skills) ? skills : (skills ? String(skills).split(",").map((s: string) => s.trim()).filter(Boolean) : []),
      collegeName,
      // Store which college account onboarded them
      onboardedByCollege: session!.userId,
      department: department?.trim(),
      batch: batch?.trim(),
      cgpa: cgpa ? Number(cgpa) : undefined,
      marks10th: marks10th != null ? Number(marks10th) : undefined,
      marks12th: marks12th != null ? Number(marks12th) : undefined,
      backlogs: backlogs != null ? Number(backlogs) : 0,
      onboardingCompleted: false,
    })

    await student.save()

    // Notify the student (they can use the password to login)
    await Notification.create({
      userId: student._id,
      type: "application_status_update",
      message: `Welcome to HireAI! Your account has been created by ${collegeName}. Log in with your email and the password provided by your placement cell.`,
      relatedEntity: { id: student._id, type: "job_application" },
    }).catch(() => {})

    return NextResponse.json({
      message: "Student onboarded successfully",
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        department: student.department,
        batch: student.batch,
      },
      temporaryPassword: generatePassword ? rawPassword : undefined,
    })
  } catch (error) {
    console.error("Error onboarding student:", error)
    return NextResponse.json({ message: "Failed to onboard student" }, { status: 500 })
  }
}
