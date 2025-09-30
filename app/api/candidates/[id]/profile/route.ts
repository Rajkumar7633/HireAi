import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const response = await fetch(`${BACKEND_URL}/api/candidates/${id}/profile`, {
      headers: {
        Authorization: `Bearer ${session.userId}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json(
        { message: errorData.msg || "Failed to fetch candidate profile" },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching candidate profile:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
