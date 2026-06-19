import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import mongoose from "mongoose"

// ─── Chat log model (same as /api/chat/route.ts) ─────────────────────────────
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

// ─── Gemini conversational response ────────────────────────────────────────────
async function getGeminiResponse(userMessage: string, resumeText: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  try {
    const { google } = await import("@ai-sdk/google")
    const { generateText } = await import("ai")
    const model = google(process.env.GEMINI_MODEL || "gemini-1.5-pro")
    const truncated = resumeText.slice(0, 3500)
    const { text } = await generateText({
      model,
      prompt: `You are an expert resume coach and career advisor. You have access to the candidate's resume below.
Answer their question in a helpful, specific, conversational way. Be direct and actionable.
Use bullet points or numbered lists where appropriate. Do NOT return JSON. Max 300 words.

RESUME:
${truncated || "(no resume text provided — give general advice)"}

CANDIDATE'S QUESTION: ${userMessage}

Your response:`,
      maxOutputTokens: 700,
      temperature: 0.7,
    })
    return text.trim() || null
  } catch (err) {
    console.error("[Gemini] conversational error:", err)
    return null
  }
}

// ─── Rule-based conversational fallback ──────────────────────────────────────
function ruleBasedResponse(userMessage: string, resumeText: string): string {
  const lower = userMessage.toLowerCase()
  const resumeLower = resumeText.toLowerCase()

  const hasEmail = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(resumeText)
  const hasPhone = /(\+?\d[\d\s\-().]{7,}\d)/.test(resumeText)
  const hasLinkedIn = /linkedin/i.test(resumeText)
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length
  const metricsCount = (resumeText.match(/\d+[\s]?(%|percent|x|×|million|billion|k\b|users?|teams?|members?|engineers?)/gi) || []).length

  const ACTION_VERBS = ["led", "built", "developed", "designed", "implemented", "managed", "created", "improved",
    "increased", "reduced", "launched", "delivered", "optimized", "architected", "deployed", "automated", "streamlined"]
  const verbsFound = ACTION_VERBS.filter((v) => new RegExp(`\\b${v}`, "i").test(resumeText))

  const TECH_SKILLS = ["javascript", "typescript", "python", "java", "c++", "react", "vue", "angular", "node",
    "next.js", "express", "django", "sql", "postgresql", "mongodb", "redis", "aws", "gcp", "azure", "docker",
    "kubernetes", "git", "ci/cd", "graphql", "rest", "machine learning", "tensorflow", "pytorch"]
  const skillsFound = TECH_SKILLS.filter((k) => resumeLower.includes(k))

  const SECTIONS = ["experience", "education", "skills", "projects", "summary", "certifications", "achievements"]
  const sectionsFound = SECTIONS.filter((s) => resumeLower.includes(s))

  // ── ATS question ──────────────────────────────────────────────────────────
  if (lower.includes("ats") || lower.includes("applicant tracking") || lower.includes("ats-friendly")) {
    const missing: string[] = []
    if (!hasEmail) missing.push("email address")
    if (!hasPhone) missing.push("phone number")
    if (!hasLinkedIn) missing.push("LinkedIn profile URL")
    if (wordCount < 300) missing.push("more content (aim for 400–600 words)")
    if (metricsCount < 2) missing.push("quantified achievements (e.g. 'improved performance by 30%')")
    if (skillsFound.length < 3) missing.push("relevant technical keywords matching job descriptions")

    const good: string[] = []
    if (hasEmail) good.push("Email included ✅")
    if (hasPhone) good.push("Phone number included ✅")
    if (hasLinkedIn) good.push("LinkedIn profile ✅")
    if (skillsFound.length >= 3) good.push(`Technical keywords: ${skillsFound.slice(0, 5).join(", ")} ✅`)
    if (sectionsFound.length >= 3) good.push(`Clear sections: ${sectionsFound.join(", ")} ✅`)

    return `**ATS Optimization Report**\n\n${good.length ? `✅ **Already good:**\n${good.map((g) => `• ${g}`).join("\n")}\n\n` : ""}${missing.length ? `⚠️ **Missing or weak:**\n${missing.map((m) => `• Add ${m}`).join("\n")}\n\n` : ""}**Top ATS tip:** Mirror the exact keywords and phrases from each job description you apply to — ATS filters on exact phrase matches. Don't paraphrase; copy the terminology.`
  }

  // ── Metrics / quantify ───────────────────────────────────────────────────
  if (lower.includes("quantif") || lower.includes("metric") || lower.includes("number") || lower.includes("achievement")) {
    return `**Adding Metrics to Your Resume**\n\nYour resume currently has **${metricsCount} quantified achievement${metricsCount !== 1 ? "s" : ""}**. Aim for at least 5–8.\n\n**Weak → Strong examples:**\n• "Managed a team" → "Managed a team of 6 engineers, delivering 4 features on schedule"\n• "Improved app performance" → "Reduced API response time by 40%, cutting server costs by 25%"\n• "Built a feature" → "Built search feature used by 15,000+ users, increasing retention by 12%"\n• "Handled support tickets" → "Resolved 50+ tickets/week with 98% satisfaction rate"\n\n**Template:** [Action verb] + [what you did] + [measurable result]\n\nScan every bullet in your Experience section and ask: *"Can I add a number here?"* Even rough estimates ("~50 clients", "across 3 teams") are better than none.`
  }

  // ── Skills / keywords ────────────────────────────────────────────────────
  if (lower.includes("skill") || lower.includes("keyword") || lower.includes("tech") || lower.includes("add to")) {
    return `**Skills & Keywords Analysis**\n\nDetected in your resume: **${skillsFound.length > 0 ? skillsFound.join(", ") : "none from the common tech list"}**\n\n**For tech/software roles, consider adding:**\n• **Languages:** Python, TypeScript, Java, Go (whichever you know)\n• **Frontend:** React, Next.js, Tailwind CSS\n• **Backend:** Node.js, Express, Django, FastAPI\n• **Databases:** PostgreSQL, MongoDB, Redis\n• **Cloud/DevOps:** AWS (or GCP/Azure), Docker, Kubernetes, CI/CD\n• **Practices:** REST APIs, Agile/Scrum, Microservices, Git\n\n**Rule:** Only list skills you can speak to in an interview. For each skill add it as a bullet in your Skills section AND mention it in your experience bullets for ATS reinforcement.`
  }

  // ── Action verbs / bullets / format ────────────────────────────────────
  if (lower.includes("action verb") || lower.includes("bullet") || lower.includes("format") || lower.includes("improve my writing")) {
    return `**Resume Writing & Formatting**\n\nYour resume uses **${verbsFound.length} strong action verb${verbsFound.length !== 1 ? "s" : ""}** (${verbsFound.slice(0, 6).join(", ") || "none detected yet"}).\n\n**Best action verbs by category:**\n• **Building:** Engineered, Architected, Built, Developed, Designed\n• **Leading:** Led, Directed, Mentored, Managed, Oversaw\n• **Improving:** Optimized, Streamlined, Automated, Reduced, Accelerated\n• **Delivering:** Launched, Shipped, Deployed, Delivered, Released\n• **Analyzing:** Researched, Analyzed, Identified, Evaluated, Assessed\n\n**Formatting rules:**\n• Every bullet starts with a past-tense action verb\n• Max 2 lines per bullet point\n• 3–5 bullets per role\n• Consistent tense (past for old jobs, present for current)\n• No "Responsible for" or "Helped with" — be direct`
  }

  // ── Overall review ───────────────────────────────────────────────────────
  if (lower.includes("review") || lower.includes("overall") || lower.includes("feedback") || lower.includes("assess") || lower.includes("improve") || lower.includes("better")) {
    const good: string[] = []
    const issues: string[] = []

    if (hasEmail && hasPhone && hasLinkedIn) good.push("Contact info is complete (email, phone, LinkedIn)")
    else if (hasEmail) issues.push("Add phone number and LinkedIn URL to contact section")

    if (wordCount >= 250 && wordCount <= 800) good.push(`Good length — ${wordCount} words (ideal is 350–600)`)
    else if (wordCount < 250) issues.push(`Too short — only ${wordCount} words, aim for 350–600`)
    else issues.push(`Too long — ${wordCount} words; trim to 1–2 pages`)

    if (verbsFound.length >= 5) good.push(`Uses strong action verbs: ${verbsFound.slice(0, 4).join(", ")}`)
    else issues.push("Add more action verbs to bullet points (Led, Built, Delivered, Optimized)")

    if (metricsCount >= 3) good.push(`Solid metrics — ${metricsCount} quantified achievements`)
    else issues.push(`Only ${metricsCount} metrics found — aim for 5+ quantified achievements`)

    if (skillsFound.length >= 4) good.push(`Good tech keyword coverage: ${skillsFound.slice(0, 4).join(", ")}`)
    else issues.push("Add more relevant technical keywords for your target role")

    if (sectionsFound.length >= 4) good.push(`Well-structured with ${sectionsFound.length} clear sections`)
    else issues.push(`Add missing sections: ${SECTIONS.filter((s) => !sectionsFound.includes(s)).slice(0, 3).join(", ")}`)

    return `**Overall Resume Assessment**\n\n✅ **Strengths (${good.length}):**\n${good.length ? good.map((g) => `• ${g}`).join("\n") : "• Upload a resume with extractable text to get detailed feedback"}\n\n⚠️ **Top improvements (${issues.length}):**\n${issues.length ? issues.map((i) => `• ${i}`).join("\n") : "• Resume looks solid!"}\n\n**Priority action:** ${issues[0] || "Keep refining your metrics and keywords for each job application"}.`
  }

  // ── Default ──────────────────────────────────────────────────────────────
  const noResume = wordCount < 30
  return noResume
    ? `I don't see much text from your resume yet. This might happen if your PDF is image-based (scanned). Try uploading a text-based PDF or DOCX for the best analysis.\n\nIn the meantime, I can help with:\n• **ATS tips** — how to beat applicant tracking systems\n• **Metrics** — how to quantify your achievements\n• **Skills to add** — keywords for your target role\n• **Overall review** — just describe your experience and I'll guide you`
    : `Here's a quick snapshot of your resume:\n\n• **Contact:** ${hasEmail ? "Email ✅" : "No email ⚠️"} · ${hasPhone ? "Phone ✅" : "No phone ⚠️"} · ${hasLinkedIn ? "LinkedIn ✅" : "LinkedIn not found"}\n• **Length:** ${wordCount} words ${wordCount < 300 ? "(a bit short)" : wordCount > 800 ? "(consider trimming)" : "(good range)"}\n• **Metrics:** ${metricsCount} quantified achievements ${metricsCount < 3 ? "⚠️ add more" : "✅"}\n• **Action verbs:** ${verbsFound.length} found\n• **Tech skills detected:** ${skillsFound.length > 0 ? skillsFound.slice(0, 6).join(", ") : "none — add your stack!"}\n\nWhat would you like to work on? Try asking for an **overall review**, **ATS tips**, **skills to add**, or **how to quantify achievements**.`
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== "job_seeker") {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const body = await req.json()
    const { messageContent, resumeText, conversationId: clientConvoId } = body

    if (!messageContent || typeof messageContent !== "string") {
      return new Response("messageContent is required", { status: 400 })
    }

    const safeResume = typeof resumeText === "string" ? resumeText : ""
    // Use the client-supplied ID so both page and DB stay in sync
    const convoId = clientConvoId || `conv_${session.userId}_${Date.now()}`

    // Generate AI response (Gemini → rule-based fallback)
    const aiContent =
      (await getGeminiResponse(messageContent, safeResume)) ??
      ruleBasedResponse(messageContent, safeResume)

    // Persist both messages to DB (non-blocking — stream starts immediately)
    connectDB()
      .then(() => {
        const AIChatLog = getChatLogModel()
        return AIChatLog.insertMany([
          { userId: session.userId, conversationId: convoId, role: "user", content: messageContent.trim() },
          { userId: session.userId, conversationId: convoId, role: "assistant", content: aiContent },
        ])
      })
      .catch((err) => console.error("[AIChatLog] persist error:", err))

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          const words = aiContent.split(" ")
          let buf = ""
          for (let i = 0; i < words.length; i++) {
            buf += (i > 0 ? " " : "") + words[i]
            const flush = i % 6 === 0 || /[.!?\n]/.test(words[i]) || i === words.length - 1
            if (flush) {
              controller.enqueue(encoder.encode(`data: ${buf}\n\n`))
              buf = ""
              await new Promise((r) => setTimeout(r, 28))
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
        "X-Conversation-Id": convoId,
      },
    })
  } catch (e) {
    console.error("[stream] error:", e)
    return new Response("Failed to stream response", { status: 500 })
  }
}
