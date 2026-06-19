import { type NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { resolvePortalByToken } from "@/lib/college-registration-portal"
import CollegeStudentRegistration from "@/models/CollegeStudentRegistration"
import User from "@/models/User"
export { dynamic } from "@/lib/api-dynamic"


export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const resolved = await resolvePortalByToken(params.token)
    if (!resolved) {
      return NextResponse.json({ message: "Invalid or expired registration link" }, { status: 404 })
    }

    return NextResponse.json({
      college: resolved.college,
      departments: ["Computer Science", "Electronics", "Mechanical", "Civil", "Chemical", "MBA", "MCA", "IT", "Other"],
    })
  } catch (error) {
    console.error("[public college register GET]", error)
    return NextResponse.json({ message: "Failed to load form" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const resolved = await resolvePortalByToken(params.token)
    if (!resolved) {
      return NextResponse.json({ message: "Invalid or expired registration link" }, { status: 404 })
    }

    const body = await request.json()
    const {
      name, email, phone, rollNumber, department, batch,
      cgpa, marks10th, marks12th, backlogs, skills,
      linkedinUrl, githubUrl, additionalInfo,
    } = body

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ message: "Name and email are required" }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    await connectDB()

    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return NextResponse.json({
        message: "This email is already registered on HireAI. Please login or contact your placement cell.",
      }, { status: 409 })
    }

    const pendingDup = await CollegeStudentRegistration.findOne({
      collegeId: resolved.portal.collegeId,
      email: normalizedEmail,
      status: "pending",
    })
    if (pendingDup) {
      return NextResponse.json({
        message: "You already submitted a registration. Please wait for placement cell approval.",
      }, { status: 409 })
    }

    const skillList = Array.isArray(skills)
      ? skills
      : (skills ? String(skills).split(",").map((s: string) => s.trim()).filter(Boolean) : [])

    const application = await CollegeStudentRegistration.create({
      collegeId: resolved.portal.collegeId,
      status: "pending",
      name: String(name).trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      rollNumber: rollNumber?.trim(),
      department: department?.trim(),
      batch: batch?.trim(),
      cgpa: cgpa != null && cgpa !== "" ? Number(cgpa) : undefined,
      marks10th: marks10th != null && marks10th !== "" ? Number(marks10th) : undefined,
      marks12th: marks12th != null && marks12th !== "" ? Number(marks12th) : undefined,
      backlogs: backlogs != null && backlogs !== "" ? Number(backlogs) : 0,
      skills: skillList,
      linkedinUrl: linkedinUrl?.trim(),
      githubUrl: githubUrl?.trim(),
      additionalInfo: additionalInfo?.trim(),
      submittedAt: new Date(),
    })

    return NextResponse.json({
      message: "Registration submitted successfully! You will receive login details by email after placement cell approval.",
      applicationId: application._id,
    }, { status: 201 })
  } catch (error) {
    console.error("[public college register POST]", error)
    return NextResponse.json({ message: "Failed to submit registration" }, { status: 500 })
  }
}
