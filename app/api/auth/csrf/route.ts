import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export async function GET(request: NextRequest) {
    try {
        // Generate a random CSRF token
        const token = crypto.randomBytes(32).toString("hex")

        const res = NextResponse.json({ token })
        // Store token in a non-HttpOnly cookie so double-submit comparison is possible
        res.cookies.set("csrf-token", token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60, // 1 hour
        })

        return res
    } catch (error) {
        console.error("CSRF issue error:", error)
        return NextResponse.json({ message: "Failed to issue CSRF token" }, { status: 500 })
    }
}
