import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"

export async function GET(req: NextRequest) {
  const session = await getSession(req)

  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${session.userId}`,
      },
      cache: "no-store", // Ensure fresh data
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to fetch users" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ users: data }, { status: 200 })
  } catch (error) {
    console.error("Error fetching users (admin):", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req)

  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId, ...body } = await req.json() // Expect userId in body for which user to update
    if (!userId) {
      return NextResponse.json({ message: "User ID is required for update" }, { status: 400 })
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.userId}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to update user" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg, user: data.user }, { status: 200 })
  } catch (error) {
    console.error("Error updating user (admin):", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req)

  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId } = await req.json() // Expect userId in body for which user to delete
    if (!userId) {
      return NextResponse.json({ message: "User ID is required for deletion" }, { status: 400 })
    }

    const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.userId}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to delete user" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg }, { status: 200 })
  } catch (error) {
    console.error("Error deleting user (admin):", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
