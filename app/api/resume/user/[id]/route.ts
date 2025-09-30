import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Resume from "@/models/Resume"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)

    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json(
        { message: "Unauthorized. Only recruiters and admins can view candidate resumes." },
        { status: 401 },
      )
    }

    await connectDB()

    const { id: userId } = params

    const resumes = await Resume.find({ userId }).sort({ uploadedAt: -1 })

    if (!resumes || resumes.length === 0) {
      return NextResponse.json({ resumes: [] }, { status: 200 })
    }

    const transformedResumes = resumes.map((resume) => ({
      _id: resume._id,
      filename: resume.fileName || "Untitled Resume",
      parsedText: resume.rawText || "",
      fileUrl:
        resume.fileUrl && resume.fileUrl.startsWith("/uploads/resumes/")
          ? `/api${resume.fileUrl}`
          : resume.fileUrl,
      metadata: {
        skills: resume.parsedSkills || [],
        experience: resume.experience || "",
        education: resume.education || "",
      },
      uploadDate: resume.uploadedAt || resume.createdAt,
      atsScore: resume.atsScore,
      analysis: resume.analysis,
      extractedData: resume.extractedData,
      status: resume.status,
      size: resume.size,
      mimeType: resume.mimeType,
    }))

    return NextResponse.json({ resumes: transformedResumes }, { status: 200 })
  } catch (error) {
    console.error("Error fetching user resumes:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
