import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export async function PUT(req: NextRequest) {
  const session = await getSession(req)

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const response = await fetch(`${BACKEND_URL}/api/user/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.userId}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to update password" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg }, { status: 200 })
  } catch (error) {
    console.error("Error updating password:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
