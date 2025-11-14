import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"

export async function GET(_req: NextRequest) {
  const token = _req.cookies.get("auth-token")?.value
  if (!token) {
    return new NextResponse("Unauthorized", { status: 401 })
  }
  const daysParam = _req.nextUrl.searchParams.get("days")
  const days = daysParam && !Number.isNaN(Number(daysParam)) ? String(Math.min(Math.max(Number(daysParam), 1), 180)) : "14"
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const send = (event: string, data: any) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${event}\n`))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const tick = async () => {
        try {
          const [overviewRes, signupsRes, subsRes] = await Promise.all([
            fetch(`${BACKEND_URL}/api/admin/stats/overview`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
            fetch(`${BACKEND_URL}/api/admin/stats/timeseries?days=${days}&metric=signups`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
            fetch(`${BACKEND_URL}/api/admin/stats/timeseries?days=${days}&metric=subs`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          ])
          const [overview, signups, subs] = await Promise.all([
            overviewRes.json().catch(() => ({})),
            signupsRes.json().catch(() => ({})),
            subsRes.json().catch(() => ({})),
          ])
          send("stats", { overview, signups, subs })
        } catch (e) {
          send("error", { message: (e as any)?.message || "stream error" })
        }
      }

      // Initial emit then faster interval for a more realtime feel
      tick()
      const id = setInterval(tick, 5000)

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(id)
        try { controller.close() } catch { }
      }

      // If the client disconnects, close
      // @ts-ignore
      _req.signal?.addEventListener("abort", close)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
