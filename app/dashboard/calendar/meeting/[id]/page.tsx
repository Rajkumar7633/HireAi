"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/client-auth"
import {
  ArrowLeft, Clock, Loader2, MapPin, Radio, Video, LogOut,
} from "lucide-react"

interface MeetingDetail {
  _id: string
  title: string
  description?: string
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

export default function StudentMeetingPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const meetingId = params?.id as string
  const [loading, setLoading] = useState(true)
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [tracking, setTracking] = useState(false)
  const [joining, setJoining] = useState(false)
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const joinedRef = useRef(false)

  const postAttendance = async (action: "join" | "leave" | "heartbeat") => {
    try {
      const res = await authFetch(`/api/job-seeker/meetings/${meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (res.ok) return await res.json()
    } catch {
      // silent for heartbeat
    }
    return null
  }

  const enterVideoRoom = async () => {
    setJoining(true)
    try {
      await postAttendance("join")
      joinedRef.current = true
      setTracking(true)

      const res = await authFetch(`/api/job-seeker/meetings/${meetingId}/join`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not join room")

      toast({ title: "Joining HireAI room", description: "Attendance recorded. Opening video…" })
      router.push(data.joinUrl)
    } catch (e: unknown) {
      toast({
        title: "Could not join",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setJoining(false)
    }
  }

  const stopTracking = async () => {
    await postAttendance("leave")
    joinedRef.current = false
    setTracking(false)
    toast({ title: "Left meeting", description: "Your leave time has been recorded." })
    const res = await authFetch(`/api/job-seeker/meetings/${meetingId}`)
    if (res.ok) {
      const d = await res.json()
      setMeeting(d.meeting)
    }
  }

  useEffect(() => {
    authFetch(`/api/job-seeker/meetings/${meetingId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.meeting) setMeeting(d.meeting)
        else {
          toast({ title: "Meeting not found", variant: "destructive" })
          router.push("/dashboard/calendar")
        }
      })
      .finally(() => setLoading(false))
  }, [meetingId, router, toast])

  useEffect(() => {
    if (!tracking) return
    heartbeatRef.current = setInterval(() => postAttendance("heartbeat"), 30000)
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [tracking, meetingId])

  useEffect(() => {
    const onLeave = () => {
      if (joinedRef.current) postAttendance("leave")
    }
    window.addEventListener("beforeunload", onLeave)
    return () => {
      window.removeEventListener("beforeunload", onLeave)
      if (joinedRef.current) postAttendance("leave")
    }
  }, [meetingId])

  if (loading || !meeting) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  const isLive = meeting.status === "live"
  const isPast = meeting.status === "completed"

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/calendar"><ArrowLeft className="h-4 w-4 mr-1" /> Back to calendar</Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>{meeting.title}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(meeting.startTime), "EEEE, dd MMM yyyy · HH:mm")} – {format(new Date(meeting.endTime), "HH:mm")}
              </CardDescription>
            </div>
            <Badge variant="outline" className={isLive ? "bg-green-100 text-green-700" : ""}>
              {isLive && <Radio className="h-3 w-3 mr-1" />}{meeting.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {meeting.description && <p className="text-sm text-muted-foreground">{meeting.description}</p>}
          {meeting.venue && (
            <p className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" />{meeting.venue}</p>
          )}

          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-purple-900 flex items-center gap-2">
              <Video className="h-4 w-4" /> HireAI Video Room
            </p>
            <p className="text-xs text-purple-800">
              Webinar mode — up to 500 students can watch the host live, use chat, and raise questions.
              Your mic and camera stay off by default so the room stays stable.
            </p>
          </div>

          {meeting.myJoinTime && (
            <div className="text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">
              <p>Your join: {format(new Date(meeting.myJoinTime), "HH:mm:ss")}</p>
              {meeting.myLeaveTime && <p>Your leave: {format(new Date(meeting.myLeaveTime), "HH:mm:ss")}</p>}
              <p>Status: {meeting.myStatus}</p>
            </div>
          )}

          {!isPast && (
            <div className="flex flex-wrap gap-2">
              {!tracking ? (
                <Button
                  className="bg-purple-600 hover:bg-purple-700 gap-2"
                  onClick={enterVideoRoom}
                  disabled={joining}
                >
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                  {isLive ? "Join live room" : "Enter HireAI room"}
                </Button>
              ) : (
                <Button variant="outline" className="gap-2" onClick={stopTracking}>
                  <LogOut className="h-4 w-4" /> Leave meeting
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
