import { type NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import Notification from "@/models/Notification"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }

  await connectDB()

  const encoder = new TextEncoder()
  let lastCheck = new Date()
  let timer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          // stream closed
        }
      }

      // Send initial state
      try {
        const initial = await Notification.find({ userId: session.userId, read: false })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
        send("initial", { notifications: initial, unreadCount: initial.length })
      } catch {
        send("error", { message: "Failed to load notifications" })
      }

      // Poll DB every 10 s for new notifications
      timer = setInterval(async () => {
        try {
          const since = lastCheck
          lastCheck = new Date()
          const fresh = await Notification.find({
            userId: session.userId,
            createdAt: { $gt: since },
          })
            .sort({ createdAt: -1 })
            .lean()

          if (fresh.length > 0) {
            send("new", { notifications: fresh, count: fresh.length })
          } else {
            // heartbeat to keep connection alive
            controller.enqueue(encoder.encode(": ping\n\n"))
          }
        } catch {
          if (timer) clearInterval(timer)
          controller.close()
        }
      }, 10000)

      request.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer)
        try { controller.close() } catch { /* already closed */ }
      })
    },
    cancel() {
      if (timer) clearInterval(timer)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
