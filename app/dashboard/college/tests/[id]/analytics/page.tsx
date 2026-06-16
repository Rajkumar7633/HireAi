"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell, Legend, PieChart, Pie,
} from "recharts"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Users, TrendingUp, Shield, AlertTriangle, CheckCircle, Download, RefreshCw, Clock,
  Loader2, Trophy, Brain, Activity, XCircle, ArrowLeft, Zap, Code2, Target,
  ChevronUp, ChevronDown, ArrowUpDown, Filter, Info, Layers, Timer, TestTube2, Eye,
  type LucideIcon,
} from "lucide-react"
import {
  dedupeByCandidate,
  extractCandidateInfo,
  extractCodeAnswers,
  extractSubmissionLanguage,
} from "@/lib/submission-utils"
import {
  tabSwitchesFromSubmission,
  integrityFromSubmission,
  computeRiskLevel,
  logsFromSubmission,
} from "@/lib/proctor-analytics"
import {
  CodingTestSecurityPanel,
  type SecurityAnalyticsPayload,
} from "@/components/analytics/coding-test-security-panel"

// ─── Types ───────────────────────────────────────────────────────────────────

interface CodingSubmission {
  submissionId: string
  candidateId: string
  name: string
  email: string
  score: number
  completedAt: string
  duration: number
  language: string
  rawAnswers: any[]
  codeSolutions: {
    questionId: string
    language: string
    code: string
    passedTestCases: number
    totalTestCases: number
    score: number
  }[]
  problemResults: {
    problemIndex: number
    passed: number
    total: number
    passRate: number
  }[]
  tabSwitches: number
  integrityScore: number
  securityEventCount: number
  snapshotCount: number
  riskLevel: "low" | "medium" | "high"
  status: "passed" | "failed" | "pending"
  percentileRank: number
}

interface ProblemStat {
  index: number
  title: string
  difficulty: string
  avgPassRate: number
  submissionCount: number
  fullPassCount: number
}

