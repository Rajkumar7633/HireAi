import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { connectDB } from "@/lib/mongodb"
import User from "@/models/User"

export async function POST(request: NextRequest) {
    try {
        const refreshToken = request.cookies.get("refresh-token")?.value
        if (!refreshToken) {
            return NextResponse.json({ message: "No refresh token" }, { status: 401 })
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any

        // Connect to database and get user
        await connectDB()
        const user = await User.findById(decoded.userId)
        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 401 })
        }

        // Generate new access token
        const accessToken = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET!,
            { expiresIn: "20m" }
        )

        // Generate new refresh token
        const newRefreshToken = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET!,
            { expiresIn: "14d" }
        )

        const res = NextResponse.json({
            accessToken,
            refreshToken: newRefreshToken,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name
            }
        }, { status: 200 })

        // Set new cookies
        res.cookies.set("auth-token", accessToken, {
            httpOnly: true,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 20, // 20 minutes
        })

        res.cookies.set("refresh-token", newRefreshToken, {
            httpOnly: true,
            path: "/",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 14, // 14 days
        })

        return res
    } catch (error) {
        console.error("Refresh error:", error)
        return NextResponse.json({ message: "Refresh failed" }, { status: 500 })
    }
}
