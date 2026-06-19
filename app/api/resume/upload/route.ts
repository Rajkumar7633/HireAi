import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Resume from "@/models/Resume"
import JobSeekerProfile from "@/models/JobSeekerProfile"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// ─── Text Extraction ──────────────────────────────────────────────────────────

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === "application/pdf") {
      // pdfjs-dist is ESM-only; use dynamic import so Next.js doesn't bundle it.
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs" as any)
      const data = new Uint8Array(buffer)
      const pdf = await getDocument({ data, useSystemFonts: true }).promise
      let text = ""
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map((item: any) => item.str).join(" ") + "\n"
      }
      text = text.trim()
      console.log(`[pdfjs-dist] extracted ${text.length} chars, ${pdf.numPages} pages`)
      return text
    }

    if (
      mimeType === "application/msword" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      const text = (result.value || "").trim()
      console.log(`[mammoth] extracted ${text.length} chars`)
      return text
    }
  } catch (err) {
    console.error("Text extraction error:", err)
  }
  return ""
}

// ─── Real ATS Scoring ─────────────────────────────────────────────────────────

const ACTION_VERBS = [
  "led", "built", "developed", "designed", "implemented", "managed", "created", "improved",
  "increased", "reduced", "launched", "delivered", "optimized", "architected", "mentored",
  "collaborated", "established", "deployed", "automated", "streamlined", "achieved",
  "spearheaded", "coordinated", "analyzed", "engineered", "integrated", "executed",
  "transformed", "drove", "generated", "negotiated", "published", "authored",
]

const SECTION_KEYWORDS = [
  "experience", "work experience", "employment", "professional experience",
  "education", "academic", "skills", "technical skills", "core skills",
  "summary", "objective", "profile", "about", "projects", "certifications",
  "achievements", "awards", "languages",
]

const TECH_KEYWORDS = [
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust", "swift", "kotlin",
  "react", "vue", "angular", "next.js", "node.js", "express", "django", "fastapi", "spring",
  "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "aws", "gcp", "azure",
  "docker", "kubernetes", "terraform", "ci/cd", "git", "linux", "agile", "scrum", "rest", "graphql",
  "machine learning", "ai", "data science", "tensorflow", "pytorch", "html", "css", "tailwind",
]

