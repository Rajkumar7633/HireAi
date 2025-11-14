import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND = process.env.BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || ''
    const id = searchParams.get('id') || ''
    try {
        const cookieToken = cookies().get('auth-token')?.value
        const authHeader = req.headers.get('authorization') || (cookieToken ? `Bearer ${cookieToken}` : '')
        const qs = new URLSearchParams()
        if (type) qs.set('type', type)
        if (id) qs.set('id', id)
        const res = await fetch(`${BACKEND}/api/admin/moderation/history?${qs.toString()}`, {
            headers: { Authorization: authHeader },
            cache: 'no-store',
        })
        if (res.ok) return NextResponse.json(await res.json())
    } catch { }
    return NextResponse.json({ actions: [] })
}
