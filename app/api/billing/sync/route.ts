import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ message: "No auth token" }, { status: 401 })

    const q = req.nextUrl?.search || ''
    const res = await fetch(`${BACKEND_URL}/api/billing/sync${q}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })

    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ message: "Sync failed" }, { status: 500 })
  }
}