function scoreResume(text: string): {
  score: number
  breakdown: Record<string, number>
  strengths: string[]
  improvements: string[]
  skills: string[]
  wordCount: number
} {
  const lower = text.toLowerCase()
  const words = text.split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const breakdown: Record<string, number> = {}
  const strengths: string[] = []
  const improvements: string[] = []

  // 1. Contact info (15 pts)
  let contactScore = 0
  const hasEmail = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(text)
  const hasPhone = /(\+?\d[\d\s\-().]{7,}\d)/.test(text)
  const hasLinkedIn = /linkedin\.com/i.test(text) || /linkedin/i.test(text)
  if (hasEmail) contactScore += 5
  if (hasPhone) contactScore += 5
  if (hasLinkedIn) contactScore += 5
  breakdown["Contact Info"] = contactScore
  if (contactScore >= 10) strengths.push("Contact information is complete")
  else improvements.push("Add phone number and LinkedIn profile URL")

  // 2. Section headers (20 pts)
  const sectionsFound = SECTION_KEYWORDS.filter((s) => lower.includes(s))
  const sectionScore = Math.min(20, sectionsFound.length * 3)
  breakdown["Section Headers"] = sectionScore
  if (sectionScore >= 15) strengths.push("Well-structured resume with clear sections")
  else improvements.push(`Add standard sections — found only: ${sectionsFound.join(", ") || "none"}`)

  // 3. Length / content density (15 pts)
  let lengthScore = 0
  if (wordCount >= 150) lengthScore += 5
  if (wordCount >= 300) lengthScore += 5
  if (wordCount <= 900) lengthScore += 5  // not too long (2 pages max)
  breakdown["Content Density"] = lengthScore
  if (wordCount < 150) improvements.push("Resume is too short — add more detail to experience and skills")
  else if (wordCount > 900) improvements.push("Resume may be too long — aim for 1-2 pages")
  else strengths.push(`Good content length (${wordCount} words)`)

  // 4. Quantified achievements (20 pts)
  const metrics = (text.match(/\d+[\s]?(%|percent|x|×|million|billion|k\b|users|customers|teams?|members?|engineers?|products?|projects?|clients?)/gi) || [])
  const metricScore = Math.min(20, metrics.length * 4)
  breakdown["Quantified Achievements"] = metricScore
  if (metrics.length >= 3) strengths.push(`Strong use of metrics (${metrics.length} quantified achievements)`)
  else improvements.push("Add more numbers and metrics (e.g., 'improved performance by 40%', 'led team of 5')")

  // 5. Action verbs (15 pts)
  const verbsFound = ACTION_VERBS.filter((v) => new RegExp(`\\b${v}(d|ed|s|ing)?\\b`, "i").test(text))
  const verbScore = Math.min(15, verbsFound.length * 2)
  breakdown["Action Verbs"] = verbScore
  if (verbsFound.length >= 5) strengths.push("Good use of strong action verbs")
  else improvements.push("Start bullet points with strong action verbs (e.g., Led, Built, Improved, Delivered)")

  // 6. Technical keywords (15 pts)
  const techFound = TECH_KEYWORDS.filter((k) => lower.includes(k))
  const techScore = Math.min(15, techFound.length * 2)
  breakdown["Technical Keywords"] = techScore
  if (techFound.length >= 5) strengths.push(`Relevant technical keywords detected (${techFound.length} found)`)
  else improvements.push("Include more technical skills and industry-relevant keywords")

  // Total
  const raw = contactScore + sectionScore + lengthScore + metricScore + verbScore + techScore
  // Normalize to 0–100
  const score = Math.min(100, Math.max(10, Math.round((raw / 100) * 100)))

  // Extract skills from text
  const skills = TECH_KEYWORDS.filter((k) => lower.includes(k))
    .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
    .slice(0, 20)

  return { score, breakdown, strengths, improvements, skills, wordCount }
}

// ─── Optional: Gemini AI enhanced analysis ─────────────────────────────────────

