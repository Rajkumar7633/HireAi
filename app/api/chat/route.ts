import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { aiService } from "@/lib/ai-service"

// Lightweight, stateless resume chatbot API.
// GET without params -> return empty conversations list
// GET with conversationId -> return empty messages list (stateless placeholder)
// POST -> takes { conversationId?, messageContent, resumeText } and returns user+ai messages

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")

    if (conversationId) {
      // Return empty message history for now (stateless); UI expects an array
      return NextResponse.json({ messages: [] })
    }

    // Return an empty conversations list; UI handles lack of history gracefully
    return NextResponse.json({ conversations: [] })
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

    if (!messageContent || typeof messageContent !== "string") {
      return NextResponse.json({ message: "messageContent is required" }, { status: 400 })
    }

    const safeResume = typeof resumeText === "string" ? resumeText : ""

    // Use analyzeResume as a structured backbone for feedback; treat message as focus
    const analysis = await aiService.analyzeResume(safeResume, `Focus on: ${messageContent}`, [])

    // Craft a friendly AI reply from the analysis
    const aiReply =
      [
        analysis.score ? `Overall match score: ${analysis.score}/100.` : null,
        analysis.atsScore ? `ATS score: ${analysis.atsScore}/100.` : null,
        analysis.strengths?.length ? `Strengths: ${analysis.strengths.join(", ")}.` : null,
        analysis.weaknesses?.length ? `Gaps: ${analysis.weaknesses.join(", ")}.` : null,
        analysis.skillsMatch?.length ? `Detected key skills: ${analysis.skillsMatch.join(", ")}.` : null,
        analysis.suggestions?.length ? `Suggestions: ${analysis.suggestions.join("; ")}.` : null,
        analysis.recommendations?.length ? `Recommendations: ${analysis.recommendations.join("; ")}.` : null,
      ]
        .filter(Boolean)
        .join("\n") ||
      "I analyzed your resume. Please provide more context or paste your resume text for deeper feedback."

    const now = new Date().toISOString()
    const convoId = conversationId || `conv_${Date.now()}`

    const userMessage = {
      _id: `m_user_${Date.now()}`,
      conversationId: convoId,
      senderId: (session as any).userId || (session as any).user?.id || "user",
      senderRole: "user",
      content: messageContent,
      timestamp: now,
    }

    const aiMessage = {
      _id: `m_ai_${Date.now()}`,
      conversationId: convoId,
      senderId: "ai",
      senderRole: "assistant",
      content: aiReply,
      timestamp: now,
    }

    return NextResponse.json({ conversationId: convoId, userMessage, aiMessage })
  } catch (error) {
    console.error("Chat POST error:", error)
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 })
  }
}