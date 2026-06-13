"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { PIPELINE_STAGES } from "@/lib/application-status"
import type { TimelineEntry, PipelineSummary } from "@/lib/activity-timeline"
import {
  Loader2,
  RefreshCw,
  Search,
  History,
  Download,
  ChevronRight,
  Briefcase,
  ClipboardList,
  Video,
  FileText,
  User,
  Bell,
  TrendingUp,
  Calendar,
  GitBranch,
  ExternalLink,
  Activity,
} from "lucide-react"
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay } from "date-fns"

type CategoryFilter = "all" | "application" | "test" | "interview" | "offer" | "profile" | "system" | "hiring"
type DaysFilter = "all" | "7" | "30"

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  application: { label: "Applications", icon: <Briefcase className="h-3.5 w-3.5" />, color: "#2563eb" },
  test: { label: "Tests", icon: <ClipboardList className="h-3.5 w-3.5" />, color: "#0e7490" },
  interview: { label: "Interviews", icon: <Video className="h-3.5 w-3.5" />, color: "#7c3aed" },
  offer: { label: "Offers", icon: <FileText className="h-3.5 w-3.5" />, color: "#059669" },
  profile: { label: "Profile", icon: <User className="h-3.5 w-3.5" />, color: "#64748b" },
  system: { label: "System", icon: <Bell className="h-3.5 w-3.5" />, color: "#94a3b8" },
  hiring: { label: "Hiring", icon: <TrendingUp className="h-3.5 w-3.5" />, color: "#d97706" },
}

function groupLabel(date: Date) {
  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "EEEE, MMMM d, yyyy")
}

