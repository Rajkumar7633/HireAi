import { NextRequest } from "next/server"
import { cookies } from "next/headers"

const BACKEND = process.env.BACKEND_URL || "http://localhost:5001"

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || '24h'

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let timer: any
      let closed = false
      const send = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {}
      }
      const poll = async () => {
        if (closed) return
        try {
          const cookieToken = cookies().get('auth-token')?.value
          const authHeader = req.headers.get('authorization') || (cookieToken ? `Bearer ${cookieToken}` : '')
          const qs = new URLSearchParams({ range, page: '1', limit: '20' })
          const res = await fetch(`${BACKEND}/api/admin/security/events?${qs.toString()}`, {
            headers: { Authorization: authHeader },
            cache: 'no-store',
          }).catch(()=>null as any)
          if (res && res.ok) {
            const json = await res.json().catch(()=>({ events: [] }))
            send(json)
          }
        } catch {}
      }
      // immediate
      poll()
      timer = setInterval(poll, 8000)
      const close = () => {
        if (timer) clearInterval(timer)
        closed = true
        try { controller.close() } catch {}
      }
      ;(req as any).signal?.addEventListener?.('abort', close)
    },
    cancel() {}
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
