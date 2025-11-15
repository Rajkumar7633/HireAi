import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const r = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })
    const data = await r.json()

    const res = NextResponse.json(data, { status: r.status })
    if (r.ok && (data as any)?.accessToken) {
      res.cookies.set("auth-token", (data as any).accessToken, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 20, // 20 minutes
      })
    }
    if (r.ok && (data as any)?.refreshToken) {
      res.cookies.set("refresh-token", (data as any).refreshToken, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 14, // 14 days
      })
    }
    return res
  } catch (e) {
    return NextResponse.json({ message: "OTP verify failed" }, { status: 500 })
  }
}
