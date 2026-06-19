import { type NextRequest, NextResponse } from "next/server"
import { getBackendUrl } from "@/lib/backend-url"
export { dynamic } from "@/lib/api-dynamic"


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const refreshToken = request.cookies.get("refresh-token")?.value || body?.refreshToken

    if (!refreshToken) {
      return NextResponse.json({ message: "No refresh token" }, { status: 401 })
    }

    const r = await fetch(`${getBackendUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    })
    const data = await r.json()

    const res = NextResponse.json(data, { status: r.status })

    if (r.ok && data?.accessToken) {
      res.cookies.set("auth-token", data.accessToken, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 20,
      })
    }
    if (r.ok && data?.refreshToken) {
      res.cookies.set("refresh-token", data.refreshToken, {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 14,
      })
    }

    return res
  } catch (error) {
    console.error("Refresh error:", error)
    return NextResponse.json({ message: "Refresh failed" }, { status: 500 })
  }
}
