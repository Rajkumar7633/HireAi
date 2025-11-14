import { NextResponse } from "next/server"

function sseResponse(setup: (send: (data: any) => void) => () => void) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (data: any) => {
        const chunk = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(chunk))
      }
      const cleanup = setup(send)
      controller.enqueue(encoder.encode("event: open\n\n"))
      ;(controller as any)._cleanup = cleanup
    },
    cancel(reason) {
      const cleanup = (this as any)._cleanup as (() => void) | undefined
      if (cleanup) cleanup()
    },
  })
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const qs = url.search ? url.search : ""
  return sseResponse((send) => {
    let active = true
    const tick = async () => {
      if (!active) return
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/jobs/stats${qs}`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          send(data)
        }
      } catch (e) {
        // ignore network errors; will retry
      }
    }
    // initial and interval
    tick()
    const id = setInterval(tick, 10000)
    return () => {
      active = false
      clearInterval(id)
    }
  })
}
