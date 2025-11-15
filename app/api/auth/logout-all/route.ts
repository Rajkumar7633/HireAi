import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function POST(request: NextRequest) {
    try {
        const csrfCookie = request.cookies.get("csrf-token")?.value
        const csrfHeader = request.headers.get("x-csrf-token") || request.headers.get("X-CSRF-Token")

        if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
            return NextResponse.json({ message: "CSRF token mismatch" }, { status: 403 })
        }

        const authToken = request.cookies.get("auth-token")?.value

        const r = await fetch(`${BACKEND_URL}/api/auth/logout-all`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            cache: "no-store",
        })

        let data: any = null
        try {
            data = await r.json()
        } catch {
            const text = await r.text().catch(() => "")
            data = { message: text || "Logout-all response not JSON" }
        }

        const res = NextResponse.json(data, { status: r.status })
        // Also clear local cookies on success
        if (r.ok) {
            res.cookies.set("auth-token", "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 0,
                path: "/",
            })
            res.cookies.set("refresh-token", "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 0,
                path: "/",
            })
        }
        return res
    } catch (error) {
        console.error("Logout-all error:", error)
        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}
