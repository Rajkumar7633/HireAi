// import { type NextRequest, NextResponse } from "next/server"
// import { getSession } from "@/lib/auth"
// import { connectDB } from "@/lib/mongodb"
// import Application from "@/models/Application"

// export async function GET(request: NextRequest) {
//   try {
//     const session = await getSession(request)
//     if (!session || session.role !== "recruiter") {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
//     }

//     await connectDB()

//     const applications = await Application.find({
//       status: { $in: ["Pending", "Under Review", "Shortlisted"] },
//     })
//       .populate("jobSeekerId", "name email")
//       .populate("jobDescriptionId", "title recruiterId")
//       .sort({ applicationDate: -1 })

//     // Filter to only include applications for jobs owned by this recruiter
//     const recruiterApplications = applications.filter(
//       (app) => app.jobDescriptionId?.recruiterId?.toString() === session.userId,
//     )

//     return NextResponse.json({
//       success: true,
//       applications: recruiterApplications,
//     })
//   } catch (error) {
//     console.error("Error fetching applications:", error)
//     return NextResponse.json({ success: false, message: "Failed to fetch applications" }, { status: 500 })
//   }
// }

import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const applications = await Application.find({
      status: { $in: ["Pending", "Under Review", "Shortlisted"] },
    })
      .populate({
        path: "jobSeekerId",
        select: "name email",
      })
      .populate({
        path: "jobDescriptionId",
        select: "title recruiterId",
      })
      .sort({ applicationDate: -1 })

    // Debug: Log recruiterIds found
    applications.forEach((app) =>
      console.log(
        "Found recruiterId:",
        app.jobDescriptionId?.recruiterId?.toString(),
      ),
    )

    const recruiterApplications = applications.filter(
      (app) =>
        app.jobDescriptionId?.recruiterId?.toString() === session.userId,
    )

    return NextResponse.json({
      success: true,
      applications: recruiterApplications,
    })
  } catch (error) {
    console.error("Error fetching applications:", error)
    return NextResponse.json(
      { success: false, message: "Failed to fetch applications" },
      { status: 500 },
    )
  }
}