async function geminiEnhancedAnalysis(
  text: string,
  baseScore: number
): Promise<{ score: number; strengths: string[]; improvements: string[]; skills: string[] } | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  try {
    const { google } = await import("@ai-sdk/google")
    const { generateText } = await import("ai")

    const model = google(process.env.GEMINI_MODEL || "gemini-1.5-pro")
    const truncated = text.slice(0, 4000) // stay within token limits

    const { text: aiText } = await generateText({
      model,
      prompt: `You are an expert ATS resume analyzer. Analyze this resume and return ONLY valid JSON with this exact structure:
{
  "score": <integer 0-100 representing ATS compatibility>,
  "strengths": [<up to 4 short strength strings>],
  "improvements": [<up to 4 short improvement strings>],
  "skills": [<list of technical skills found, max 15>]
}

Consider: contact info, section clarity, quantified achievements, keyword density, action verbs, formatting, length.
Base your score on real ATS criteria. My rule-based score was ${baseScore}.

Resume text:
${truncated}`,
      maxOutputTokens: 600,
    })

    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])
    if (typeof parsed.score !== "number") return null
    return parsed
  } catch (err) {
    console.error("Gemini analysis error:", err)
    return null
  }
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json(
        { message: "Unauthorized. Please log in as a job seeker.", requiresAuth: true },
        { status: 401 }
      )
    }

    const formData = await req.formData()
    const resumeFile = formData.get("resume") as File

    if (!resumeFile) {
      return NextResponse.json({ message: "No resume file provided" }, { status: 400 })
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!allowedTypes.includes(resumeFile.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Please upload PDF, DOC, or DOCX." },
        { status: 400 }
      )
    }

    const maxSize = 5 * 1024 * 1024
    if (resumeFile.size > maxSize) {
      return NextResponse.json({ message: "File too large. Max 5 MB." }, { status: 400 })
    }

    await connectDB()

    // Save file to disk
    const uploadsDir = join(process.cwd(), "uploads", "resumes")
    if (!existsSync(uploadsDir)) await mkdir(uploadsDir, { recursive: true })

    const savedName = `${session.userId}_${Date.now()}_${resumeFile.name}`
    const filePath = join(uploadsDir, savedName)
    const bytes = await resumeFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Extract real text from document
    const parsedText = await extractText(buffer, resumeFile.type)
    const hasText = parsedText.trim().length >= 30

    // If we got no text, still proceed with a low score rather than failing —
    // the file itself is valid, it's just a scanned/image-based PDF
    const textForScoring = hasText
      ? parsedText
      : `${resumeFile.name} — could not extract text (possible scanned PDF)`

    // Rule-based real ATS scoring
    const ruleResult = scoreResume(textForScoring)

    // Optionally enhance with Gemini AI (only if we have real text)
    const aiResult = hasText ? await geminiEnhancedAnalysis(textForScoring, ruleResult.score) : null

    const finalScore = aiResult?.score ?? ruleResult.score
    const strengths = aiResult?.strengths ?? ruleResult.strengths
    const improvements = aiResult?.improvements ?? ruleResult.improvements
    const skills = aiResult?.skills ?? ruleResult.skills

    const analysis = {
      strengths,
      improvements: hasText
        ? improvements
        : ["Could not extract text — file may be a scanned/image PDF. Upload a text-based PDF or DOCX for full analysis.", ...improvements],
      breakdown: ruleResult.breakdown,
      wordCount: ruleResult.wordCount,
      aiEnhanced: !!aiResult,
      scannedPdf: !hasText,
    }

    // Persist to Resume collection
    const resume = new Resume({
      userId: session.userId,
      fileName: resumeFile.name,
      fileUrl: `/api/uploads/resumes/${savedName}`,
      rawText: parsedText || resumeFile.name,
      parsedSkills: skills,
      atsScore: finalScore,
      analysis,
      extractedData: { skills },
      status: "processed",
      size: resumeFile.size,
      mimeType: resumeFile.type,
    })
    await resume.save()

    // Persist quick-access fields to JobSeekerProfile
    try {
      await JobSeekerProfile.findOneAndUpdate(
        { userId: session.userId },
        {
          $set: {
            atsScore: finalScore,
            lastAtsAnalysis: analysis,
            lastResumeFileName: resumeFile.name,
            lastResumeText: parsedText.slice(0, 50000),
            lastUpdated: new Date(),
            ...(skills.length > 0 && { skills }),
          },
        },
        { upsert: true }
      )
    } catch { }

    return NextResponse.json({
      message: "Resume analyzed successfully!",
      resume: {
        id: resume._id.toString(),
        filename: resume.fileName,
        originalName: resumeFile.name,
        size: resumeFile.size,
        mimeType: resumeFile.type,
        uploadDate: (resume as any).uploadedAt?.toISOString() ?? new Date().toISOString(),
        userId: session.userId,
        status: resume.status,
        atsScore: finalScore,
        extractedText: parsedText.slice(0, 50000),
        extractedData: { skills },
        analysis,
      },
    })
  } catch (error) {
    console.error("Resume upload error:", error)
    return NextResponse.json({ message: "Internal server error. Please try again." }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized", requiresAuth: true }, { status: 401 })
    }
    await connectDB()
    const resumes = await Resume.find({ userId: session.userId }).sort({ uploadedAt: -1 }).select("-rawText")
    return NextResponse.json(resumes, { status: 200 })
  } catch (error) {
    console.error("Error fetching resumes:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
