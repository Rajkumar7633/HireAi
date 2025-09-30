import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await req.json() // Should contain feedback, newStatus
    const response = await fetch(`${BACKEND_URL}/api/applications/${id}/interview-feedback`, {
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
        { message: errorData.msg || "Failed to submit interview feedback" },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg, application: data.application }, { status: 200 })
  } catch (error) {
    console.error("Error submitting interview feedback:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
