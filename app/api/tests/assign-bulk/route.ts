import { NextResponse, type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Application from "@/models/Application"
import Resume from "@/models/Resume"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { jobId, testId, candidates } = await request.json()
    if (!jobId || !testId || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ message: "jobId, testId and candidates[] are required" }, { status: 400 })
    }

    await connectDB()

    let updated = 0
    let created = 0

    for (const c of candidates) {
      const userId = c.userId || c.jobSeekerId
      if (!userId) continue

      let app = await Application.findOne({ jobDescriptionId: jobId, jobSeekerId: userId })

      if (!app) {
        const latestResume = await Resume.findOne({ userId, status: "processed" }).sort({ uploadedAt: -1 }).select("_id").lean()
        app = await Application.create({
          jobDescriptionId: jobId,
          jobSeekerId: userId,
          applicantId: userId,
          resumeId: latestResume?._id,
          status: "Pending",
          applicationDate: new Date(),
          appliedAt: new Date(),
        })
        created += 1
      }

      await Application.updateOne(
        { _id: app._id },
        {
          $set: {
            testId,
            status: "Test Assigned",
            assignedBy: session.userId,
            assignedAt: new Date(),
          },
        },
      )
      updated += 1
    }

    return NextResponse.json({ updated, created })
  } catch (e) {
    console.error("bulk test assign error", e)
    return NextResponse.json({ message: "Failed to assign tests" }, { status: 500 })
  }
}
