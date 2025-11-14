import { NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const r = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    const data = await r.json()
    return NextResponse.json(data, { status: r.status })
  } catch (err) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
