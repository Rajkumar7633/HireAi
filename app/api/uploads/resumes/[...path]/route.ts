import { NextRequest, NextResponse } from "next/server"
import { existsSync, createReadStream } from "fs"
import { join, normalize } from "path"

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    const segments = params.path || []
    // Prevent path traversal
    const safePath = normalize(segments.join("/"))
    if (safePath.includes("..")) {
      return NextResponse.json({ message: "Invalid path" }, { status: 400 })
    }

    const filePath = join(process.cwd(), "uploads", "resumes", safePath)
    if (!existsSync(filePath)) {
      return NextResponse.json({ message: "File not found" }, { status: 404 })
    }

    const stream = createReadStream(filePath)
    const ext = safePath.split(".").pop()?.toLowerCase()
    const contentType =
      ext === "pdf"
        ? "application/pdf"
        : ext === "doc"
        ? "application/msword"
        : ext === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/octet-stream"

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (e: any) {
    console.error("[uploads/resumes] error:", e)
    return NextResponse.json({ message: "Failed to serve file" }, { status: 500 })
  }
}
