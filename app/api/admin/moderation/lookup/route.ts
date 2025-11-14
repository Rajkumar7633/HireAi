import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND = process.env.BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('query') || ''
    try {
        const cookieToken = cookies().get('auth-token')?.value
        const authHeader = req.headers.get('authorization') || (cookieToken ? `Bearer ${cookieToken}` : '')
        const res = await fetch(`${BACKEND}/api/admin/moderation/lookup?query=${encodeURIComponent(q)}`, {
            headers: { Authorization: authHeader },
            cache: 'no-store',
        })
        if (res.ok) return NextResponse.json(await res.json())
    } catch { }
    return NextResponse.json({ userId: null, jobId: null })
}
