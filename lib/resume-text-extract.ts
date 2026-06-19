import { tmpdir } from "os"
import { join } from "path"
import { writeFile, unlink } from "fs/promises"

export function detectMimeType(buffer: Buffer, declared: string): string {
  if (declared && declared !== "application/octet-stream") return declared
  const head = buffer.subarray(0, 4).toString("utf8")
  if (head.startsWith("%PDF")) return "application/pdf"
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
  return declared || "application/octet-stream"
}

async function extractPdfWithPdfParse(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText({ first: 25 })
    return (result.text || "").trim()
  } finally {
    await parser.destroy().catch(() => {})
  }
}

async function extractPdfWithPdfJs(buffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string)
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    useWorkerFetch: false,
    disableFontFace: true,
  }).promise

  let text = ""
  const maxPages = Math.min(doc.numPages, 25)
  for (let i = 1; i <= maxPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    text +=
      content.items
        .map((item: { str?: string }) => (typeof item.str === "string" ? item.str : ""))
        .join(" ") + "\n"
    page.cleanup()
  }
  await doc.destroy()
  return text.trim()
}

async function extractPdfWithGemini(buffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return ""

  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash"
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "application/pdf",
                  data: buffer.toString("base64"),
                },
              },
              {
                text: "Extract ALL text from this resume PDF exactly as written. Return plain text only — no JSON, no commentary.",
              },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    }
  )

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error("[gemini-pdf] error:", data?.error?.message || res.status)
    return ""
  }

  const parts = data?.candidates?.[0]?.content?.parts || []
  return parts
    .map((p: { text?: string }) => p.text || "")
    .join("\n")
    .trim()
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const methods: Array<{ name: string; fn: () => Promise<string> }> = [
    { name: "pdf-parse", fn: () => extractPdfWithPdfParse(buffer) },
    { name: "pdfjs", fn: () => extractPdfWithPdfJs(buffer) },
    { name: "gemini", fn: () => extractPdfWithGemini(buffer) },
  ]

  for (const { name, fn } of methods) {
    try {
      const text = await fn()
      if (text.length >= 30) {
        console.log(`[resume-extract] PDF via ${name}: ${text.length} chars`)
        return text
      }
      console.log(`[resume-extract] PDF ${name}: only ${text.length} chars`)
    } catch (err) {
      console.error(`[resume-extract] PDF ${name} failed:`, err instanceof Error ? err.message : err)
    }
  }
  return ""
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require("mammoth")
  const result = await mammoth.extractRawText({ buffer })
  return (result.value || "").trim()
}

export async function extractResumeText(
  buffer: Buffer,
  mimeType: string,
  fileName = ""
): Promise<string> {
  const mime = detectMimeType(buffer, mimeType)
  const lower = fileName.toLowerCase()

  try {
    if (mime === "application/pdf" || lower.endsWith(".pdf")) {
      return extractPdfText(buffer)
    }

    if (
      mime === "application/msword" ||
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower.endsWith(".docx") ||
      lower.endsWith(".doc")
    ) {
      const text = await extractDocxText(buffer)
      if (text.length >= 30) {
        console.log(`[resume-extract] DOCX: ${text.length} chars`)
        return text
      }
    }
  } catch (err) {
    console.error("[resume-extract] error:", err)
  }

  return ""
}

/** Optional: save to /tmp on Vercel for debugging (not required for scoring) */
export async function saveResumeTemp(buffer: Buffer, fileName: string): Promise<string> {
  const dir = join(tmpdir(), "hireai-resumes")
  const path = join(dir, `${Date.now()}_${fileName}`)
  await writeFile(path, buffer)
  return path
}

export async function deleteResumeTemp(path: string): Promise<void> {
  await unlink(path).catch(() => {})
}
