import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || (session.role !== "college" && session.role !== "college_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = req.cookies.get("auth-token")?.value

  if (token) {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 5_000)
    try {
      const res = await fetch(`${BACKEND_URL}/api/college/notifications/${params.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
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
