"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InterviewPipelineDashboard } from "@/components/interview-pipeline-dashboard"
import { InterviewNotificationSystem } from "@/components/interview-notification-system"
import { useToast } from "@/hooks/use-toast"
import {
  Video,
  CalendarIcon,
  Clock,
  Plus,
  Search,
  Play,
  MessageCircle,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Copy,
  ExternalLink,
  Brain,
  Users,
  Radio,
  LayoutGrid,
  List,
  Link2,
  CalendarClock,
} from "lucide-react"
import { format, formatDistanceToNow, isToday, isTomorrow, startOfDay } from "date-fns"

type InterviewStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "missed"
  | "expired"

interface VideoInterview {
  id: string
  candidateId: string
  candidateName: string
  candidateEmail: string
  position: string
  jobId?: string
  scheduledDate: string
  duration: number
  status: InterviewStatus
  meetingLink?: string
  recordingUrl?: string
  notes?: string
  rating?: number
  avatar?: string
  roomId?: string
  startedAt?: string
  endedAt?: string
  hostJoinedAt?: string
  candidateJoinedAt?: string
  feedback?: string
  applicationId?: string
}

type StatusFilter = "all" | InterviewStatus
type SortKey = "date" | "name" | "status"
type Provider = "in_app" | "external"

function computeStatus(i: VideoInterview): InterviewStatus {
  const now = Date.now()
  const start = new Date(i.scheduledDate).getTime()
  const durationMs = (i.duration || 60) * 60 * 1000
  const graceMs = 15 * 60 * 1000
  const endWindow = start + durationMs + graceMs
  const started = !!i.startedAt || !!i.hostJoinedAt || !!i.candidateJoinedAt
  const ended = !!i.endedAt
  if (i.status === "cancelled") return "cancelled"
  if (ended) return "completed"
  if (started && now < endWindow) return "in-progress"
  if (now < start && !started) return "scheduled"
  if (now >= endWindow && !started) return "missed"
  if (now >= endWindow && started && !ended) return "expired"
  return "scheduled"
}

