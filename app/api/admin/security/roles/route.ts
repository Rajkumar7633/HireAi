import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND = process.env.BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
  try {
    const cookieToken = cookies().get('auth-token')?.value
    const authHeader = req.headers.get('authorization') || (cookieToken ? `Bearer ${cookieToken}` : '')
    const res = await fetch(`${BACKEND}/api/admin/security/roles`, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    })
    if (res.ok) return NextResponse.json(await res.json())
  } catch { }
  return NextResponse.json({
    currentRole: "admin",
    roles: [
      { name: "admin", permissions: ["users:manage", "jobs:manage", "stats:view", "security:manage"] },
      { name: "viewer", permissions: ["stats:view"] },
    ],
  })
}
