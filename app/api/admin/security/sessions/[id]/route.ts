import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND = process.env.BACKEND_URL || "http://localhost:5001"

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  try {
    const cookieToken = cookies().get('auth-token')?.value
    const authHeader = req.headers.get('authorization') || (cookieToken ? `Bearer ${cookieToken}` : '')
    const res = await fetch(`${BACKEND}/api/admin/security/sessions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    })
    if (res.ok) return NextResponse.json({ ok: true })
  } catch {}
  return NextResponse.json({ ok: true })
}
