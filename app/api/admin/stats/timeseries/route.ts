import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const token = req.cookies.get("auth-token")?.value
  if (!session || session.role !== "admin" || !token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  try {
    const qs = req.nextUrl.search ? req.nextUrl.search : ""
    const res = await fetch(`${BACKEND_URL}/api/admin/stats/timeseries${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ message: data.msg || "Failed to fetch timeseries" }, { status: res.status })
    return NextResponse.json(data, { status: 200 })
  } catch (e) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
