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

    const response = NextResponse.json(data, { status: r.status })

    // If login succeeded, set the JWT as an HttpOnly cookie so
    // getSession() (which reads "auth-token" cookie) works for all API routes
    if (r.ok) {
      const token: string | undefined =
        data.token || data.accessToken || data.jwt || data.access_token

      if (token) {
        // 7-day expiry, HttpOnly, SameSite=Lax so it's sent on same-origin requests
        response.cookies.set("auth-token", token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
        })
      }
    }

    return response
  } catch (err) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
