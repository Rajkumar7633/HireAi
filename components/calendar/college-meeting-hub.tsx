"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus, Users, Video,
  MapPin, Clock, Download, Trash2, Radio,   CheckCircle2, XCircle,
} from "lucide-react"
import { DEPARTMENTS, formatDuration } from "@/lib/college-meeting-shared"
import { authFetch } from "@/lib/client-auth"

interface Meeting {
  _id: string
  title: string
  description?: string
  meetingType: string
  startTime: string
  endTime: string
  roomId?: string
  venue?: string
  audienceMode: string
  status: string
  stats?: { invited: number; joined: number; left: number; absent: number }
  attendees?: Attendee[]
}

interface Attendee {
  studentId: string
  studentName: string
  email: string
  department?: string
  batch?: string
  status: string
  joinTime?: string
  leaveTime?: string
  totalDurationSeconds: number
  durationLabel?: string
  sessionCount?: number
}

interface Student {
  _id: string
  name: string
  email: string
  department?: string
  batch?: string
}

const MEETING_TYPES = [
  { value: "general", label: "General" },
  { value: "placement", label: "Placement" },
  { value: "training", label: "Training" },
  { value: "orientation", label: "Orientation" },
  { value: "interview_prep", label: "Interview Prep" },
  { value: "webinar", label: "Webinar" },
]

const YEARS = [1, 2, 3, 4]

function statusBadge(status: string) {
  const map: Record<string, string> = {
    live: "bg-green-100 text-green-700 border-green-200",
    scheduled: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-gray-100 text-gray-600 border-gray-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    joined: "bg-emerald-100 text-emerald-700",
    left: "bg-slate-100 text-slate-700",
    invited: "bg-amber-100 text-amber-700",
    absent: "bg-red-50 text-red-600",
  }
  return map[status] || "bg-gray-100 text-gray-600"
}

