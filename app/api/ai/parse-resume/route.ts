import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === "application/pdf") {
      const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs" as any)
      const data = new Uint8Array(buffer)
      const pdf = await getDocument({ data, useSystemFonts: true }).promise
      let text = ""
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map((item: any) => item.str).join(" ") + "\n"
      }
      return text.trim()
    }

    if (
      mimeType === "application/msword" ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require("mammoth")
      const result = await mammoth.extractRawText({ buffer })
      return (result.value || "").trim()
    }
  } catch (err) {
    console.error("[parse-resume] extraction error:", err)
  }
  return ""
}

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

    if (!ALLOWED_TYPES.includes(file.type)) {
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

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const text = await extractText(buffer, file.type)

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
