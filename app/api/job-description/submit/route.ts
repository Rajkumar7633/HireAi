import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export async function POST(req: NextRequest) {
  const session = await getSession(req)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const response = await fetch(`${BACKEND_URL}/api/job-description`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.userId}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { message: errorData.msg || "Failed to create job description" },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg, jobDescription: data.jobDescription }, { status: 201 })
  } catch (error) {
    console.error("Error creating job description:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
