import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export async function GET(req: NextRequest) {
  const session = await getSession(req)

  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/analytics/admin-dashboard`, {
      headers: {
        Authorization: `Bearer ${session.userId}`,
      },
      cache: "no-store", // Ensure fresh data
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to fetch admin stats" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
