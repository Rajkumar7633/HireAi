import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ message: "No auth token" }, { status: 401 })

    const body = await req.json()
    const res = await fetch(`${BACKEND_URL}/api/billing/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ message: "Checkout failed" }, { status: 500 })
  }
}
