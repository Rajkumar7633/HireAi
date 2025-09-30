import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(request)

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ message: "No authentication token found" }, { status: 401 })
    }

    const response = await fetch(`${BACKEND_URL}/api/tests/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store", // Ensure fresh data
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to fetch test" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Error fetching test by ID:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(request)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params
    const body = await request.json()
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ message: "No authentication token found" }, { status: 401 })
    }

    const response = await fetch(`${BACKEND_URL}/api/tests/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to update test" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg, test: data.test }, { status: 200 })
  } catch (error) {
    console.error("Error updating test:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(request)

  if (!session || session.role !== "recruiter") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = params
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ message: "No authentication token found" }, { status: 401 })
    }

    const response = await fetch(`${BACKEND_URL}/api/tests/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ message: errorData.msg || "Failed to delete test" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ message: data.msg }, { status: 200 })
  } catch (error) {
    console.error("Error deleting test:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
