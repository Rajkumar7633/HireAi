import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Resume from "@/models/Resume"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    const resumes = await Resume.find({ userId: session.userId }).sort({ uploadedAt: -1 })

    console.log("[v0] Fetched resumes for user:", session.userId, "Count:", resumes.length)

    // Transform data to match frontend expectations (filename instead of fileName)
    const transformedResumes = resumes.map((resume) => ({
      _id: String(resume._id),
      filename: (resume as any).fileName || (resume as any).filename || "Untitled Resume",
      uploadDate: (resume as any).uploadedAt || (resume as any).createdAt,
      size: (resume as any).size || 0,
      // Expose parsedText for chatbot; use rawText as fallback
      parsedText: (resume as any).rawText || (resume as any).parsedText || "",
    }))

    return NextResponse.json(transformedResumes)
  } catch (error) {
    console.error("Error fetching resumes:", error)
    return NextResponse.json({ message: "Failed to fetch resumes" }, { status: 500 })
  }
}
