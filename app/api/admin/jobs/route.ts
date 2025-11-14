import { NextResponse, type NextRequest } from "next/server"

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const qs = url.search ? url.search : ""
    const res = await fetch(`${BASE}/api/admin/jobs${qs}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("authorization") || "",
        Cookie: req.headers.get("cookie") || "",
      },
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const res = await fetch(`${BASE}/api/admin/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.get("authorization") || "",
        Cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || "failed" }, { status: 500 })
  }
}
