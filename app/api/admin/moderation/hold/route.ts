import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND = process.env.BACKEND_URL || "http://localhost:5001"

export async function POST(req: NextRequest) {
  try {
    const cookieToken = cookies().get('auth-token')?.value
    const authHeader = req.headers.get('authorization') || (cookieToken ? `Bearer ${cookieToken}` : '')
    const body = await req.json().catch(()=>({}))
    const res = await fetch(`${BACKEND}/api/admin/moderation/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(body),
    })
    if (res.ok) return NextResponse.json(await res.json())
  } catch {}
  return NextResponse.json({ ok: true })
}
