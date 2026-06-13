import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Assessment from "@/models/Assessment"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const assessment = await Assessment.findById(params.id).populate("createdBy", "name email")
    if (!assessment) {
      return NextResponse.json({ message: "Assessment not found" }, { status: 404 })
    }

    if (session.role === "recruiter" && assessment.createdBy?._id?.toString() !== session.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const assessmentObj = assessment.toObject()

    // Never send correctAnswer to candidates
    if (session.role === "job_seeker") {
      assessmentObj.questions = (assessmentObj.questions || []).map((q: any) => {
        const { correctAnswer, explanation, ...safe } = q
        return safe
      })
    }

    return NextResponse.json({ success: true, assessment: assessmentObj })
  } catch (error) {
    console.error("Error fetching assessment:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch assessment" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    if (session.role !== "recruiter" && session.role !== "admin") {
      return NextResponse.json({ message: "Only recruiters can update assessments" }, { status: 403 })
    }

    await connectDB()

    const assessment = await Assessment.findById(params.id)
    if (!assessment) {
      return NextResponse.json({ message: "Assessment not found" }, { status: 404 })
    }

    if (session.role === "recruiter" && assessment.createdBy?.toString() !== session.userId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const updateData = await request.json()
    const allowedFields = [
      "title", "description", "durationMinutes", "passingScore",
      "totalPoints", "difficulty", "status", "questions",
      "settings", "securityFeatures", "requiresProctoring",
    ]
    const updates: any = {}
    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) updates[field] = updateData[field]
    })

    const updatedAssessment = await Assessment.findByIdAndUpdate(params.id, updates, { new: true, runValidators: true })
    return NextResponse.json({ success: true, assessment: updatedAssessment })
  } catch (error) {
    console.error("Error updating assessment:", error)
    return NextResponse.json({ success: false, message: "Failed to update assessment" }, { status: 500 })
  }
}
