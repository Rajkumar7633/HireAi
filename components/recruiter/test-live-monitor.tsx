"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Shield, Activity, AlertTriangle } from "lucide-react"
import { getTestSocket } from "@/lib/test-socket-client"

type LiveEvent = {
  type: string
  message?: string
  candidateId?: string
  candidateName?: string
  score?: number
  at?: string
}

export function TestLiveMonitor({ testId }: { testId: string }) {
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const socket = getTestSocket()
    const join = () => {
      socket.emit("test:monitor-join", { testId, role: "recruiter" })
      setConnected(true)
    }

    const onLive = (payload: LiveEvent) => {
      setEvents(prev => [{ ...payload, at: payload.at || new Date().toISOString() }, ...prev].slice(0, 50))
    }

    if (socket.connected) join()
    else socket.on("connect", join)
    socket.on("test:live-update", onLive)
    socket.on("test:proctor-event", onLive)
    socket.on("test:submission", onLive)

    return () => {
      socket.off("connect", join)
      socket.off("test:live-update", onLive)
      socket.off("test:proctor-event", onLive)
      socket.off("test:submission", onLive)
      socket.emit("test:monitor-leave", { testId })
    }
  }, [testId])

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Shield className="h-4 w-4 text-purple-600" />
          Live Test Monitor
        </div>
        <Badge variant={connected ? "default" : "secondary"} className="text-[10px]">
          {connected ? "Live" : "Connecting…"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Real-time proctoring events and submissions appear here while candidates take the test.
      </p>
      <div className="max-h-48 overflow-y-auto space-y-1.5">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No live activity yet</p>
        ) : (
          events.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-xs border rounded-lg p-2 bg-muted/30">
              {e.type === "submission" ? (
                <Activity className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-medium">{e.type === "submission" ? `Submitted — ${e.score ?? "?"}%` : e.message || e.type}</p>
                {e.candidateName && <p className="text-muted-foreground">{e.candidateName}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
