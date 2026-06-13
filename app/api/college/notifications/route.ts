import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || (session.role !== "college" && session.role !== "college_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value

  if (token) {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5_000)
    try {
      const res = await fetch(`${BACKEND_URL}/api/college/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        cache: "no-store",
      })
      clearTimeout(tid)
      if (res.ok) return NextResponse.json(await res.json())
    } catch {
      clearTimeout(tid)
    }
  }

  return NextResponse.json({ notifications: [], unreadCount: 0 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req)
  if (!session || (session.role !== "college" && session.role !== "college_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value
  let body: any = {}
  try { body = await req.json() } catch { /**/ }

  if (token) {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5_000)
    try {
      const res = await fetch(`${BACKEND_URL}/api/college/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(tid)
      if (res.ok) return NextResponse.json(await res.json())
    } catch {
      clearTimeout(tid)
    }
  }

  return NextResponse.json({ success: true })
}
