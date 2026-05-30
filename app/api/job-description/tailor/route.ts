import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { jobDescription, title, industry, experienceLevel } = await req.json()

    if (!jobDescription) {
      return NextResponse.json({ message: "Job description is required" }, { status: 400 })
    }

    // Call backend service for AI analysis
    const backendUrl = process.env.BACKEND_URL || "http://localhost:5000"
    const response = await fetch(`${backendUrl}/api/job-description/tailor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobDescription, title, industry, experienceLevel }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ message: data.msg || "Analysis failed" }, { status: response.status })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Job description tailoring error:", error)
    return NextResponse.json({ message: "Server error" }, { status: 500 })
  }
}
