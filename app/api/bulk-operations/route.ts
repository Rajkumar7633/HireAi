import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
export { dynamic } from "@/lib/api-dynamic"


export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, ...data } = body

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    let endpoint = "/api/bulk"

    switch (action) {
      case "import-students":
        endpoint += "/import-students"
        break
      case "eligibility-filter":
        endpoint += "/eligibility-filter"
        break
      case "bulk-invite":
        endpoint += "/bulk-invite"
        break
      case "bulk-update":
        endpoint += "/bulk-update"
        break
      case "bulk-delete":
        endpoint += "/bulk-delete"
        break
      default:
        return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    }

    // For file upload, we need to handle differently
    if (action === "import-students" && data.formData) {
      const formData = data.formData
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: "POST",
        body: formData,
      })

      const responseData = await response.json()
      if (!response.ok) {
        return NextResponse.json({ message: responseData.msg || "Request failed" }, { status: response.status })
      }
      return NextResponse.json(responseData, { status: 200 })
    }

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()
    if (!response.ok) {
      return NextResponse.json({ message: responseData.msg || "Request failed" }, { status: response.status })
    }

    return NextResponse.json(responseData, { status: 200 })
  } catch (error) {
    console.error("Bulk operations API error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const exportStudents = searchParams.get("export-students")

    if (exportStudents) {
      const collegeId = searchParams.get("collegeId")
      const filters = searchParams.get("filters")

      const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
      const params = new URLSearchParams()
      if (collegeId) params.append("collegeId", collegeId)
      if (filters) params.append("filters", filters)

      const response = await fetch(`${backendUrl}/api/bulk/export-students?${params}`)

      if (!response.ok) {
        const error = await response.json()
        return NextResponse.json({ message: error.msg || "Export failed" }, { status: response.status })
      }

      const csvText = await response.text()
      return new NextResponse(csvText, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=students-export.csv"
        }
      })
    }

    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Get bulk operations error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
