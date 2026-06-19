import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { extractResumeText, detectMimeType } from "@/lib/resume-text-extract"
export { dynamic } from "@/lib/api-dynamic"


const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("resume") as File | null

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const resolvedMime = detectMimeType(buffer, file.type)

    if (
      !ALLOWED_TYPES.includes(file.type) &&
      !resolvedMime.includes("pdf") &&
      !resolvedMime.includes("word") &&
      !file.name.match(/\.(pdf|docx?)$/i)
    ) {
      return NextResponse.json(
        { message: "Invalid file type. Please upload a PDF or Word document." },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { message: "File too large. Maximum size is 5 MB." },
        { status: 400 }
      )
    }

    const text = await extractResumeText(buffer, resolvedMime, file.name)

    if (!text) {
      return NextResponse.json(
        { message: "Could not extract text from this file. Please try a different file or paste the text manually." },
        { status: 422 }
      )
    }

    return NextResponse.json({
      text,
      fileName: file.name,
      charCount: text.length,
    })
  } catch (error) {
    console.error("[parse-resume] error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
