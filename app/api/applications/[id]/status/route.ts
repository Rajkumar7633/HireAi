import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params
    const { status } = await req.json()

    const response = await fetch(`${BACKEND_URL}/api/applications/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.userId}`,
      },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { message: errorData.msg || "Failed to update application status" },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg, application: data.application }, { status: 200 })
  } catch (error) {
    console.error("Error updating application status:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
