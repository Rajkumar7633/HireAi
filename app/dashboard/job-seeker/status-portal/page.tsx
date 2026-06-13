"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScoreRing, DonutChart } from "@/components/ui/charts"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, Clock, CheckCircle2, AlertCircle, Calendar, FileText,
  MessageSquare, Star, TrendingUp, MapPin, Building2, ChevronDown,
  ChevronUp, RefreshCw, Search, Send, Trophy, XCircle, Video,
  ClipboardCheck, Eye, ChevronRight, Briefcase, User,
} from "lucide-react"
import { format, isValid, parseISO, differenceInDays, isPast } from "date-fns"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface TimelineItem {
  status: string
  date: string
  completed: boolean
  description: string
}

interface ApplicationData {
  _id: string
  jobDescriptionId: {
    _id?: string
    title: string
    location?: string
    company?: string
    recruiterId?: { name?: string; company?: string }
  }
  status: string
  applicationDate: string
  timeline: TimelineItem[]
  nextSteps?: string[]
  estimatedTimeToResponse?: string
  canWithdraw?: boolean
  testId?: { _id?: string; title?: string; description?: string }
  testScore?: number
  interviewDate?: string
  rounds?: Array<{ roundName: string; status: string; score?: number }>
}

interface PortalData {
  applications: ApplicationData[]
  summary: { total: number; pending: number; inProgress: number; completed: number }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const safeDate = (v: any): Date | null => {
  try {
    if (!v) return null
    if (v instanceof Date) return isValid(v) ? v : null
    const d = new Date(v)
    if (isValid(d)) return d
    const iso = parseISO(String(v))
    return isValid(iso) ? iso : null
  } catch { return null }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Pending:               { label: "Pending",     color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: <Clock className="h-3.5 w-3.5" /> },
  Reviewed:              { label: "Reviewed",    color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: <Eye className="h-3.5 w-3.5" /> },
  "Test Assigned":       { label: "Test Due",    color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
  "Assessment Assigned": { label: "Assessment",  color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <ClipboardCheck className="h-3.5 w-3.5" /> },
  "Interview Scheduled": { label: "Interview",   color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc", icon: <Video className="h-3.5 w-3.5" /> },
  Hired:                 { label: "Hired! 🎉",   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: <Trophy className="h-3.5 w-3.5" /> },
  Rejected:              { label: "Rejected",    color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <XCircle className="h-3.5 w-3.5" /> },
}

const PIPELINE_STAGES = [
  { key: "applied",    label: "Applied",    statuses: ["Pending"] },
  { key: "reviewed",   label: "Reviewed",   statuses: ["Reviewed"] },
  { key: "test",       label: "Test",       statuses: ["Test Assigned", "Assessment Assigned"] },
  { key: "interview",  label: "Interview",  statuses: ["Interview Scheduled"] },
  { key: "decision",   label: "Decision",   statuses: ["Hired", "Rejected"] },
]

function getStageIndex(status: string): number {
  for (let i = 0; i < PIPELINE_STAGES.length; i++) {
    if (PIPELINE_STAGES[i].statuses.includes(status)) return i
  }
  return 0
}

function getCompanyColor(name = "A") {
  const colors = ["#7c3aed", "#2563eb", "#0891b2", "#16a34a", "#d97706", "#dc2626", "#db2777"]
  return colors[name.charCodeAt(0) % colors.length]
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", icon: null }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

function PipelineBar({ status }: { status: string }) {
  const current = getStageIndex(status)
  const isRejected = status === "Rejected"
  return (
    <div className="flex items-center gap-0.5">
      {PIPELINE_STAGES.map((stage, i) => {
        const done = i < current
        const active = i === current && !isRejected
        const rejected = isRejected && i === current
        return (
          <div key={stage.key} className="flex items-center gap-0.5">
            <div
              className={`h-1.5 rounded-full transition-all ${
                rejected ? "bg-red-400 w-8" :
                done     ? "bg-purple-500 w-8" :
                active   ? "bg-purple-400 w-8" :
                           "bg-muted w-6"
              }`}
            />
            {i < PIPELINE_STAGES.length - 1 && (
              <div className={`h-0.5 w-1.5 ${done ? "bg-purple-300" : "bg-muted"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function InterviewCountdown({ date }: { date: string }) {
  const d = safeDate(date)
  if (!d) return null
  const days = differenceInDays(d, new Date())
  if (days < -1) return null
  const past = isPast(d)
  if (past) return <span className="text-xs text-muted-foreground">Interview passed</span>
  if (days === 0) return <span className="text-xs font-bold text-red-600 animate-pulse">Interview TODAY</span>
  if (days === 1) return <span className="text-xs font-semibold text-orange-600">Interview TOMORROW</span>
  return <span className="text-xs text-blue-600 font-medium">Interview in {days}d</span>
}

// ── Application Card ──────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onFeedback,
}: {
  app: ApplicationData
  onFeedback: (app: ApplicationData) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[app.status]
  const company = app.jobDescriptionId?.company || app.jobDescriptionId?.recruiterId?.company || "Company"
  const isHired = app.status === "Hired"
  const isRejected = app.status === "Rejected"
  const progress = app.timeline?.length
    ? Math.round((app.timeline.filter(t => t.completed).length / app.timeline.length) * 100)
    : 0

  return (
    <Card
      className="border-l-4 hover:shadow-md transition-shadow"
      style={{
        borderLeftColor: cfg?.color || "#6b7280",
        background: isHired ? "#f0fdf4" : isRejected ? "#fef9f9" : undefined,
      }}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: getCompanyColor(company) }}
          >
            {company.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-sm leading-snug line-clamp-1">
                  {app.jobDescriptionId?.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />{company}
                  </span>
                  {app.jobDescriptionId?.location && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{app.jobDescriptionId.location}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Applied {safeDate(app.applicationDate) ? format(safeDate(app.applicationDate)!, "MMM d, yyyy") : "—"}
                  </span>
                </div>
              </div>
              <StatusBadge status={app.status} />
            </div>
          </div>
        </div>

        {/* Pipeline */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <PipelineBar status={app.status} />
            <span className="text-xs text-muted-foreground ml-2">{progress}%</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            {PIPELINE_STAGES.map(s => (
              <span key={s.key} className="capitalize">{s.label}</span>
            ))}
          </div>
        </div>

        {/* Highlights */}
        <div className="flex items-center gap-3 flex-wrap">
          {app.interviewDate && <InterviewCountdown date={app.interviewDate} />}
          {app.testScore !== undefined && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${app.testScore >= 70 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              Test: {app.testScore}%
            </span>
          )}
          {app.testId && !app.testScore && (
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full animate-pulse">
              Test pending
            </span>
          )}
          {app.estimatedTimeToResponse && !isHired && !isRejected && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> ~{app.estimatedTimeToResponse}
            </span>
          )}
        </div>

        {/* Expand: timeline + next steps */}
        <button
          className="flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide details" : "Show details"}
        </button>

        {expanded && (
          <div className="space-y-4 pt-1 border-t">
            {/* Timeline */}
            {app.timeline?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Timeline</p>
                <div className="space-y-0">
                  {app.timeline.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${item.completed ? "bg-green-100" : "bg-muted"}`}>
                          {item.completed
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                            : <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          }
                        </div>
                        {i < app.timeline.length - 1 && (
                          <div className={`w-px flex-1 min-h-[20px] my-0.5 ${item.completed ? "bg-green-200" : "bg-border"}`} />
                        )}
                      </div>
                      <div className={`pb-3 flex-1 min-w-0 ${i < app.timeline.length - 1 ? "" : ""}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-medium ${item.completed ? "text-foreground" : "text-muted-foreground"}`}>
                            {item.status}
                          </span>
                          {item.date && safeDate(item.date) && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {format(safeDate(item.date)!, "MMM d")}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next steps */}
            {app.nextSteps && app.nextSteps.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Next Steps</p>
                <ul className="space-y-1.5">
                  {app.nextSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-purple-400" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rounds */}
            {app.rounds && app.rounds.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Interview Rounds</p>
                <div className="flex flex-wrap gap-2">
                  {app.rounds.map((r, i) => (
                    <span key={i} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${
                      r.status === "passed" ? "bg-green-50 text-green-700 border-green-200" :
                      r.status === "failed" ? "bg-red-50 text-red-700 border-red-200" :
                      "bg-muted text-muted-foreground border-border"
                    }`}>
                      {r.status === "passed" ? <CheckCircle2 className="h-3 w-3" /> : r.status === "failed" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {r.roundName}
                      {r.score !== undefined && ` · ${r.score}%`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap pt-1">
          {app.testId && !app.testScore && (
            <Button size="sm" className="h-8 text-xs bg-purple-600 hover:bg-purple-700 gap-1.5" asChild>
              <Link href={`/dashboard/job-seeker/tests/${app._id}`}>
                <ClipboardCheck className="h-3.5 w-3.5" /> Take Test
              </Link>
            </Button>
          )}
          {app.interviewDate && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" asChild>
              <Link href="/dashboard/job-seeker/interviews">
                <Video className="h-3.5 w-3.5" /> View Interview
              </Link>
            </Button>
          )}
          {app.jobDescriptionId?._id && (
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" asChild>
              <Link href={`/dashboard/jobs/${app.jobDescriptionId._id}`}>
                <Briefcase className="h-3.5 w-3.5" /> Job Post
              </Link>
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 ml-auto" onClick={() => onFeedback(app)}>
            <Star className="h-3.5 w-3.5" /> Rate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabId = "all" | "active" | "test" | "interview" | "done"

export default function CandidateStatusPortal() {
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<TabId>("all")
  const [feedbackApp, setFeedbackApp] = useState<ApplicationData | null>(null)
  const [feedback, setFeedback] = useState({ rating: 5, comment: "", category: "application_process" })
  const [submittingFb, setSubmittingFb] = useState(false)
  const { toast } = useToast()

  useEffect(() => { fetchPortalData() }, [])

  const fetchPortalData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/candidate/status-portal")
      if (res.ok) setPortalData(await res.json())
      else throw new Error()
    } catch {
      toast({ title: "Error", description: "Failed to load application status.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const submitFeedback = async () => {
    if (!feedbackApp) return
    setSubmittingFb(true)
    try {
      await fetch("/api/candidate/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: feedbackApp._id, ...feedback }),
      })
      toast({ title: "Feedback submitted!", description: "Thank you for your feedback." })
      setFeedbackApp(null)
      setFeedback({ rating: 5, comment: "", category: "application_process" })
    } catch {
      toast({ title: "Error", description: "Could not submit feedback.", variant: "destructive" })
    } finally {
      setSubmittingFb(false)
    }
  }

  const apps = portalData?.applications || []

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "all",       label: "All",        count: apps.length },
    { id: "active",    label: "Active",     count: apps.filter(a => !["Hired","Rejected"].includes(a.status)).length },
    { id: "test",      label: "Tests",      count: apps.filter(a => ["Test Assigned","Assessment Assigned"].includes(a.status)).length },
    { id: "interview", label: "Interviews", count: apps.filter(a => a.status === "Interview Scheduled").length },
    { id: "done",      label: "Completed",  count: apps.filter(a => ["Hired","Rejected"].includes(a.status)).length },
  ]

  const filtered = useMemo(() => {
    let list = apps
    if (activeTab === "active")    list = list.filter(a => !["Hired","Rejected"].includes(a.status))
    if (activeTab === "test")      list = list.filter(a => ["Test Assigned","Assessment Assigned"].includes(a.status))
    if (activeTab === "interview") list = list.filter(a => a.status === "Interview Scheduled")
    if (activeTab === "done")      list = list.filter(a => ["Hired","Rejected"].includes(a.status))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.jobDescriptionId?.title?.toLowerCase().includes(q) ||
        a.jobDescriptionId?.company?.toLowerCase().includes(q)
      )
    }
    return list
  }, [apps, activeTab, search])

  const summary = portalData?.summary

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <p className="text-sm text-muted-foreground">Loading your application status…</p>
      </div>
    )
  }

  if (!portalData) {
    return (
      <div className="p-6">
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-3">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="font-semibold">Could not load application data</p>
            <Button variant="outline" onClick={fetchPortalData} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-purple-600" />
            Application Status Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track every application in real time
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchPortalData} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Score rings row */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total",       value: summary.total,      color: "#7c3aed", max: Math.max(summary.total, 1) },
              { label: "Pending",     value: summary.pending,    color: "#d97706", max: Math.max(summary.total, 1) },
              { label: "In Progress", value: summary.inProgress, color: "#2563eb", max: Math.max(summary.total, 1) },
              { label: "Completed",   value: summary.completed,  color: "#16a34a", max: Math.max(summary.total, 1) },
            ].map(s => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <ScoreRing value={s.value} max={s.max} size={52} stroke={5} color={s.color} showValue />
                  <div>
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Donut distribution */}
          {summary.total > 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-center">
                <DonutChart
                  size={120}
                  innerLabel={String(summary.total)}
                  innerSub="total"
                  slices={[
                    { label: "Pending",     value: summary.pending,    color: "#d97706" },
                    { label: "In Progress", value: summary.inProgress, color: "#2563eb" },
                    { label: "Completed",   value: summary.completed,  color: "#16a34a" },
                  ].filter(s => s.value > 0)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 border-b pb-3">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              activeTab === tab.id
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-transparent border-border text-muted-foreground hover:border-purple-300"
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 font-bold ${activeTab === tab.id ? "text-white/80" : "text-muted-foreground"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by job title or company…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Application cards */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center space-y-2">
            <Briefcase className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-semibold">No applications found</p>
            <p className="text-sm text-muted-foreground">
              {search ? "Try different search terms." : "Apply to jobs to see them here."}
            </p>
            {!search && (
              <Button className="mt-2 bg-purple-600 hover:bg-purple-700" asChild>
                <Link href="/dashboard/jobs">Browse Jobs</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(app => (
            <ApplicationCard key={app._id} app={app} onFeedback={setFeedbackApp} />
          ))}
        </div>
      )}

      {/* Feedback Dialog */}
      <Dialog open={!!feedbackApp} onOpenChange={open => !open && setFeedbackApp(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>
              {feedbackApp?.jobDescriptionId?.title} at {feedbackApp?.jobDescriptionId?.company}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Star rating */}
            <div className="space-y-2">
              <Label className="text-sm">Overall Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setFeedback(f => ({ ...f, rating: star }))}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${star <= feedback.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
                    />
                  </button>
                ))}
                <span className="ml-2 self-center text-sm text-muted-foreground">
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][feedback.rating]}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Category</Label>
              <Select value={feedback.category} onValueChange={v => setFeedback(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application_process">Application Process</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="interview_experience">Interview Experience</SelectItem>
                  <SelectItem value="overall_experience">Overall Experience</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Comments <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Share your thoughts…"
                value={feedback.comment}
                onChange={e => setFeedback(f => ({ ...f, comment: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setFeedbackApp(null)}>Cancel</Button>
              <Button onClick={submitFeedback} disabled={submittingFb} className="bg-purple-600 hover:bg-purple-700 gap-2">
                {submittingFb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
