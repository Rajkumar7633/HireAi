import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get('query') || '').trim()
    const cookieToken = cookies().get('auth-token')?.value
    const authHeader = req.headers.get('authorization') || (cookieToken ? `Bearer ${cookieToken}` : '')

    // Primary: backend moderation lookup
    try {
        const res = await fetch(`${BACKEND}/api/admin/moderation/lookup?query=${encodeURIComponent(q)}`, {
            headers: { Authorization: authHeader },
            cache: 'no-store',
        })
        if (res.ok) {
            const j = await res.json()
            if (j && (j.userId || j.jobId)) return NextResponse.json({ userId: j.userId || null, jobId: j.jobId || null })
        }
    } catch { }

    // Fallback: search users and return first match id
    try {
        const res = await fetch(`${BACKEND}/api/admin/users?q=${encodeURIComponent(q)}&limit=1`, {
            headers: { Authorization: authHeader },
            cache: 'no-store',
        })
        if (res.ok) {
            const data = await res.json()
            const list: any[] = Array.isArray(data) ? data : (data.items || data.users || [])
            const first = Array.isArray(list) && list.length ? list[0] : null
            if (first?.id || first?._id) {
                return NextResponse.json({ userId: first.id || first._id, jobId: null })
            }
        }
    } catch { }

    // Fallback: search jobs (title/slug) and return first match id
    try {
        const res = await fetch(`${BACKEND}/api/admin/jobs?q=${encodeURIComponent(q)}&limit=1`, {
            headers: { Authorization: authHeader },
            cache: 'no-store',
        })
        if (res.ok) {
            const data = await res.json()
            const list: any[] = Array.isArray(data) ? data : (data.items || data.jobs || [])
            const first = Array.isArray(list) && list.length ? list[0] : null
            if (first?.id || first?._id) {
                return NextResponse.json({ userId: null, jobId: first.id || first._id })
            }
        }
    } catch { }

    return NextResponse.json({ userId: null, jobId: null })
}