const STATUS_STYLES: Record<string, { badge: string; icon: React.ReactNode }> = {
  scheduled: { badge: "bg-blue-100 text-blue-800 border-blue-200", icon: <CalendarIcon className="h-3.5 w-3.5" /> },
  "in-progress": { badge: "bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse", icon: <Radio className="h-3.5 w-3.5" /> },
  completed: { badge: "bg-purple-100 text-purple-800 border-purple-200", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  cancelled: { badge: "bg-slate-100 text-slate-600 border-slate-200", icon: <XCircle className="h-3.5 w-3.5" /> },
  missed: { badge: "bg-red-100 text-red-800 border-red-200", icon: <AlertCircle className="h-3.5 w-3.5" /> },
  expired: { badge: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock className="h-3.5 w-3.5" /> },
}

const PAST_STATUSES: InterviewStatus[] = ["completed", "missed", "cancelled", "expired"]

const DURATION_PRESETS = [30, 45, 60, 90, 120]

function formatTimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildDatetimeIso(date: Date, timeHHmm: string): Date | null {
  const [hh, mm] = timeHHmm.split(":").map((v) => parseInt(v || "0", 10))
  const when = new Date(date)
  when.setHours(hh || 0, mm || 0, 0, 0)
  return Number.isNaN(when.getTime()) ? null : when
}

export default function VideoInterviewsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [interviews, setInterviews] = useState<VideoInterview[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [sortBy, setSortBy] = useState<SortKey>("date")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [mainTab, setMainTab] = useState("studio")
  const [loading, setLoading] = useState(true)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState<VideoInterview | null>(null)
  const [rescheduling, setRescheduling] = useState(false)
  const [jobs, setJobs] = useState<{ _id: string; title: string }[]>([])
  const [schedDate, setSchedDate] = useState<Date | undefined>(undefined)
  const [schedTime, setSchedTime] = useState("")
  const [reschedDate, setReschedDate] = useState<Date | undefined>(undefined)
  const [reschedTime, setReschedTime] = useState("")
  const [scheduleForm, setScheduleForm] = useState({
    candidateEmail: "",
    candidateName: "",
    jobId: "",
    duration: 60,
    notes: "",
    provider: "in_app" as Provider,
    meetingLink: "",
    scheduledDate: "",
  })

  const fetchInterviews = useCallback(async () => {
    try {
      const response = await fetch("/api/video-interviews", { cache: "no-store" })
      if (response.ok) {
        const data = await response.json()
        const items = (data.interviews || []).map((it: Record<string, unknown>) => {
          const base: VideoInterview = {
            id: String(it._id || it.id),
            candidateId: String((it.candidateId as { _id?: string })?._id || it.candidateId || ""),
            candidateName: String(it.candidateName || (it.candidateId as { name?: string })?.name || ""),
            candidateEmail: String(it.candidateEmail || (it.candidateId as { email?: string })?.email || ""),
            position: String(it.position || (it.jobId as { title?: string })?.title || ""),
            jobId: String((it.jobId as { _id?: string })?._id || it.jobId || ""),
            scheduledDate: String(it.scheduledDate),
            duration: Number(it.duration) || 60,
            status: (it.status as InterviewStatus) || "scheduled",
            meetingLink: it.meetingLink as string | undefined,
            recordingUrl: it.recordingUrl as string | undefined,
            notes: it.notes as string | undefined,
            rating: it.rating as number | undefined,
            avatar: it.avatar as string | undefined,
            roomId: it.roomId as string | undefined,
            startedAt: it.startedAt ? String(it.startedAt) : undefined,
            endedAt: it.endedAt ? String(it.endedAt) : undefined,
            hostJoinedAt: it.hostJoinedAt ? String(it.hostJoinedAt) : undefined,
            candidateJoinedAt: it.candidateJoinedAt ? String(it.candidateJoinedAt) : undefined,
            feedback: it.feedback as string | undefined,
            applicationId: String(it.applicationId || ""),
          }
          return { ...base, status: computeStatus(base) }
        })
        setInterviews(items)
      }
    } catch (error) {
      console.error("Error fetching interviews:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInterviews()
    fetch("/api/job-descriptions/mine")
      .then((r) => r.json())
      .then((j) => setJobs(j.jobs || []))
      .catch(() => {})
  }, [fetchInterviews])

  useEffect(() => {
    const userId = searchParams?.get("userId")
    if (!userId) return
    fetch(`/api/users/${userId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        const u = j.user || j
        if (u?.email) {
          setScheduleForm((p) => ({
            ...p,
            candidateEmail: u.email,
            candidateName: u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          }))
          setShowScheduleModal(true)
        }
      })
      .catch(() => {})
  }, [searchParams])

  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime()
    const todayCount = interviews.filter(
      (i) => startOfDay(new Date(i.scheduledDate)).getTime() === todayStart && i.status !== "cancelled",
    ).length
    const live = interviews.filter((i) => i.status === "in-progress").length
    const upcoming = interviews.filter(
      (i) => i.status === "scheduled" && new Date(i.scheduledDate).getTime() > Date.now(),
    ).length
    return {
      total: interviews.length,
      scheduled: interviews.filter((i) => i.status === "scheduled").length,
      completed: interviews.filter((i) => i.status === "completed").length,
      inProgress: live,
      missed: interviews.filter((i) => i.status === "missed").length,
      today: todayCount,
      upcoming,
    }
  }, [interviews])

  const startingSoon = useMemo(() => {
    const now = Date.now()
    return interviews.filter(
      (i) =>
        i.status === "scheduled" &&
        new Date(i.scheduledDate).getTime() - now > 0 &&
        new Date(i.scheduledDate).getTime() - now < 30 * 60 * 1000,
    )
  }, [interviews])

  const filteredInterviews = useMemo(() => {
    let list = [...interviews]
    if (statusFilter !== "all") list = list.filter((i) => i.status === statusFilter)
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      list = list.filter(
        (i) =>
          i.candidateName.toLowerCase().includes(q) ||
          i.position.toLowerCase().includes(q) ||
          i.candidateEmail.toLowerCase().includes(q),
      )
    }
    list.sort((a, b) => {
      if (sortBy === "name") return a.candidateName.localeCompare(b.candidateName)
      if (sortBy === "status") return a.status.localeCompare(b.status)
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    })
    return list
  }, [interviews, statusFilter, searchTerm, sortBy])

  const upcomingTimeline = useMemo(() => {
    const now = Date.now()
    return interviews
      .filter((i) => i.status === "scheduled" || i.status === "in-progress")
      .filter((i) => new Date(i.scheduledDate).getTime() >= now - 3600000)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 8)
  }, [interviews])

  const buildScheduleDatetime = () => {
    if (!schedDate || !schedTime) return null
    const [hh, mm] = schedTime.split(":").map((v) => parseInt(v || "0", 10))
    const when = new Date(schedDate)
    when.setHours(hh || 0, mm || 0, 0, 0)
    return when
  }

  const handleScheduleInterview = async () => {
    const emailOk = /.+@.+\..+/.test(scheduleForm.candidateEmail.trim())
    if (!scheduleForm.candidateName.trim()) return toast({ title: "Candidate name required", variant: "destructive" })
    if (!emailOk) return toast({ title: "Valid email required", variant: "destructive" })
    if (!scheduleForm.jobId) return toast({ title: "Select a job", variant: "destructive" })
    const when = buildScheduleDatetime()
    if (!when || Number.isNaN(when.getTime())) return toast({ title: "Invalid date/time", variant: "destructive" })
    if (when.getTime() < Date.now() - 60000) return toast({ title: "Date must be in the future", variant: "destructive" })
    if (scheduleForm.provider === "external" && !scheduleForm.meetingLink.trim()) {
      return toast({ title: "External meeting link required", variant: "destructive" })
    }

    try {
      setScheduling(true)
      const response = await fetch("/api/video-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateEmail: scheduleForm.candidateEmail.trim(),
          jobId: scheduleForm.jobId,
          scheduledDate: when.toISOString(),
          duration: scheduleForm.duration,
          notes: scheduleForm.notes,
          provider: scheduleForm.provider,
          meetingLink: scheduleForm.meetingLink.trim(),
        }),
      })
      if (!response.ok) {
        const t = await response.text()
        throw new Error(t || "Failed to schedule")
      }
      toast({ title: "Interview scheduled", description: "Candidate notified and status updated." })
      setShowScheduleModal(false)
      setScheduleForm({
        candidateEmail: "",
        candidateName: "",
        jobId: "",
        duration: 60,
        notes: "",
        provider: "in_app",
        meetingLink: "",
        scheduledDate: "",
      })
      setSchedDate(undefined)
      setSchedTime("")
      fetchInterviews()
    } catch (e: unknown) {
      toast({
        title: "Schedule failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setScheduling(false)
    }
  }

  const handleJoinInterview = async (interviewId: string) => {
    try {
      const response = await fetch(`/api/video-interviews/${interviewId}/join`, { method: "POST" })
      if (response.ok) {
        const data = await response.json()
        const url =
          data.joinUrl ||
          (data.roomId ? `/video-call/${data.roomId}?interviewId=${interviewId}&isHost=true` : null)
        if (url) router.push(url)
      }
    } catch (error) {
      console.error("Error joining interview:", error)
    }
  }

  const submitReschedule = async () => {
    if (!showRescheduleModal) return
    if (!reschedDate || !reschedTime) {
      toast({ title: "Pick a new date and time", variant: "destructive" })
      return
    }
    const when = buildDatetimeIso(reschedDate, reschedTime)
    if (!when) {
      toast({ title: "Invalid date/time", variant: "destructive" })
      return
    }
    if (when.getTime() < Date.now() - 60000) {
      toast({ title: "New time must be in the future", variant: "destructive" })
      return
    }
    try {
      setRescheduling(true)
      const res = await fetch(`/api/video-interviews/${showRescheduleModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate: when.toISOString(),
          duration: scheduleForm.duration,
          reason: "reschedule",
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast({
        title: "Interview rescheduled",
        description: "Status reset to scheduled. Candidate notified by email and in-app alert.",
      })
      setShowRescheduleModal(null)
      setReschedDate(undefined)
      setReschedTime("")
      fetchInterviews()
    } catch (e: unknown) {
      toast({ title: "Reschedule failed", description: e instanceof Error ? e.message : "Error", variant: "destructive" })
    } finally {
      setRescheduling(false)
    }
  }

  const cancelInterview = async (interview: VideoInterview) => {
    try {
      const res = await fetch(`/api/video-interviews/${interview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Interview cancelled" })
      setShowRescheduleModal(null)
      fetchInterviews()
    } catch {
      toast({ title: "Cancel failed", variant: "destructive" })
    }
  }

  const copyMeetingLink = (interview: VideoInterview) => {
    const base = typeof window !== "undefined" ? window.location.origin : ""
    const link =
      interview.meetingLink ||
      (interview.roomId ? `${base}/video-call/${interview.roomId}?interviewId=${interview.id}` : "")
    if (!link) return toast({ title: "No link available", variant: "destructive" })
    navigator.clipboard.writeText(link)
    toast({ title: "Link copied" })
  }

  const exportCsv = () => {
    const rows = [
      ["Candidate", "Email", "Position", "Date", "Duration", "Status"].join(","),
      ...filteredInterviews.map((i) =>
        [
          `"${i.candidateName}"`,
          i.candidateEmail,
          `"${i.position}"`,
          format(new Date(i.scheduledDate), "yyyy-MM-dd HH:mm"),
          i.duration,
          i.status,
        ].join(","),
      ),
    ]
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `video-interviews-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openReschedule = (interview: VideoInterview) => {
    const isPast = PAST_STATUSES.includes(interview.status)
    let defaultWhen: Date
    if (isPast) {
      defaultWhen = new Date()
      defaultWhen.setDate(defaultWhen.getDate() + 1)
      defaultWhen.setHours(10, 0, 0, 0)
    } else {
      defaultWhen = new Date(interview.scheduledDate)
    }
    setShowRescheduleModal(interview)
    setReschedDate(defaultWhen)
    setReschedTime(formatTimeInput(defaultWhen))
    setScheduleForm((p) => ({ ...p, duration: interview.duration }))
  }

  const formatDayLabel = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isToday(d)) return "Today"
    if (isTomorrow(d)) return "Tomorrow"
    return format(d, "EEE, MMM d")
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Video className="h-10 w-10 text-red-500" />
        <span>Loading Video Interview Studio…</span>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-red-50/20 to-background">
      {/* Hero */}
      <div className="border-b bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-violet-600 text-white">
                  <Video className="h-6 w-6" />
                </div>
                Video Interview Studio
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Schedule, join live calls, track pipeline, and manage recordings
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InterviewNotificationSystem />
              <Button variant="outline" size="sm" onClick={() => fetchInterviews()}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/recruiter/ai-interview">
                  <Brain className="h-4 w-4 mr-1" /> Question Bank
                </Link>
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowScheduleModal(true)}>
                <Plus className="h-4 w-4 mr-2" /> Schedule Interview
              </Button>
            </div>
          </div>

          {/* Live banner */}
          {startingSoon.length > 0 && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-emerald-800">
                <Radio className="h-4 w-4 animate-pulse" />
                <strong>{startingSoon.length}</strong> interview(s) starting within 30 minutes
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleJoinInterview(startingSoon[0].id)}>
                Join next — {startingSoon[0].candidateName}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
            {[
              { label: "Total", value: stats.total, color: "text-slate-700" },
              { label: "Today", value: stats.today, color: "text-blue-600" },
              { label: "Upcoming", value: stats.upcoming, color: "text-violet-600" },
              { label: "Live", value: stats.inProgress, color: "text-emerald-600" },
              { label: "Completed", value: stats.completed, color: "text-purple-600" },
              { label: "Missed", value: stats.missed, color: "text-red-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-white/80 px-3 py-2">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="studio">Interview List</TabsTrigger>
            <TabsTrigger value="pipeline">Analytics Pipeline</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-0">
            <InterviewPipelineDashboard userRole="recruiter" />
          </TabsContent>

          <TabsContent value="studio" className="mt-0">
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Main list */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search candidate, role, email…"
                      className="pl-9 h-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                    <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">By Date</SelectItem>
                      <SelectItem value="name">By Name</SelectItem>
                      <SelectItem value="status">By Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex border rounded-md">
                    <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
                    <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
                </div>

                <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                    <TabsTrigger value="in-progress">Live</TabsTrigger>
                    <TabsTrigger value="completed">Done</TabsTrigger>
                    <TabsTrigger value="missed">Missed</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className={viewMode === "grid" ? "grid sm:grid-cols-2 gap-4" : "space-y-3"}>
                  {filteredInterviews.map((interview) => {
                    const st = STATUS_STYLES[interview.status] || STATUS_STYLES.scheduled
                    return (
                      <Card
                        key={interview.id}
                        className={`overflow-hidden hover:shadow-md transition-all ${interview.status === "in-progress" ? "ring-2 ring-emerald-400 shadow-emerald-100" : ""}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <Avatar className="h-11 w-11 border">
                                <AvatarImage src={interview.avatar || undefined} />
                                <AvatarFallback className="bg-violet-100 text-violet-700 text-sm">
                                  {interview.candidateName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold truncate">{interview.candidateName}</h3>
                                  <Badge variant="outline" className={`text-xs gap-1 border ${st.badge}`}>
                                    {st.icon}
                                    {interview.status.replace("-", " ")}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{interview.position}</p>
                                <p className="text-xs text-muted-foreground">{interview.candidateEmail}</p>
                                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    {formatDayLabel(interview.scheduledDate)} · {format(new Date(interview.scheduledDate), "h:mm a")}
                                  </span>
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{interview.duration} min</span>
                                  {interview.status === "scheduled" && (
                                    <span>{formatDistanceToNow(new Date(interview.scheduledDate), { addSuffix: true })}</span>
                                  )}
                                </div>
                                {(interview.hostJoinedAt || interview.candidateJoinedAt) && (
                                  <div className="mt-2 flex gap-2 text-[10px]">
                                    {interview.hostJoinedAt && <Badge variant="outline">Host joined</Badge>}
                                    {interview.candidateJoinedAt && <Badge variant="outline">Candidate joined</Badge>}
                                  </div>
                                )}
                                {interview.notes && (
                                  <p className="mt-2 text-xs bg-muted/50 rounded p-2 line-clamp-2">{interview.notes}</p>
                                )}
                                {interview.feedback && (
                                  <p className="mt-2 text-xs bg-violet-50 border border-violet-100 rounded p-2 line-clamp-3 text-violet-900">
                                    <span className="font-medium">Pipeline feedback: </span>
                                    {interview.feedback}
                                  </p>
                                )}
                                {interview.rating && (
                                  <div className="flex mt-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star key={star} className={`h-3.5 w-3.5 ${star <= interview.rating! ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap sm:flex-col gap-1 shrink-0">
                              {(interview.status === "scheduled" || interview.status === "in-progress") && (
                                <Button
                                  size="sm"
                                  className={interview.status === "in-progress" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"}
                                  onClick={() => handleJoinInterview(interview.id)}
                                >
                                  <Video className="h-3.5 w-3.5 mr-1" />
                                  {interview.status === "in-progress" ? "Join Live" : "Start Room"}
                                </Button>
                              )}
                              {PAST_STATUSES.includes(interview.status) && (
                                <Button
                                  size="sm"
                                  className="bg-violet-600 hover:bg-violet-700"
                                  onClick={() => openReschedule(interview)}
                                >
                                  <CalendarClock className="h-3.5 w-3.5 mr-1" />
                                  Reschedule Interview
                                </Button>
                              )}
                              {interview.recordingUrl && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={interview.recordingUrl} target="_blank" rel="noreferrer">
                                    <Play className="h-3.5 w-3.5 mr-1" />Recording
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => copyMeetingLink(interview)}>
                                <Copy className="h-3.5 w-3.5 mr-1" />Copy Link
                              </Button>
                              {interview.candidateId && (
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/dashboard/recruiter/candidates/${interview.candidateId}`}>
                                    <Users className="h-3.5 w-3.5 mr-1" />Profile
                                  </Link>
                                </Button>
                              )}
                              {interview.jobId && (
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/dashboard/recruiter/job-descriptions/${interview.jobId}/candidates`}>
                                    <LayoutGrid className="h-3.5 w-3.5 mr-1" />Job pipeline
                                  </Link>
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/messages?to=${encodeURIComponent(interview.candidateEmail)}`)}>
                                <MessageCircle className="h-3.5 w-3.5 mr-1" />Message
                              </Button>
                              {(interview.status === "scheduled" || interview.status === "in-progress") && (
                                <Button size="sm" variant="outline" onClick={() => openReschedule(interview)}>
                                  <CalendarClock className="h-3.5 w-3.5 mr-1" />Change Time
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                {filteredInterviews.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                      <Video className="h-14 w-14 mx-auto text-red-300 mb-4" />
                      <h3 className="font-semibold text-lg">No interviews found</h3>
                      <p className="text-muted-foreground text-sm mt-2">Schedule your first video interview or adjust filters.</p>
                      <Button className="mt-4 bg-red-600 hover:bg-red-700" onClick={() => setShowScheduleModal(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Schedule Interview
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-violet-600" /> Upcoming Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcomingTimeline.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No upcoming interviews.</p>
                    ) : (
                      upcomingTimeline.map((i) => (
                        <div key={i.id} className="flex gap-3 border-b pb-3 last:border-0">
                          <div className="text-center shrink-0 w-12">
                            <p className="text-xs font-bold text-violet-600">{format(new Date(i.scheduledDate), "h:mm a")}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDayLabel(i.scheduledDate)}</p>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{i.candidateName}</p>
                            <p className="text-xs text-muted-foreground truncate">{i.position}</p>
                          </div>
                          {i.status === "in-progress" && (
                            <Button size="sm" className="h-7 bg-red-600" onClick={() => handleJoinInterview(i.id)}>Join</Button>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/dashboard/recruiter/ai-matching"><Users className="h-4 w-4 mr-2" />Find Candidates (AI)</Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/dashboard/recruiter/talent-pool"><Users className="h-4 w-4 mr-2" />Talent Pool</Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/dashboard/recruiter/email-templates"><ExternalLink className="h-4 w-4 mr-2" />Interview Email Templates</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-violet-100 bg-violet-50/30">
                  <CardContent className="pt-4 text-sm text-muted-foreground">
                    <p className="font-medium text-violet-900 mb-1">In-app video rooms</p>
                    <p className="text-xs">HireAI creates a secure room automatically. Candidates receive email + in-app notification when you schedule.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Video Interview</DialogTitle>
            <DialogDescription>Candidate receives notification and hiring status updates to Interview Scheduled.</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Candidate Name *</label>
              <Input value={scheduleForm.candidateName} onChange={(e) => setScheduleForm({ ...scheduleForm, candidateName: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Candidate Email *</label>
              <Input type="email" value={scheduleForm.candidateEmail} onChange={(e) => setScheduleForm({ ...scheduleForm, candidateEmail: e.target.value })} placeholder="candidate@email.com" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label className="text-sm font-medium">Job / Position *</label>
              <Select value={scheduleForm.jobId || "none"} onValueChange={(v) => setScheduleForm({ ...scheduleForm, jobId: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select open job" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Select job —</SelectItem>
                  {jobs.map((j) => <SelectItem key={j._id} value={j._id}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {schedDate ? format(schedDate, "PPP") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar mode="single" selected={schedDate} onSelect={setSchedDate} disabled={(d) => d < startOfDay(new Date())} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time *</label>
              <Input type="time" step={300} value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <div className="flex flex-wrap gap-1">
                {DURATION_PRESETS.map((d) => (
                  <Button key={d} size="sm" variant={scheduleForm.duration === d ? "default" : "outline"} onClick={() => setScheduleForm({ ...scheduleForm, duration: d })}>
                    {d}m
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Meeting Type</label>
              <Select value={scheduleForm.provider} onValueChange={(v) => setScheduleForm({ ...scheduleForm, provider: v as Provider })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">HireAI Video Room</SelectItem>
                  <SelectItem value="external">External Link (Zoom, Meet)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scheduleForm.provider === "external" && (
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-medium flex items-center gap-1"><Link2 className="h-3 w-3" /> Meeting URL *</label>
                <Input value={scheduleForm.meetingLink} onChange={(e) => setScheduleForm({ ...scheduleForm, meetingLink: e.target.value })} placeholder="https://zoom.us/j/..." />
              </div>
            )}
            <div className="sm:col-span-2 space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} placeholder="Topics, panel members, prep instructions…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)} disabled={scheduling}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleScheduleInterview} disabled={scheduling}>
              {scheduling ? "Scheduling…" : "Schedule & Notify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={!!showRescheduleModal} onOpenChange={(o) => {
        if (!o) {
          setShowRescheduleModal(null)
          setReschedDate(undefined)
          setReschedTime("")
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showRescheduleModal && PAST_STATUSES.includes(showRescheduleModal.status)
                ? "Reschedule Interview"
                : "Change Interview Time"}
            </DialogTitle>
            <DialogDescription>
              {showRescheduleModal?.candidateName} — {showRescheduleModal?.position}
              {showRescheduleModal && PAST_STATUSES.includes(showRescheduleModal.status) && (
                <span className="block mt-1 text-violet-700">
                  This interview was {showRescheduleModal.status.replace("-", " ")}. Pick a new date to book again.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {showRescheduleModal && (
              <Badge variant="outline" className={STATUS_STYLES[showRescheduleModal.status]?.badge}>
                Current: {showRescheduleModal.status.replace("-", " ")}
              </Badge>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">New Date *</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    {reschedDate ? format(reschedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reschedDate}
                    onSelect={setReschedDate}
                    disabled={(d) => d < startOfDay(new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Time *</label>
              <Input type="time" step={300} value={reschedTime} onChange={(e) => setReschedTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration (minutes)</label>
              <div className="flex flex-wrap gap-1">
                {DURATION_PRESETS.map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={scheduleForm.duration === d ? "default" : "outline"}
                    onClick={() => setScheduleForm((p) => ({ ...p, duration: d }))}
                  >
                    {d}m
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {showRescheduleModal &&
              (showRescheduleModal.status === "scheduled" || showRescheduleModal.status === "in-progress") && (
                <Button
                  variant="destructive"
                  onClick={() => showRescheduleModal && cancelInterview(showRescheduleModal)}
                  disabled={rescheduling}
                >
                  Cancel Interview
                </Button>
              )}
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" onClick={() => setShowRescheduleModal(null)}>Close</Button>
              <Button className="bg-violet-600 hover:bg-violet-700" onClick={submitReschedule} disabled={rescheduling}>
                {rescheduling ? "Saving…" : "Confirm Reschedule"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