interface TestAnalytics {
  testId: string
  title: string
  durationMinutes: number
  passingScore: number
  totalAssigned: number
  completedCount: number
  inProgressCount: number
  notStartedCount: number
  completionRate: number
  averageScore: number
  medianScore: number
  passRate: number
  averageTime: number
  scoreDistribution: { range: string; count: number; percentage: number }[]
  languageDistribution: { language: string; count: number; percentage: number }[]
  problemStats: ProblemStat[]
  submissions: CodingSubmission[]
  topPerformers: CodingSubmission[]
  timeDistribution: { bucket: string; count: number; avgScore: number }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#f97316"]
const AUTO_REFRESH_MS = 10_000

const DIFF_BADGE: Record<string, string> = {
  Easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Hard: "bg-rose-50 text-rose-700 border-rose-200",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(s: number) {
  if (!s) return "—"
  const m = Math.floor(s / 60), sec = s % 60
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`
}

function fmtDate(iso: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function scoreCol(v: number) {
  return v >= 70 ? "#10b981" : v >= 50 ? "#f59e0b" : "#ef4444"
}

function exportCSV(rows: CodingSubmission[], title: string) {
  const headers = ["Name", "Email", "Score(%)", "Status", "Language", "Duration(min)", "TabSwitches", "CompletedAt"]
  const data = rows.map(c => [c.name, c.email, c.score, c.status.toUpperCase(), c.language, Math.round(c.duration / 60), c.tabSwitches, c.completedAt ? new Date(c.completedAt).toLocaleString() : "—"])
  const csv = [headers, ...data].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
  const a = document.createElement("a")
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
  a.download = `${title}_coding_results.csv`
  a.click()
}

function normalizeSubmissionList(value: unknown): any[] {
  if (Array.isArray(value)) return value
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>
    if (Array.isArray(obj.submissions)) return obj.submissions
    if (Array.isArray(obj.candidateResults)) return obj.candidateResults
  }
  return []
}

/** Fallback rows when /submissions fails but /invite has assigned candidates */
function submissionsFromInviteAssigned(assigned: any[]): any[] {
  return assigned.map(a => ({
    _id: a._id,
    candidateId: {
      _id: a.jobSeekerId,
      name: a.candidateName || "Candidate",
      email: a.candidateEmail || "",
    },
    applicationId: a._id,
    percentage: a.testScore ?? undefined,
    score: a.testScore ?? undefined,
    submittedAt: a.testCompletedAt || a.testAssignedAt,
    status: a.testScore != null ? "completed" : "assigned",
  }))
}

function mapSubmission(s: any, i: number, passingScore: number, maxTabSwitches = 2): CodingSubmission {
  const { name, email, id } = extractCandidateInfo(s)
  const hasScore = s.score != null || s.percentage != null
  const score = hasScore ? (s.score ?? s.percentage ?? 0) : 0
  const isCompleted = s.status === "completed" || hasScore
  const lang = extractSubmissionLanguage(s)
  const rawAnswers = s.answers || []
  const codeSolutions = extractCodeAnswers(s)
  const problemResults = rawAnswers.length > 0
    ? rawAnswers.map((a: any, idx: number) => {
        const passed = a.passedTestCases ?? 0
        const total = a.totalTestCases ?? 0
        return {
          problemIndex: idx,
          passed,
          total,
          passRate: total > 0 ? Math.round((passed / total) * 100) : (a.score > 0 ? 100 : 0),
        }
      })
    : (s.problemResults || [])

  const tabSwitches = tabSwitchesFromSubmission(s)
  const logs = logsFromSubmission(s)
  const integrityScore = integrityFromSubmission(s, maxTabSwitches)
  const counts = {
    face: logs.filter(l => ["no_face", "multi_face", "off_screen", "camera_blocked"].includes(l.type)).length,
    audio: logs.filter(l => l.type === "audio_noise").length,
    object: logs.filter(l => ["phone_detected", "book_detected", "suspicious_device", "extra_person"].includes(l.type)).length,
    tab: tabSwitches,
    clipboard: logs.filter(l => ["copy_paste", "context_menu"].includes(l.type)).length,
    fullscreen: logs.filter(l => l.type === "fullscreen_exit").length,
    motion: logs.filter(l => l.type === "movement").length,
    snapshots: logs.filter(l => l.type === "periodic_snapshot").length,
    terminated: logs.filter(l => l.type === "test_terminated").length,
  }
  const riskLevel = computeRiskLevel({
    integrityScore,
    tabSwitches,
    counts,
    flags: s.integrityAudit?.flags || logs.map(l => l.type),
  })

  return {
    submissionId: s._id?.toString() || `sub-${i}`,
    candidateId: id || s._id?.toString() || `c${i}`,
    name,
    email,
    score,
    completedAt: s.completedAt || s.submittedAt || "",
    duration: s.duration || s.timeTaken || 0,
    language: lang || "—",
    rawAnswers,
    codeSolutions,
    problemResults,
    tabSwitches,
    integrityScore,
    securityEventCount: logs.length,
    snapshotCount: counts.snapshots,
    riskLevel,
    status: !isCompleted ? "pending" : score >= passingScore ? "passed" : "failed",
    percentileRank: 0,
  }
}

// Generate analytics from API data
function buildAnalytics(raw: any, testId: string): TestAnalytics {
  const passingScore = raw.passingScore || 70
  const maxTabSwitches = raw.settings?.maxTabSwitches ?? 2
  const submissions: CodingSubmission[] = normalizeSubmissionList(
    raw?.submissions ?? raw?.candidateResults ?? raw,
  ).map((s: any, i: number) => mapSubmission(s, i, passingScore, maxTabSwitches))

  // Compute percentile ranks (scored submissions only)
  const scoredSubmissions = submissions.filter(s => s.status !== "pending")
  const scoreValues = scoredSubmissions.map(s => s.score).sort((a, b) => a - b)
  submissions.forEach(s => {
    const rank = scoreValues.filter(sc => sc < s.score).length
    s.percentileRank = scoreValues.length > 1
      ? Math.round((rank / (scoreValues.length - 1)) * 100)
      : 100
  })

  const submissionCount = scoredSubmissions.length
  const completedCount = submissionCount > 0
    ? submissionCount
    : (raw.completedCount || raw.totalAttempts || 0)
  const totalAssigned = Math.max(
    raw.totalAssigned || raw.assignedCount || 0,
    submissions.length,
  )
  const passed = scoredSubmissions.filter(s => s.status === "passed").length
  const avgScore = submissionCount > 0
    ? Math.round(scoredSubmissions.reduce((a, b) => a + b.score, 0) / submissionCount)
    : 0
  const medianScore = scoreValues.length > 0
    ? scoreValues[Math.floor(scoreValues.length / 2)]
    : 0

  // Score distribution
  const scoreBuckets = ["0–20%", "21–40%", "41–60%", "61–80%", "81–100%"]
  const scoreDistribution = scoreBuckets.map(range => {
    const [lo, hi] = range.replace("%", "").split("–").map(Number)
    const count = scoredSubmissions.filter(s => s.score >= lo && s.score <= hi).length
    return { range, count, percentage: submissionCount > 0 ? Math.round((count / submissionCount) * 100) : 0 }
  })

  // Language distribution
  const langMap: Record<string, number> = {}
  submissions.forEach(s => {
    if (s.language && s.language !== "—") {
      langMap[s.language] = (langMap[s.language] || 0) + 1
    }
  })
  const languageDistribution = Object.entries(langMap).map(([language, count]) => ({
    language, count, percentage: submissionCount > 0 ? Math.round((count / submissionCount) * 100) : 0,
  })).sort((a, b) => b.count - a.count)

  // Problem stats from raw questions
  const problems = raw.questions || raw.problems || []
  const problemStats: ProblemStat[] = problems.map((q: any, idx: number) => {
    const prResults = submissions.flatMap(s => s.problemResults.filter(pr => pr.problemIndex === idx))
    const avgPassRate = prResults.length > 0 ? Math.round(prResults.reduce((a, b) => a + b.passRate, 0) / prResults.length) : 0
    const fullPass = prResults.filter(pr => pr.passRate >= 100).length
    return {
      index: idx + 1,
      title: q.questionText ? q.questionText.slice(0, 50) + (q.questionText.length > 50 ? "…" : "") : `Problem ${idx + 1}`,
      difficulty: q.difficulty || "Medium",
      avgPassRate,
      submissionCount: prResults.length,
      fullPassCount: fullPass,
    }
  })

  // Top performers
  const topPerformers = [...submissions].sort((a, b) => b.score - a.score).slice(0, 5)

  // Time distribution
  const timeBuckets = ["0–15m", "16–30m", "31–45m", "46–60m", "60m+"]
  const timeDistribution = timeBuckets.map(bucket => {
    let lo = 0, hi = Infinity
    if (bucket === "0–15m") { lo = 0; hi = 900 }
    else if (bucket === "16–30m") { lo = 901; hi = 1800 }
    else if (bucket === "31–45m") { lo = 1801; hi = 2700 }
    else if (bucket === "46–60m") { lo = 2701; hi = 3600 }
    else { lo = 3601 }
    const inBucket = submissions.filter(s => s.duration >= lo && s.duration <= hi)
    const avgScore = inBucket.length > 0 ? Math.round(inBucket.reduce((a, b) => a + b.score, 0) / inBucket.length) : 0
    return { bucket, count: inBucket.length, avgScore }
  })

  const apiAvgScore = raw.averageScore ?? avgScore
  const apiPassRate = raw.passRate ?? (completedCount > 0 ? Math.round((passed / completedCount) * 100) : 0)

  return {
    testId,
    title: raw.title || "Coding Test",
    durationMinutes: raw.durationMinutes || 90,
    passingScore: raw.passingScore || 70,
    totalAssigned,
    completedCount,
    inProgressCount: raw.inProgressCount || 0,
    notStartedCount: Math.max(0, totalAssigned - completedCount - (raw.inProgressCount || 0)),
    completionRate: totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0,
    averageScore: submissionCount > 0 ? avgScore : apiAvgScore,
    medianScore: submissionCount > 0 ? medianScore : apiAvgScore,
    passRate: submissionCount > 0 ? Math.round((passed / submissionCount) * 100) : apiPassRate,
    averageTime: submissionCount > 0
      ? Math.round(scoredSubmissions.reduce((a, b) => a + b.duration, 0) / submissionCount)
      : 0,
    scoreDistribution,
    languageDistribution,
    problemStats,
    submissions,
    topPerformers,
    timeDistribution,
  }
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = "purple", trend }: {
  label: string; value: string | number; sub?: string
  icon: LucideIcon; color?: string; trend?: "up" | "down"
}) {
  const colors: Record<string, string> = {
    purple: "bg-purple-50 text-purple-600", blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600",
    red: "bg-rose-50 text-rose-600",
  }
  return (
    <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === "up" ? "text-emerald-600" : "text-rose-500"}`}>
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CodingTestAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const testId = (params?.id ?? "") as string

  const [analytics, setAnalytics] = useState<TestAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [sortField, setSortField] = useState<keyof CodingSubmission>("score")
  const [sortAsc, setSortAsc] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "passed" | "failed" | "pending">("all")
  const [selectedSubmission, setSelectedSubmission] = useState<CodingSubmission | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [securityData, setSecurityData] = useState<SecurityAnalyticsPayload | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const [countdown, setCountdown] = useState(AUTO_REFRESH_MS / 1000)

  const fetchAnalytics = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const fetchOpts: RequestInit = { cache: "no-store", credentials: "include" }
      const [analyticsRes, testRes, subRes, inviteRes, securityRes] = await Promise.all([
        fetch(`/api/college/tests/${testId}/analytics`, fetchOpts).catch(() => null),
        fetch(`/api/college/tests/${testId}`, fetchOpts).catch(() => null),
        fetch(`/api/college/tests/${testId}/submissions`, fetchOpts).catch(() => null),
        fetch(`/api/college/tests/${testId}/assignments`, fetchOpts).catch(() => null),
        fetch(`/api/college/tests/${testId}/security`, fetchOpts).catch(() => null),
      ])

      const analyticsData = analyticsRes?.ok ? await analyticsRes.json().catch(() => ({})) : {}
      const testData = testRes?.ok ? await testRes.json().catch(() => ({})) : {}
      const subPayload = subRes?.ok ? await subRes.json().catch(() => []) : []
      const inviteData = inviteRes?.ok ? await inviteRes.json().catch(() => ({})) : {}
      const securityPayload = securityRes?.ok ? await securityRes.json().catch(() => null) : null
      const totalAssignedHeader = subRes?.headers?.get("X-Total-Assigned")
      const assignedFromInvite = Array.isArray(inviteData.assigned) ? inviteData.assigned : []
      const testObj = testData?.test || testData

      let submissionList = dedupeByCandidate(normalizeSubmissionList(subPayload))
      const inviteRows = assignedFromInvite.length > 0
        ? submissionsFromInviteAssigned(assignedFromInvite)
        : []
      if (submissionList.length === 0 && inviteRows.length > 0) {
        submissionList = inviteRows
      } else if (inviteRows.length > 0) {
        submissionList = dedupeByCandidate([...submissionList, ...inviteRows])
      }

      const dedupedInviteCount = inviteRows.length > 0
        ? dedupeByCandidate(inviteRows).length
        : assignedFromInvite.length

      const raw = {
        ...testObj,
        ...analyticsData,
        passingScore: testObj?.passingScore ?? analyticsData?.passingScore ?? 70,
        durationMinutes: testObj?.durationMinutes ?? testObj?.timeLimit ?? analyticsData?.durationMinutes ?? 90,
        title: testObj?.title ?? analyticsData?.title ?? "Coding Test",
        totalAssigned: Math.max(
          totalAssignedHeader ? Number(totalAssignedHeader) : 0,
          analyticsData?.totalAssigned ?? 0,
          dedupedInviteCount,
          submissionList.length,
        ),
        completedCount: analyticsData?.completedCount ?? analyticsData?.totalAttempts ?? 0,
        submissions: submissionList,
        settings: testObj?.settings || securityPayload?.settings || {},
      }

      setSecurityData(securityPayload)
      setAnalytics(buildAnalytics(raw, testId))
      setLastRefreshed(new Date())
    } catch (e: any) {
      setError(e.message || "Failed to load analytics")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [testId])

