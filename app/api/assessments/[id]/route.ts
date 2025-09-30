// import { type NextRequest, NextResponse } from "next/server"
// import { getSession } from "@/lib/auth"
// import { connectDB } from "@/lib/mongodb"
// import Assessment from "@/models/Assessment"

// export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     const session = await getSession(request)
//     if (!session) {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
//     }

//     await connectDB()

//     const assessment = await Assessment.findById(params.id).populate("recruiterId", "name email")

//     if (!assessment) {
//       return NextResponse.json({ message: "Assessment not found" }, { status: 404 })
//     }

//     if (session.role === "recruiter" && assessment.recruiterId._id.toString() !== session.userId) {
//       return NextResponse.json({ message: "Forbidden" }, { status: 403 })
//     }

//     return NextResponse.json({
//       success: true,
//       assessment,
//     })
//   } catch (error) {
//     console.error("Error fetching assessment:", error)
//     return NextResponse.json({ success: false, message: "Failed to fetch assessment" }, { status: 500 })
//   }
// }




// testing code 

import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Assessment from "@/models/Assessment"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] Assessment API: Getting assessment", params.id)

    const session = await getSession(request)
    console.log("[v0] Assessment API: Session check result:", session ? "SUCCESS" : "FAILED")

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    console.log("[v0] Assessment API: Database connected")

    const assessment = await Assessment.findById(params.id).populate("createdBy", "name email")
    console.log("[v0] Assessment API: Assessment found:", !!assessment)

    if (!assessment) {
      return NextResponse.json({ message: "Assessment not found" }, { status: 404 })
    }

    if (session.role === "recruiter" && assessment.createdBy?._id?.toString() !== session.userId) {
      console.log(
        "[v0] Assessment API: Permission denied - user:",
        session.userId,
        "creator:",
        assessment.createdBy?._id?.toString(),
      )
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    console.log("[v0] Assessment API: Returning assessment data")
    return NextResponse.json({
      success: true,
      assessment,
    })
  } catch (error) {
    console.error("[v0] Assessment API: Error fetching assessment:", error)
    return NextResponse.json({ success: false, message: "Failed to fetch assessment" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log("[v0] Assessment API: Updating assessment", params.id)

    const session = await getSession(request)
    console.log("[v0] Assessment API: Session check result:", session ? "SUCCESS" : "FAILED")

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    if (session.role !== "recruiter") {
      return NextResponse.json({ message: "Only recruiters can update assessments" }, { status: 403 })
    }

    await connectDB()
    console.log("[v0] Assessment API: Database connected for update")

    const assessment = await Assessment.findById(params.id)
    console.log("[v0] Assessment API: Assessment found for update:", !!assessment)

    if (!assessment) {
      return NextResponse.json({ message: "Assessment not found" }, { status: 404 })
    }

    // Check permission
    if (assessment.createdBy?.toString() !== session.userId) {
      console.log(
        "[v0] Assessment API: Update permission denied - user:",
        session.userId,
        "creator:",
        assessment.createdBy?.toString(),
      )
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const updateData = await request.json()
    console.log("[v0] Assessment API: Update data received:", Object.keys(updateData))

    // Update allowed fields
    const allowedFields = ["title", "description", "durationMinutes", "passingScore"]
    const updates: any = {}

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field]
      }
    })

    const updatedAssessment = await Assessment.findByIdAndUpdate(params.id, updates, { new: true, runValidators: true })

    console.log("[v0] Assessment API: Assessment updated successfully")
    return NextResponse.json({
      success: true,
      assessment: updatedAssessment,
    })
  } catch (error) {
    console.error("[v0] Assessment API: Error updating assessment:", error)
    return NextResponse.json({ success: false, message: "Failed to update assessment" }, { status: 500 })
  }
}