function PipelineFunnel({ summary, role }: { summary: PipelineSummary; role?: string }) {
  const isRecruiter = role === "recruiter" || role === "admin"
  const stages = [
    { key: "submitted", label: "Submitted", count: summary.submitted, index: 0, color: "#64748b" },
    { key: "reviewed", label: "Reviewed", count: summary.reviewed, index: 1, color: "#2563eb" },
    { key: "test", label: "Test", count: summary.test, index: 2, color: "#0e7490" },
    { key: "interview", label: "Interview", count: summary.interview, index: 3, color: "#7c3aed" },
    { key: "offer", label: "Offer", count: summary.offer, index: 4, color: "#059669" },
    { key: "hired", label: "Hired", count: summary.hired, index: 5, color: "#16a34a" },
  ]

  const maxCount = Math.max(...stages.map((s) => s.count), 1)
  const hireRate =
    summary.submitted > 0 ? Math.round((summary.hired / summary.submitted) * 100) : 0

  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-white to-violet-50/40 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5 text-violet-600" />
            {isRecruiter ? "Hiring pipeline activity" : "Your hiring journey"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isRecruiter
              ? "Candidate counts at each stage across your job postings"
              : "Track how far you've progressed across applications"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-violet-700 border-violet-200 bg-violet-50">
            Peak stage: {PIPELINE_STAGES[summary.maxProgress]?.label || "—"}
          </Badge>
          {isRecruiter && summary.totalCandidates > 0 && (
            <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
              {hireRate}% hire rate
            </Badge>
          )}
        </div>
      </div>

      {/* Recruiter quick metrics */}
      {isRecruiter && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total candidates", value: summary.totalCandidates, color: "#4c1d95" },
            { label: "Active in pipeline", value: summary.activeInPipeline, color: "#2563eb" },
            { label: "Offers sent", value: summary.offersSent, color: "#059669" },
            { label: "Hired", value: summary.hired, color: "#16a34a" },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-xl border bg-white/80 px-3 py-2.5"
              style={{ borderColor: `${m.color}25` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {m.label}
              </p>
              <p className="text-xl font-bold mt-0.5" style={{ color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Connected funnel */}
      <div className="flex items-stretch gap-0 overflow-x-auto pb-1">
        {stages.map((s, i) => {
          const prevCount = i === 0 ? s.count : stages[i - 1].count
          const conversion =
            i > 0 && prevCount > 0 ? Math.round((s.count / prevCount) * 100) : null
          const barPct = Math.round((s.count / maxCount) * 100)
          const hasData = s.count > 0

          return (
            <div key={s.key} className="flex items-center flex-1 min-w-[72px]">
              <div className="flex-1 flex flex-col items-center text-center px-1">
                <div
                  className={`w-full rounded-xl border-2 px-2 py-3 transition-all ${
                    hasData
                      ? "shadow-md shadow-violet-100"
                      : "border-slate-200 bg-slate-50"
                  }`}
                  style={
                    hasData
                      ? {
                          borderColor: s.color,
                          background: `linear-gradient(135deg, ${s.color}18, white)`,
                        }
                      : undefined
                  }
                >
                  <p
                    className="text-2xl font-extrabold leading-none"
                    style={{ color: hasData ? s.color : "#94a3b8" }}
                  >
                    {s.count}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mt-1.5">
                    {s.label}
                  </p>
                  {conversion !== null && hasData && (
                    <p className="text-[9px] text-slate-400 mt-1">{conversion}% pass</p>
                  )}
                </div>
                <div className="w-full mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${barPct}%`, background: s.color }}
                  />
                </div>
              </div>
              {i < stages.length - 1 && (
                <ChevronRight
                  className={`h-4 w-4 shrink-0 mx-0.5 ${hasData ? "text-violet-400" : "text-slate-200"}`}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t pt-4">
        {role === "recruiter" || role === "admin" ? (
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/dashboard/recruiter/candidates">Candidates</Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/dashboard/recruiter/offer-letters">Offer letters</Link>
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/dashboard/job-seeker/applications">Application pipeline</Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8" asChild>
              <Link href="/dashboard/job-seeker/offer-letters">My offers</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function WeekActivityChart({ entries }: { entries: TimelineEntry[] }) {
  const days = useMemo(() => {
    const buckets: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = startOfDay(new Date())
      d.setDate(d.getDate() - i)
      buckets[format(d, "yyyy-MM-dd")] = 0
    }
    for (const e of entries) {
      const key = format(new Date(e.createdAt), "yyyy-MM-dd")
      if (buckets[key] !== undefined) buckets[key]++
    }
    return Object.entries(buckets).map(([key, count]) => ({
      label: format(new Date(key), "EEE"),
      count,
    }))
  }, [entries])

  const max = Math.max(...days.map((d) => d.count), 1)

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-violet-600" />
        Last 7 days
      </p>
      <div className="flex items-end gap-2 h-24">
        {days.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-violet-500 rounded-t-md min-h-[4px] transition-all"
              style={{ height: `${(d.count / max) * 100}%`, maxHeight: "72px" }}
            />
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
            <span className="text-[10px] font-bold text-slate-600">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, thisMonth: 0, byCategory: {} as Record<string, number> })
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary>({
    submitted: 0,
    reviewed: 0,
    test: 0,
    interview: 0,
    offer: 0,
    hired: 0,
    maxProgress: 0,
    totalCandidates: 0,
    offersSent: 0,
    activeInPipeline: 0,
  })
  const [role, setRole] = useState<string>("job_seeker")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [days, setDays] = useState<DaysFilter>("all")

  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== "all") params.set("category", category)
      if (days !== "all") params.set("days", days)
      const res = await fetch(`/api/history?${params}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries || [])
        setStats(data.stats || { total: 0, thisWeek: 0, thisMonth: 0, byCategory: {} })
        setPipelineSummary(data.pipelineSummary || pipelineSummary)
        setRole(data.role || "job_seeker")
      } else if (!silent) {
        toast({ title: "Failed to load history", variant: "destructive" })
      }
    } catch {
      if (!silent) toast({ title: "Network error", variant: "destructive" })
    } finally {
      if (!silent) setLoading(false)
    }
  }, [category, days, toast])

  useEffect(() => {
    loadHistory()
    const onVisible = () => {
      if (document.visibilityState === "visible") loadHistory(true)
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [loadHistory])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        (e.jobTitle || "").toLowerCase().includes(q) ||
        (e.companyName || "").toLowerCase().includes(q),
    )
  }, [entries, search])

  const grouped = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>()
    for (const e of filtered) {
      const d = new Date(e.createdAt)
      const key = format(startOfDay(d), "yyyy-MM-dd")
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ entries: filtered, stats, pipelineSummary }, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hireai-activity-${format(new Date(), "yyyy-MM-dd")}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Timeline exported" })
  }

  const TABS: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "application", label: "Applications" },
    { id: "test", label: "Tests" },
    { id: "interview", label: "Interviews" },
    { id: "offer", label: "Offers" },
    { id: "profile", label: "Profile" },
    ...(role === "recruiter" ? [{ id: "hiring" as CategoryFilter, label: "Hiring" }] : []),
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/40">
      {/* Hero */}
      <div className="border-b bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-200 text-sm font-medium mb-2">
                <History className="h-4 w-4" />
                Activity & pipeline timeline
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">History</h1>
              <p className="mt-2 text-indigo-100/90 max-w-xl text-sm">
                Every application step, test, interview, and offer — unified and mapped to your hiring pipeline.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={exportJson}
              >
                <Download className="h-4 w-4 mr-1.5" /> Export
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                onClick={() => loadHistory()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total events", value: stats.total },
              { label: "This week", value: stats.thisWeek },
              { label: "This month", value: stats.thisMonth },
              { label: "Categories", value: Object.keys(stats.byCategory).length },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 px-4 py-3"
              >
                <p className="text-xs text-indigo-200 font-medium">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PipelineFunnel summary={pipelineSummary} role={role} />
          </div>
          <WeekActivityChart entries={entries} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border p-3 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex gap-1 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategory(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  category === tab.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                {tab.id !== "all" && stats.byCategory[tab.id] ? (
                  <span className="ml-1 text-xs opacity-80">({stats.byCategory[tab.id]})</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-9"
                placeholder="Search timeline…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={days} onValueChange={(v) => setDays(v as DaysFilter)}>
              <SelectTrigger className="w-[130px] h-9">
                <Calendar className="h-3.5 w-3.5 mr-1 opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <p className="text-sm text-muted-foreground">Building your timeline…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white py-20 text-center">
            <History className="mx-auto h-12 w-12 text-slate-300 mb-4" />
            <h3 className="font-semibold text-lg">No activity yet</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              Apply to jobs, complete tests, and respond to offers — your full pipeline history will appear here.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/dashboard/job-seeker/applications">View applications</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([dayKey, dayEntries]) => (
              <div key={dayKey}>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {groupLabel(new Date(dayKey))}
                </h3>
                <div className="space-y-2">
                  {dayEntries.map((entry) => {
                    const meta = CATEGORY_META[entry.category] || CATEGORY_META.system
                    const stageLabel = PIPELINE_STAGES[entry.pipelineStage]?.label || entry.pipelineLabel

                    return (
                      <div
                        key={entry.id}
                        className="group rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all flex gap-4"
                        style={{ borderLeftWidth: 3, borderLeftColor: meta.color }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${meta.color}18`, color: meta.color }}
                        >
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-slate-900">{entry.title}</p>
                              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                                {entry.details}
                              </p>
                              {entry.jobTitle && (
                                <p className="text-xs text-slate-500 mt-1">
                                  {entry.jobTitle}
                                  {entry.companyName ? ` · ${entry.companyName}` : ""}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 shrink-0">
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-violet-50 text-violet-700 border-violet-200"
                              >
                                Pipeline: {stageLabel}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                {meta.label}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                              · {format(new Date(entry.createdAt), "h:mm a")}
                            </span>
                            {entry.link && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                                <Link href={entry.link}>
                                  Open <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