export function CollegeMeetingHub() {
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [month, setMonth] = useState(new Date())
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Meeting | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    title: "",
    description: "",
    meetingType: "general",
    startTime: "",
    endTime: "",
    venue: "",
    audienceMode: "all",
    targetDepartment: "",
    targetYear: "",
    targetBatch: "",
  })

  const fetchMeetings = useCallback(async () => {
    try {
      const from = subMonths(startOfMonth(month), 2).toISOString()
      const to = addMonths(endOfMonth(month), 4).toISOString()
      const res = await authFetch(`/api/college/meetings?from=${from}&to=${to}`)
      if (res.ok) {
        const data = await res.json()
        setMeetings(data.meetings || [])
      }
    } catch {
      toast({ title: "Failed to load meetings", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [month, toast])

  useEffect(() => {
    setLoading(true)
    fetchMeetings()
  }, [fetchMeetings])

  useEffect(() => {
    if (form.audienceMode === "custom") {
      authFetch("/api/college/onboard-student")
        .then((r) => r.json())
        .then((d) => setStudents(d.students || []))
        .catch(() => setStudents([]))
    }
  }, [form.audienceMode])

  const loadDetail = async (id: string) => {
    setDetailId(id)
    setDetailLoading(true)
    try {
      const res = await authFetch(`/api/college/meetings/${id}`)
      if (res.ok) {
        const data = await res.json()
        setDetail(data.meeting)
      }
    } finally {
      setDetailLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.title.trim() || !form.startTime || !form.endTime) {
      toast({ title: "Fill required fields", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const payload = {
        ...form,
        targetYear: form.targetYear ? Number(form.targetYear) : null,
        studentIds: form.audienceMode === "custom" ? Array.from(selectedStudents) : undefined,
      }
      const res = await authFetch("/api/college/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Create failed")
      toast({
        title: "Meeting scheduled",
        description: `Invited ${data.invitedCount} student(s). Notifications sent.`,
      })
      setCreateOpen(false)
      setForm({
        title: "", description: "", meetingType: "general",
        startTime: "", endTime: "", venue: "",
        audienceMode: "all", targetDepartment: "", targetYear: "", targetBatch: "",
      })
      setSelectedStudents(new Set())
      fetchMeetings()
    } catch (e: unknown) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Could not create meeting",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const openMeetingRoom = async (meetingId: string) => {
    try {
      const res = await authFetch(`/api/college/meetings/${meetingId}/join`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not open room")
      router.push(data.joinUrl)
    } catch (e: unknown) {
      toast({
        title: "Could not open room",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    }
  }

  const handleCancel = async (id: string) => {
    if (!window.confirm("Cancel this meeting?")) return
    await authFetch(`/api/college/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    })
    fetchMeetings()
    if (detailId === id) loadDetail(id)
  }

  const exportCsv = () => {
    if (!detail?.attendees?.length) return
    const rows = [
      ["Name", "Email", "Department", "Batch", "Status", "Join Time", "Leave Time", "Duration", "Sessions"],
      ...detail.attendees.map((a) => [
        a.studentName,
        a.email,
        a.department || "",
        a.batch || "",
        a.status,
        a.joinTime ? format(new Date(a.joinTime), "yyyy-MM-dd HH:mm:ss") : "",
        a.leaveTime ? format(new Date(a.leaveTime), "yyyy-MM-dd HH:mm:ss") : "",
        formatDuration(a.totalDurationSeconds || 0),
        String(a.sessionCount || 0),
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `meeting-attendance-${detail.title.replace(/\s+/g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const liveCount = meetings.filter((m) => m.status === "live").length
  const upcomingCount = meetings.filter((m) => m.status === "scheduled").length

  const meetingsOnDay = (day: Date) =>
    meetings.filter((m) => isSameDay(new Date(m.startTime), day))

  const sortedMeetings = useMemo(
    () => [...meetings].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [meetings],
  )

  if (loading && meetings.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="text-muted-foreground">Loading meetings…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-purple-600" />
            College Meeting Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Schedule meetings, invite students by batch, and track join/leave attendance
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Schedule Meeting
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">{meetings.length}</p>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-4 pb-4 flex items-center gap-2">
            <Radio className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{liveCount}</p>
              <p className="text-xs text-muted-foreground">Live now</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">{upcomingCount}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="pt-4 pb-4">
            <p className="text-2xl font-bold">
              {meetings.reduce((s, m) => s + (m.stats?.joined || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Total joins (month)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">All Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">{format(month, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>Today</Button>
                <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const dayMeetings = meetingsOnDay(day)
                  const isToday = isSameDay(day, new Date())
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className={`min-h-[72px] p-1.5 rounded-lg border text-left transition-colors ${
                        isToday ? "border-purple-400 bg-purple-50/50" : "border-transparent hover:bg-muted/50"
                      } ${!isSameMonth(day, month) ? "opacity-40" : ""}`}
                      onClick={() => dayMeetings[0] && loadDetail(dayMeetings[0]._id)}
                    >
                      <span className={`text-xs font-semibold ${isToday ? "text-purple-700" : ""}`}>
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayMeetings.slice(0, 2).map((m) => (
                          <div
                            key={m._id}
                            className={`text-[10px] px-1 py-0.5 rounded truncate ${statusBadge(m.status)}`}
                          >
                            {m.title}
                          </div>
                        ))}
                        {dayMeetings.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{dayMeetings.length - 2}</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-3">
          {sortedMeetings.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                No meetings this month. Schedule one to get started.
              </CardContent>
            </Card>
          ) : (
            sortedMeetings.map((m) => (
              <Card key={m._id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => loadDetail(m._id)}>
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      m.status === "live" ? "bg-green-100" : "bg-purple-100"
                    }`}>
                          <Video className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(m.startTime), "dd MMM yyyy, HH:mm")} – {format(new Date(m.endTime), "HH:mm")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />{m.stats?.invited || 0} invited
                        </span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusBadge(m.status)}>{m.status}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule College Meeting</DialogTitle>
            <DialogDescription>
              Invite all students or filter by department, year, or batch. Students receive in-app notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Placement briefing — Batch 2025" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.meetingType} onValueChange={(v) => setForm((f) => ({ ...f, meetingType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEETING_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={form.audienceMode} onValueChange={(v) => setForm((f) => ({ ...f, audienceMode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All onboarded students</SelectItem>
                    <SelectItem value="department">By department</SelectItem>
                    <SelectItem value="year">By year</SelectItem>
                    <SelectItem value="batch">By batch</SelectItem>
                    <SelectItem value="custom">Select individuals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.audienceMode === "department" && (
              <Select value={form.targetDepartment} onValueChange={(v) => setForm((f) => ({ ...f, targetDepartment: v }))}>
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {form.audienceMode === "year" && (
              <Select value={form.targetYear} onValueChange={(v) => setForm((f) => ({ ...f, targetYear: v }))}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {form.audienceMode === "batch" && (
              <Input placeholder="Batch e.g. 2022-2026" value={form.targetBatch} onChange={(e) => setForm((f) => ({ ...f, targetBatch: e.target.value }))} />
            )}
            {form.audienceMode === "custom" && (
              <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                {students.map((s) => (
                  <div key={s._id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50" onClick={() => {
                    setSelectedStudents((prev) => {
                      const n = new Set(prev)
                      n.has(s._id) ? n.delete(s._id) : n.add(s._id)
                      return n
                    })
                  }}>
                    <Checkbox checked={selectedStudents.has(s._id)} />
                    <span className="text-sm">{s.name} · {s.department || "—"}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start *</Label>
                <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End *</Label>
                <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <Alert className="bg-purple-50 border-purple-200">
              <Video className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-sm text-purple-900">
                Opens a <strong>Teams-style meeting</strong> with screen share, chat, reactions, Q&A,
                whiteboard, file sharing, and up to <strong>500 students</strong>.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>Venue (optional — for in-person sessions)</Label>
              <Input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Seminar Hall A" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Schedule & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail sheet */}
      <Sheet open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detailLoading || !detail ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>{detail.title}</SheetTitle>
                <SheetDescription>
                  {format(new Date(detail.startTime), "EEEE, dd MMM yyyy · HH:mm")} – {format(new Date(detail.endTime), "HH:mm")}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusBadge(detail.status)}>{detail.status}</Badge>
                  <Badge variant="outline">{detail.meetingType}</Badge>
                </div>
                {detail.description && <p className="text-sm text-muted-foreground">{detail.description}</p>}
                {detail.venue && (
                  <p className="text-sm flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{detail.venue}</p>
                )}
                <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 space-y-2">
                  <p className="text-sm font-medium text-purple-900 flex items-center gap-2">
                    <Video className="h-4 w-4" /> HireAI Video Room
                  </p>
                  <p className="text-xs text-purple-800">
                    Room ID: {detail.roomId || "Generated when you start"}
                  </p>
                  {detail.status !== "cancelled" && (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => openMeetingRoom(detail._id)}
                    >
                      <Video className="h-3.5 w-3.5 mr-1" />
                      {detail.status === "live" ? "Join live room" : "Open meeting room"}
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-muted/50"><p className="font-bold">{detail.stats?.invited}</p><p>Invited</p></div>
                  <div className="p-2 rounded-lg bg-green-50"><p className="font-bold text-green-700">{detail.stats?.joined}</p><p>Joined</p></div>
                  <div className="p-2 rounded-lg bg-slate-50"><p className="font-bold">{detail.stats?.left}</p><p>Left</p></div>
                  <div className="p-2 rounded-lg bg-amber-50"><p className="font-bold text-amber-700">{detail.stats?.absent}</p><p>Absent</p></div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1" onClick={exportCsv}>
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </Button>
                  {detail.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="text-destructive gap-1" onClick={() => handleCancel(detail._id)}>
                      <Trash2 className="h-3.5 w-3.5" /> Cancel meeting
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => loadDetail(detail._id)}>Refresh</Button>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Attendance record</CardTitle>
                    <CardDescription>Join time, leave time, and duration per student</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs">
                          <tr>
                            <th className="p-2 text-left">Student</th>
                            <th className="p-2 text-left">Status</th>
                            <th className="p-2 text-left">Joined</th>
                            <th className="p-2 text-left">Left</th>
                            <th className="p-2 text-left">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detail.attendees || []).map((a) => (
                            <tr key={a.studentId} className="border-t">
                              <td className="p-2">
                                <p className="font-medium">{a.studentName}</p>
                                <p className="text-xs text-muted-foreground">{a.department} · {a.batch}</p>
                              </td>
                              <td className="p-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(a.status)}`}>{a.status}</span>
                              </td>
                              <td className="p-2 text-xs whitespace-nowrap">
                                {a.joinTime ? format(new Date(a.joinTime), "HH:mm:ss") : "—"}
                              </td>
                              <td className="p-2 text-xs whitespace-nowrap">
                                {a.leaveTime ? format(new Date(a.leaveTime), "HH:mm:ss") : "—"}
                              </td>
                              <td className="p-2 text-xs">{a.durationLabel || formatDuration(a.totalDurationSeconds)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
