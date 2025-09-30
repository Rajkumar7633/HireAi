import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { serialize } from "cookie"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export async function DELETE(req: NextRequest) {
  const session = await getSession(req)

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/user/delete`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.userId}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to delete account" }, { status: response.status })
    }

    // Clear the JWT token cookie on successful deletion
    const cookie = serialize("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 0, // Expire immediately
      path: "/",
    })

    const data = await response.json()
    return NextResponse.json({ message: data.msg }, { status: 200, headers: { "Set-Cookie": cookie } })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
