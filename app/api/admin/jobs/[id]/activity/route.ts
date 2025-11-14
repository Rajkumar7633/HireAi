import { NextResponse, type NextRequest } from "next/server"

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Prefer admin activity endpoint, fallback to empty list
    const res = await fetch(`${BASE}/api/admin/jobs/${params.id}/activity`, {
      cache: "no-store",
      headers: {
        Authorization: req.headers.get("authorization") || "",
        Cookie: req.headers.get("cookie") || "",
      },
    }).catch(() => null)

    if (res && res.ok) {
      const data = await res.json().catch(() => ([]))
      const items = Array.isArray(data) ? data : (data.items || data.activity || [])
      return NextResponse.json({ items }, { status: 200 })
    }

    return NextResponse.json({ items: [] }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "failed" }, { status: 500 })
  }
}
