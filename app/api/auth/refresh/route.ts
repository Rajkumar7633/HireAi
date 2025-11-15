import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function POST(request: NextRequest) {
    try {
        const refreshToken = request.cookies.get("refresh-token")?.value
        if (!refreshToken) {
            return NextResponse.json({ message: "No refresh token" }, { status: 401 })
        }

        const r = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
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
    } catch (error) {
        console.error("Refresh error:", error)
        return NextResponse.json({ message: "Refresh failed" }, { status: 500 })
    }
}
