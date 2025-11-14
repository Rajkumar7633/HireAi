import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  const token = req.cookies.get("auth-token")?.value
  if (!session || session.role !== "admin" || !token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return NextResponse.json({ message: data.msg || "Failed to fetch user" }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data, { status: 200 })
  } catch (e) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  const token = req.cookies.get("auth-token")?.value
  if (!session || session.role !== "admin" || !token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ message: data.msg || "Failed to update user" }, { status: res.status })
    return NextResponse.json(data, { status: 200 })
  } catch (e) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  const token = req.cookies.get("auth-token")?.value
  if (!session || session.role !== "admin" || !token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/users/${params.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ message: data.msg || "Failed to delete user" }, { status: res.status })
    return NextResponse.json(data, { status: 200 })
  } catch (e) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
