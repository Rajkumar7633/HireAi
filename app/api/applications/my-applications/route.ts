export { dynamic } from "@/lib/api-dynamic"

// import { type NextRequest, NextResponse } from "next/server"
// import { getSession } from "@/lib/auth"

// const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

// export async function GET(req: NextRequest) {
//   const session = await getSession(req)

//   if (!session || session.role !== "job_seeker") {
//     return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
//   }

//   try {
//     const response = await fetch(`${BACKEND_URL}/api/applications/my-applications`, {
//       headers: {
//         Authorization: `Bearer ${session.userId}`,
//       },
//       cache: "no-store", // Ensure fresh data
//     })

//     if (!response.ok) {
//       const errorData = await response.json()
//       return NextResponse.json(
//         { message: errorData.msg || "Failed to fetch my applications" },
//         { status: response.status },
//       )
//     }

//     const data = await response.json()
//     return NextResponse.json({ applications: data }, { status: 200 })
//   } catch (error) {
//     console.error("Error fetching my applications:", error)
//     return NextResponse.json({ message: "Internal server error" }, { status: 500 })
//   }
// }


import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
// Important: ensure the JobDescription model is registered before populate
import "@/models/JobDescription"
import "@/models/Resume"
import "@/models/Test"
import {
  getPipelineProgress,
  normalizeApplicationStatus,
} from "@/lib/application-status"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const applications = await Application.find({ jobSeekerId: session.userId })
      .populate("jobDescriptionId", "title location recruiterId companyId")
      .populate("resumeId", "filename")
      .populate("testId", "title")
      .sort({ applicationDate: -1 })
      .lean()

    const enriched = applications.map((app) => {
      const normalizedStatus = normalizeApplicationStatus(app.status)
      const pipelineProgress = getPipelineProgress({
        status: app.status,
        currentStage: app.currentStage,
        rounds: app.rounds,
      })
      return {
        ...app,
        status: normalizedStatus,
        rawStatus: app.status,
        pipelineProgress,
      }
    })

    return NextResponse.json({ applications: enriched })
  } catch (error) {
    console.error("Error fetching applications:", error)
    return NextResponse.json({ message: "Failed to fetch applications" }, { status: 500 })
  }
}
