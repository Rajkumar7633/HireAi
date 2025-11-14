import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND = process.env.BACKEND_URL || "http://localhost:5001"

export async function GET(req: NextRequest) {
  const started = Date.now()
  try {
    const cookieToken = cookies().get('auth-token')?.value
    const authHeader = req.headers.get('authorization') || (cookieToken ? `Bearer ${cookieToken}` : '')
    const healthPaths = ["/health", "/api/health", "/healthz", "/actuator/health", "/"]
    let lastStatus: number | undefined
    let lastError: string | undefined
    for (const p of healthPaths) {
      const url = `${BACKEND}${p}`
      try {
        // 2s timeout
        const controller = new AbortController()
        const t = setTimeout(() => controller.abort(), 2000)
        let res = await fetch(url, { method: 'HEAD', headers: { Authorization: authHeader }, cache: 'no-store', signal: controller.signal }).catch(() => null as any)
        clearTimeout(t)
        if (!res || !res.ok) {
          // fallback to GET
          const c2 = new AbortController()
          const t2 = setTimeout(() => c2.abort(), 3000)
          res = await fetch(url, { method: 'GET', headers: { Authorization: authHeader }, cache: 'no-store', signal: c2.signal }).catch(() => null as any)
          clearTimeout(t2)
        }
        if (res && res.ok) {
          const ms = Date.now() - started
          return NextResponse.json({ ok: true, upstream: BACKEND, path: p, status: res.status, latencyMs: ms })
        }
        if (res) lastStatus = res.status
      } catch (e: any) {
        lastError = e?.name === 'AbortError' ? 'timeout' : (e?.message || 'fetch failed')
      }
    }
    const ms = Date.now() - started
    return NextResponse.json({ ok: false, upstream: BACKEND, status: lastStatus, error: lastError || 'unreachable', latencyMs: ms }, { status: 502 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'proxy failed', upstream: BACKEND }, { status: 500 })
  }
}
