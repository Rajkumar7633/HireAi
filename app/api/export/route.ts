import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || (session.role !== "recruiter" && session.role !== "admin")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { type, format, ...data } = body

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = "/api/export"

    if (type === "applications") {
      endpoint += "/applications"
    } else if (type === "students") {
      endpoint += "/students"
    } else if (type === "analytics") {
      endpoint += "/analytics"
    }

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, ...data }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json({ message: error.msg || "Export failed" }, { status: response.status })
    }

    if (format === "csv") {
      const csvText = await response.text()
      return new NextResponse(csvText, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=${type}-export.csv`
        }
      })
    } else if (format === "pdf") {
      const pdfBuffer = await response.arrayBuffer()
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=${type}-export.pdf`
        }
      })
    }

    return NextResponse.json({ message: "Invalid format" }, { status: 400 })
  } catch (error) {
    console.error("Export API error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
