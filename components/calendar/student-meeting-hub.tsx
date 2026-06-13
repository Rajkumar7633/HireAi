"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/client-auth"
import {
  CalendarDays, Clock, Loader2, MapPin, Video, Radio, CheckCircle2,
  ExternalLink, GraduationCap,
} from "lucide-react"

interface Meeting {
  _id: string
  title: string
  description?: string
  meetingType: string
  startTime: string
  endTime: string
  roomId?: string
  venue?: string
  status: string
  myStatus: string
  myJoinTime?: string
  myLeaveTime?: string
  myDurationSeconds: number
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    live: "bg-green-100 text-green-700 border-green-200",
    scheduled: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-gray-100 text-gray-600",
    joined: "bg-emerald-100 text-emerald-700",
    left: "bg-slate-100 text-slate-600",
    invited: "bg-amber-100 text-amber-700",
  }
  return map[status] || "bg-gray-100 text-gray-600"
}

export function StudentMeetingHub() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [meetings, setMeetings] = useState<Meeting[]>([])

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await authFetch("/api/job-seeker/meetings")
      const data = await res.json()
      setMeetings(data.meetings || [])
    } catch {
      toast({ title: "Could not load meetings", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchMeetings()
    const iv = setInterval(fetchMeetings, 60000)
    return () => clearInterval(iv)
  }, [fetchMeetings])

  if (loading) {
    return (
      <div className="flex justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  const live = meetings.filter((m) => m.status === "live")
  const upcoming = meetings.filter((m) => m.status === "scheduled")
  const past = meetings.filter((m) => m.status === "completed")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-purple-600" />
          College Meetings
        </h1>
        <p className="text-muted-foreground mt-1">
          Sessions scheduled by your placement cell — join in HireAI video rooms with attendance tracking
        </p>
      </div>

      {meetings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No college meetings scheduled yet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {live.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-green-700 flex items-center gap-2">
                <Radio className="h-4 w-4" /> Live now ({live.length})
              </h2>
              {live.map((m) => <MeetingCard key={m._id} meeting={m} highlight />)}
            </section>
          )}
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-blue-700">Upcoming ({upcoming.length})</h2>
              {upcoming.map((m) => <MeetingCard key={m._id} meeting={m} />)}
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Past ({past.length})</h2>
              {past.map((m) => <MeetingCard key={m._id} meeting={m} past />)}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function MeetingCard({
  meeting: m,
  highlight,
  past,
}: {
  meeting: Meeting
  highlight?: boolean
  past?: boolean
}) {
  return (
    <Card className={highlight ? "border-green-300 bg-green-50/30" : ""}>
      <CardContent className="p-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${highlight ? "bg-green-100" : "bg-purple-100"}`}>
            <Video className="h-5 w-5 text-purple-600" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{m.title}</p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(m.startTime), "dd MMM yyyy, HH:mm")} – {format(new Date(m.endTime), "HH:mm")}
              </span>
              {m.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{m.venue}</span>}
            </div>
            {m.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{m.description}</p>}
            {past && m.myJoinTime && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                You joined at {format(new Date(m.myJoinTime), "HH:mm")}
                {m.myLeaveTime && ` · left ${format(new Date(m.myLeaveTime), "HH:mm")}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={statusClass(m.status)}>{m.status}</Badge>
          {!past && (
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700" asChild>
              <Link href={`/dashboard/calendar/meeting/${m._id}`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                {m.status === "live" ? "Join now" : "Open session"}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
