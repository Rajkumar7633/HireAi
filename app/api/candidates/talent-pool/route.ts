import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()

    const response = await fetch(`${BACKEND_URL}/api/candidates/talent-pool?${queryString}`, {
      headers: {
        Authorization: `Bearer ${session.userId}`,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch talent pool")
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching talent pool:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
