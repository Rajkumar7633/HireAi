import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { applicationId } = await req.json()

    if (!applicationId) {
      return NextResponse.json({ message: "Application ID is required" }, { status: 400 })
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/benchmark/candidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Benchmark generation failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Candidate benchmark error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
