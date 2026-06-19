import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { aiService } from "@/lib/ai-service"
import mongoose from "mongoose"
export { dynamic } from "@/lib/api-dynamic"


// Lazy-register a lightweight AI chat log collection
function getChatLogModel() {
  if (mongoose.models.AIChatLog) return mongoose.models.AIChatLog
  const schema = new mongoose.Schema(
    {
      userId: { type: String, required: true, index: true },
      conversationId: { type: String, required: true, index: true },
      role: { type: String, enum: ["user", "assistant"], required: true },
      content: { type: String, required: true },
    },
    { timestamps: true },
  )
  schema.index({ conversationId: 1, createdAt: 1 })
  return mongoose.model("AIChatLog", schema)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const AIChatLog = getChatLogModel()
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")

    if (conversationId) {
      const messages = await AIChatLog.find({
        userId: session.userId,
        conversationId,
      })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean()

      return NextResponse.json({
        messages: messages.map((m: any) => ({
          _id: m._id.toString(),
          conversationId: m.conversationId,
          senderId: m.role === "user" ? session.userId : "ai",
          senderRole: m.role === "user" ? "user" : "assistant",
          content: m.content,
          timestamp: m.createdAt,
        })),
      })
    }

    // List unique conversations for this user
    const convos = await AIChatLog.aggregate([
      { $match: { userId: session.userId, role: "user" } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$content" },
          lastAt: { $first: "$createdAt" },
        },
      },
      { $limit: 20 },
    ])

    return NextResponse.json({
      conversations: convos.map((c: any) => ({
        _id: c._id,
        jobSeekerId: session.userId,
        type: "resume_chatbot",
        createdAt: c.lastAt,
        lastMessageAt: c.lastAt,
        preview: c.lastMessage?.slice(0, 60),
      })),
    })
  } catch (error) {
    console.error("Chat GET error:", error)
    return NextResponse.json({ message: "Failed to fetch chat data" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { conversationId, messageContent, resumeText } = await request.json()

    if (!messageContent || typeof messageContent !== "string" || messageContent.trim().length === 0) {
      return NextResponse.json({ message: "messageContent is required" }, { status: 400 })
    }

    await connectDB()
    const AIChatLog = getChatLogModel()

    const convoId = conversationId || `conv_${session.userId}_${Date.now()}`
    const safeResume = typeof resumeText === "string" ? resumeText : ""

    // Generate AI reply
    const analysis = await aiService.analyzeResume(safeResume, `Focus on: ${messageContent}`, [])

    const aiReply =
      [
        analysis.score ? `Overall match score: ${analysis.score}/100.` : null,
        analysis.atsScore ? `ATS score: ${analysis.atsScore}/100.` : null,
        analysis.strengths?.length ? `Strengths: ${analysis.strengths.join(", ")}.` : null,
        analysis.weaknesses?.length ? `Gaps: ${analysis.weaknesses.join(", ")}.` : null,
        analysis.skillsMatch?.length ? `Key skills detected: ${analysis.skillsMatch.join(", ")}.` : null,
        analysis.suggestions?.length ? `Suggestions: ${analysis.suggestions.join("; ")}.` : null,
        analysis.recommendations?.length ? `Recommendations: ${analysis.recommendations.join("; ")}.` : null,
      ]
        .filter(Boolean)
        .join("\n") ||
      "Please paste your resume text and describe what role you're targeting — I'll give you detailed feedback."

    // Persist both messages
    await AIChatLog.insertMany([
      { userId: session.userId, conversationId: convoId, role: "user", content: messageContent.trim() },
      { userId: session.userId, conversationId: convoId, role: "assistant", content: aiReply },
    ])

    const now = new Date().toISOString()
    return NextResponse.json({
      conversationId: convoId,
      userMessage: {
        _id: `m_user_${Date.now()}`,
        conversationId: convoId,
        senderId: session.userId,
        senderRole: "user",
        content: messageContent.trim(),
        timestamp: now,
      },
      aiMessage: {
        _id: `m_ai_${Date.now()}`,
        conversationId: convoId,
        senderId: "ai",
        senderRole: "assistant",
        content: aiReply,
        timestamp: now,
      },
    })
  } catch (error) {
    console.error("Chat POST error:", error)
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")
    if (!conversationId) {
      return NextResponse.json({ message: "conversationId is required" }, { status: 400 })
    }

    await connectDB()
    const AIChatLog = getChatLogModel()
    await AIChatLog.deleteMany({ userId: session.userId, conversationId })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Chat DELETE error:", error)
    return NextResponse.json({ message: "Failed to delete conversation" }, { status: 500 })
  }
}
