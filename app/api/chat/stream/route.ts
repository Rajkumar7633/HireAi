import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { aiService } from "@/lib/ai-service"

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const { messageContent, resumeText } = await req.json()
    if (!messageContent || typeof messageContent !== "string") {
      return new Response("messageContent is required", { status: 400 })
    }
    const safeResume = typeof resumeText === "string" ? resumeText : ""

    // Generate one full response with aiService, then stream in chunks
    const analysis = await aiService.analyzeResume(safeResume, `Focus on: ${messageContent}`, [])
    const final =
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

    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const words = final.split(" ")
          let buf = ""
          for (let i = 0; i < words.length; i++) {
            buf += (i ? " " : "") + words[i]
            if (i % 28 === 0 || i === words.length - 1) {
              controller.enqueue(encoder.encode(`data: ${buf}\n\n`))
              buf = ""
              await new Promise((r) => setTimeout(r, 35))
            }
          }
        } catch (e) {
          controller.error(e)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=UTF-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (e) {
    return new Response("Failed to stream response", { status: 500 })
  }
}
