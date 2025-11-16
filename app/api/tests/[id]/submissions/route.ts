import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const session = await getSession(request)

    if (!session || session.role !== "recruiter") {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = request.cookies.get("auth-token")?.value
    if (!token) {
        return NextResponse.json({ message: "No authentication token found" }, { status: 401 })
    }

    try {
        const { id } = params

        const response = await fetch(`${BACKEND_URL}/api/tests/${id}/submissions`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        })

        if (!response.ok) {
            const errorData = await response.json()
            return NextResponse.json({ message: errorData.msg || "Failed to fetch submissions" }, { status: response.status })
        }

        const data = await response.json()
        return NextResponse.json(data, { status: 200 })
    } catch (error) {
        console.error("Error fetching test submissions:", error)
        return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
}