  useEffect(() => {
    fetchAnalytics()
    timerRef.current = setInterval(() => {
      fetchAnalytics(true)
      setCountdown(AUTO_REFRESH_MS / 1000)
    }, AUTO_REFRESH_MS)
    // countdown ticker
    const ticker = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      clearInterval(ticker)
    }
  }, [fetchAnalytics])

  if (loading) {
    return (
      <div className="dashboard-loading bg-gray-50">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
          <p className="text-sm text-gray-500">Loading analytics…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-loading bg-gray-50">
        <Card className="max-w-sm w-full border-red-200">
          <CardContent className="p-6 text-center space-y-3">
            <XCircle className="h-10 w-10 text-red-400 mx-auto" />
            <p className="text-sm font-medium text-gray-700">{error}</p>
            <Button size="sm" onClick={() => fetchAnalytics()} className="bg-purple-600 hover:bg-purple-700 text-white">Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!analytics) return null

  const a = analytics

  // Sorted/filtered candidates
  const filtered = a.submissions.filter(c =>
    statusFilter === "all" || c.status === statusFilter,
  )
  const sorted = [...filtered].sort((x, y) => {
    const va = x[sortField] as any, vb = y[sortField] as any
    return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
  })

  const toggleSort = (f: keyof CodingSubmission) => {
    if (sortField === f) setSortAsc(!sortAsc)
    else { setSortField(f); setSortAsc(false) }
  }

  const openSubmissionDetail = async (c: CodingSubmission) => {
    setSelectedSubmission(c)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/college/tests/${testId}/submissions/${c.submissionId}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setSelectedSubmission(mapSubmission(data, 0, a.passingScore, securityData?.settings?.maxTabSwitches ?? 2))
      }
    } catch {
      /* keep list data */
    } finally {
      setDetailLoading(false)
    }
  }

  const SortBtn = ({ field, label }: { field: keyof CodingSubmission; label: string }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-purple-600 transition-colors">
      {label}
      {sortField === field ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  )

  return (
    <div className="w-full bg-gray-50">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="dashboard-subheader">
        <div className="w-full px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-500 hover:text-gray-900" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />Back
            </Button>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                <Code2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-tight">{a.title}</h1>
                <p className="text-[10px] text-gray-400">Test Analytics · Live · per-test board</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 text-gray-600">
              <Users className="h-3 w-3" />{a.totalAssigned} assigned
            </span>
            <span className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full px-3 py-1 text-purple-700">
              <CheckCircle className="h-3 w-3" />{a.completedCount} completed
            </span>
            <span className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-emerald-700">
              <Trophy className="h-3 w-3" />{a.passRate}% pass rate
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Live pulse indicator */}
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              LIVE · refresh in {countdown}s
            </span>
            {lastRefreshed && (
              <span className="text-[10px] text-gray-400 hidden sm:block">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => fetchAnalytics(true)} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <Link href={`/dashboard/college/tests/${testId}/edit`}>Edit</Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <Link href={`/dashboard/college/tests/${testId}/preview`}>
                <Eye className="h-3.5 w-3.5" />Preview
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportCSV(a.submissions, a.title)}>
              <Download className="h-3.5 w-3.5" />Export CSV
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => router.push("/dashboard/college/assign-tests")}>
              <Users className="h-3.5 w-3.5" />Assign to Students
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-6 space-y-6">

        {/* ── KPI ROW ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Assigned" value={a.totalAssigned} sub="total candidates" icon={Users} color="purple" />
          <StatCard label="Completed" value={a.completedCount}
            sub={`${a.completionRate}% completion rate`} icon={CheckCircle} color="green" />
          <StatCard label="Avg Score" value={`${a.averageScore}%`}
            sub={`Median ${a.medianScore}%`} icon={TrendingUp} color="blue" />
          <StatCard label="Pass Rate" value={`${a.passRate}%`}
            sub={`≥${a.passingScore}% to pass`} icon={Trophy} color="amber" />
          <StatCard label="Avg Time" value={fmt(a.averageTime)}
            sub={`${a.durationMinutes}m limit`} icon={Clock} color="red" />
        </div>

        {/* ── COMPLETION FUNNEL ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />Completion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Assigned", val: a.totalAssigned, color: "bg-purple-200", pct: 100 },
                { label: "Completed", val: a.completedCount, color: "bg-purple-500", pct: a.completionRate },
                { label: "Passed", val: Math.round(a.completedCount * a.passRate / 100), color: "bg-emerald-500", pct: a.passRate },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{item.label}</span>
                    <span className="font-bold text-gray-900">{item.val} <span className="text-gray-400 font-normal">({item.pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-500" />Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={a.scoreDistribution} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                    {a.scoreDistribution.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Code2 className="h-4 w-4 text-green-500" />Language Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {a.languageDistribution.length > 0 ? (
                <div className="space-y-2.5">
                  {a.languageDistribution.slice(0, 6).map((lang, i) => (
                    <div key={lang.language} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-20 capitalize">{lang.language}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${lang.percentage}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-8 text-right">{lang.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Code2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No submissions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── TABS ──────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="overview">
          <TabsList className="bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
            {[
              { value: "overview", label: "Overview", icon: <Activity className="h-3.5 w-3.5" /> },
              { value: "problems", label: "Problems", icon: <Code2 className="h-3.5 w-3.5" /> },
              { value: "candidates", label: "Candidates", icon: <Users className="h-3.5 w-3.5" /> },
              { value: "leaderboard", label: "Leaderboard", icon: <Trophy className="h-3.5 w-3.5" /> },
              { value: "security", label: "Security", icon: <Shield className="h-3.5 w-3.5" /> },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="flex items-center gap-1.5 text-xs data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-lg px-3 py-1.5">
                {t.icon}{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Score vs Time */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Timer className="h-4 w-4 text-purple-500" />Score by Completion Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={a.timeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="avgScore" name="Avg Score %" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="count" name="Candidates" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Quick stats */}
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-amber-500" />Performance Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Average Score", value: `${a.averageScore}%`, color: scoreCol(a.averageScore) },
                    { label: "Median Score", value: `${a.medianScore}%`, color: scoreCol(a.medianScore) },
                    { label: "Pass Rate", value: `${a.passRate}%`, color: a.passRate >= 70 ? "#10b981" : "#f59e0b" },
                    { label: "Completion Rate", value: `${a.completionRate}%`, color: a.completionRate >= 80 ? "#10b981" : "#f59e0b" },
                    { label: "Avg Duration", value: fmt(a.averageTime), color: "#7c3aed" },
                  ].map(stat => (
                    <div key={stat.label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <span className="text-xs text-gray-600">{stat.label}</span>
                      <span className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Insights */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      severity: a.passRate >= 70 ? "success" : "warning",
                      title: a.passRate >= 70 ? "Good pass rate" : "Low pass rate",
                      desc: a.passRate >= 70
                        ? `${a.passRate}% of candidates passed — consider increasing difficulty for future rounds.`
                        : `Only ${a.passRate}% passed. Consider simplifying problems or extending the time limit.`,
                    },
                    {
                      severity: a.completionRate >= 80 ? "success" : "warning",
                      title: a.completionRate >= 80 ? "Strong completion" : "High drop-off",
                      desc: a.completionRate >= 80
                        ? "Most candidates completed the test — good engagement."
                        : `${100 - a.completionRate}% didn't complete. Test may be too long or difficult.`,
                    },
                    {
                      severity: "info",
                      title: "Most popular language",
                      desc: a.languageDistribution[0]
                        ? `${a.languageDistribution[0].language} used by ${a.languageDistribution[0].percentage}% of candidates.`
                        : "No language data available yet.",
                    },
                    {
                      severity: a.averageScore >= 70 ? "success" : "info",
                      title: "Score trend",
                      desc: `Average score is ${a.averageScore}% with a median of ${a.medianScore}%.${Math.abs(a.averageScore - a.medianScore) > 15 ? " High skew detected — review outliers." : ""}`,
                    },
                  ].map((ins, i) => {
                    const sev = ins.severity as any
                    const colors: Record<string, { bg: string; border: string; text: string; icon: LucideIcon }> = {
                      success: { bg: "bg-emerald-50", border: "border-l-emerald-500", text: "text-emerald-800", icon: CheckCircle },
                      warning: { bg: "bg-amber-50", border: "border-l-amber-500", text: "text-amber-800", icon: AlertTriangle },
                      info: { bg: "bg-blue-50", border: "border-l-blue-500", text: "text-blue-800", icon: Info },
                      error: { bg: "bg-rose-50", border: "border-l-rose-500", text: "text-rose-800", icon: XCircle },
                    }
                    const cfg = colors[sev] || colors.info
                    const IcoCmp = cfg.icon
                    return (
                      <div key={i} className={`${cfg.bg} border-l-4 ${cfg.border} rounded-r-lg p-3`}>
                        <div className="flex items-start gap-2">
                          <IcoCmp className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.text}`} />
                          <div>
                            <p className={`text-xs font-semibold ${cfg.text}`}>{ins.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{ins.desc}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PROBLEMS TAB ──────────────────────────────────────────────────── */}
          <TabsContent value="problems" className="mt-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-purple-500" />Problem Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {a.problemStats.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <TestTube2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No problem data yet</p>
                    <p className="text-xs mt-1">Problem analytics will appear once candidates submit</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Chart */}
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={a.problemStats.map(p => ({ name: `P${p.index}`, passRate: p.avgPassRate, submissions: p.submissionCount }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                        <Tooltip content={<ChartTip />} />
                        <Bar dataKey="passRate" name="Avg Pass Rate %" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            {["#", "Problem", "Difficulty", "Avg Pass Rate", "Full Solves", "Submissions"].map(h => (
                              <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {a.problemStats.map((p, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 font-bold text-gray-500">P{p.index}</td>
                              <td className="px-4 py-3 font-medium text-gray-800 max-w-xs">{p.title}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${DIFF_BADGE[p.difficulty] || DIFF_BADGE.Medium}`}>{p.difficulty}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${p.avgPassRate}%`, backgroundColor: p.avgPassRate >= 70 ? "#10b981" : p.avgPassRate >= 40 ? "#f59e0b" : "#ef4444" }} />
                                  </div>
                                  <span className="font-semibold" style={{ color: scoreCol(p.avgPassRate) }}>{p.avgPassRate}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-emerald-600 font-semibold">{p.fullPassCount}</td>
                              <td className="px-4 py-3 text-gray-600">{p.submissionCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CANDIDATES TAB ────────────────────────────────────────────────── */}
          <TabsContent value="candidates" className="mt-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  All Submissions
                  <Badge variant="secondary" className="text-xs ml-1">{a.submissions.length}</Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  {(["all", "passed", "failed", "pending"] as const).map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all font-medium capitalize ${statusFilter === f ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {sorted.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No submissions yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Candidate</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600"><SortBtn field="score" label="Score" /></th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Language</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600"><SortBtn field="duration" label="Duration" /></th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Percentile</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Completed</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-600">Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((c, i) => (
                          <tr key={c.submissionId || c.candidateId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-[10px]">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-800">{c.name}</p>
                                  <p className="text-gray-400">{c.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${c.score}%`, backgroundColor: scoreCol(c.score) }} />
                                </div>
                                <span className="font-bold" style={{ color: scoreCol(c.score) }}>{c.score}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.status === "passed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                                {c.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 capitalize text-gray-600">{c.language === "—" ? <span className="text-gray-400">—</span> : c.language}</td>
                            <td className="px-4 py-3 text-gray-600">{fmt(c.duration)}</td>
                            <td className="px-4 py-3">
                              <span className="text-purple-600 font-semibold">P{c.percentileRank}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-400">{fmtDate(c.completedAt)}</td>
                            <td className="px-4 py-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => openSubmissionDetail(c)}
                              >
                                <Eye className="h-3 w-3" /> View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── LEADERBOARD TAB ───────────────────────────────────────────────── */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {a.topPerformers.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {a.topPerformers.map((c, i) => (
                      <div key={c.candidateId} className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-sm ${i === 0 ? "bg-amber-50 border-amber-200" : i === 1 ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-gray-300 text-gray-700" : i === 2 ? "bg-orange-300 text-white" : "bg-gray-100 text-gray-500"}`}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400 truncate">{c.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold" style={{ color: scoreCol(c.score) }}>{c.score}%</p>
                          <p className="text-xs text-gray-400">{fmt(c.duration)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-medium text-purple-600 capitalize">{c.language}</p>
                          <p className="text-xs text-gray-400">P{c.percentileRank} percentile</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SECURITY TAB ──────────────────────────────────────────────────── */}
          <TabsContent value="security" className="mt-4 space-y-4">
            <CodingTestSecurityPanel data={securityData} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Candidate code review */}
      <Dialog open={!!selectedSubmission} onOpenChange={open => { if (!open) setSelectedSubmission(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-purple-600" />
              {selectedSubmission?.name}&apos;s Submission
            </DialogTitle>
            <DialogDescription>
              {selectedSubmission?.email} · Score {selectedSubmission?.score}% ·{" "}
              {selectedSubmission?.language !== "—" ? (
                <span className="capitalize font-medium text-gray-700">{selectedSubmission?.language}</span>
              ) : (
                "Language not recorded"
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-4 mt-2">
              {detailLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading submission details…
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-xs text-gray-500 mb-1">Score</p>
                  <p className="text-xl font-bold" style={{ color: scoreCol(selectedSubmission.score) }}>
                    {selectedSubmission.score}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-xs text-gray-500 mb-1">Language</p>
                  <p className="text-xl font-bold capitalize text-gray-800">
                    {selectedSubmission.language === "—" ? "—" : selectedSubmission.language}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <p className="text-xs text-gray-500 mb-1">Submitted</p>
                  <p className="text-sm font-medium text-gray-800">{fmtDate(selectedSubmission.completedAt)}</p>
                </div>
              </div>

              {selectedSubmission.codeSolutions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500">
                  <Code2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No code saved for this submission</p>
                  <p className="text-xs mt-1">Older submissions may not include source code. Re-submit after the latest update to capture it.</p>
                </div>
              ) : (
                selectedSubmission.codeSolutions.map((sol, idx) => (
                  <div key={sol.questionId || idx} className="rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                      <span className="text-xs font-semibold text-gray-700">
                        Problem {idx + 1}
                        {sol.totalTestCases > 0 && (
                          <span className="ml-2 font-normal text-gray-500">
                            · {sol.passedTestCases}/{sol.totalTestCases} test cases passed
                          </span>
                        )}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">{sol.language}</Badge>
                    </div>
                    <pre className="p-4 text-xs leading-relaxed overflow-x-auto bg-[#0d1117] text-[#e6edf3] font-mono max-h-80">
                      {sol.code || "// No code submitted"}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

