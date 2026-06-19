import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"
import Notification from "@/models/Notification"
export { dynamic } from "@/lib/api-dynamic"


function getSkillGapModel() {
  if (mongoose.models.SkillGapAnalysis) return mongoose.models.SkillGapAnalysis
  const schema = new mongoose.Schema(
    {
      userId: { type: String, required: true, index: true },
      jobTitle: { type: String, required: true },
      jobDescription: { type: String, default: "" },
      resumeText: { type: String, default: "" },
      currentSkills: [String],
      requiredSkills: [String],
      missingSkills: [
        {
          skill: String,
          importance: { type: String, enum: ["critical", "important", "nice-to-have"] },
          estimatedWeeks: Number,
          resources: [{ title: String, url: String, type: String }],
        },
      ],
      matchScore: Number,
      readinessLevel: String,
      summary: String,
      learningPath: [
        {
          week: Number,
          focus: String,
          skills: [String],
          resources: [String],
        },
      ],
    },
    { timestamps: true },
  )
  schema.index({ userId: 1, createdAt: -1 })
  return mongoose.model("SkillGapAnalysis", schema)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getSession(_request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const SkillGapAnalysis = getSkillGapModel()
    const deleted = await (SkillGapAnalysis as any).findOneAndDelete({
      _id: params.id,
      userId: session.userId,
    })

    if (!deleted) return NextResponse.json({ message: "Analysis not found" }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ message: "Delete failed" }, { status: 500 })
  }
}
