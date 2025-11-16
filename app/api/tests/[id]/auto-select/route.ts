import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const session = await getSession(request)

    if (!session || session.role !== "recruiter") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    try {
        const { id } = params
        const body = await request.json().catch(() => ({}))
        const token = request.cookies.get("auth-token")?.value

        if (!token) {
            return NextResponse.json({ message: "No authentication token found" }, { status: 401 })
        }

        const response = await fetch(`${BACKEND_URL}/api/tests/${id}/auto-select`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
            return NextResponse.json(
                { message: data.msg || data.message || "Failed to auto-select candidates" },
                { status: response.status },
            )
        }

        return NextResponse.json(data, { status: 200 })
    } catch (error: any) {
        console.error("Error calling auto-select:", error)
        return NextResponse.json(
            { message: error?.message || "Internal server error" },
            { status: 500 },
        )
    }
}
