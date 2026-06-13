"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { SkillBar } from "@/components/ui/charts"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileSearch,
  GraduationCap,
  Loader2,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Shield,
  User,
  Users,
  XCircle,
  BarChart3,
  History,
  Filter,
  ExternalLink,
} from "lucide-react"
import { PROVIDER_INFO } from "@/lib/background-verification-constants"

type VerificationStatus = "Pending" | "In Progress" | "Completed" | "Failed" | "Cancelled"
type ComponentStatus = "Pending" | "Verified" | "Failed" | "Not Required"

interface VerificationComponent {
  status: ComponentStatus
  notes?: string
}

interface Verification {
  _id: string
  applicationId: string
  candidateId: string
  candidateName?: string
  candidateEmail?: string
  jobTitle?: string
  provider: string
  status: VerificationStatus
  overallResult?: "Clear" | "Consider" | "Adverse" | "Pending"
  riskLevel?: "Low" | "Medium" | "High"
  components: Record<string, VerificationComponent>
  initiatedAt: string
  estimatedCompletion?: string
  completedAt?: string
  reportUrl?: string
  cost?: { amount?: number; currency?: string }
  history?: Array<{ action: string; timestamp: string; details?: unknown }>
  providerReferenceId?: string
}

interface EligibleCandidate {
  _id: string
  candidateName: string
  candidateEmail: string
  jobTitle: string
  status: string
  aiMatchScore: number | null
}

interface Stats {
  total: number
  completed: number
  inProgress: number
  failed: number
  clear: number
  consider: number
  adverse: number
  overdue: number
  avgTurnaround: number
  completionRate: number
  byProvider: Record<string, number>
}

const COMPONENT_META: Record<string, { label: string; icon: React.ReactNode }> = {
  identity: { label: "Identity", icon: <User className="h-4 w-4" /> },
  education: { label: "Education", icon: <GraduationCap className="h-4 w-4" /> },
  employment: { label: "Employment", icon: <Building2 className="h-4 w-4" /> },
  criminal: { label: "Criminal", icon: <FileSearch className="h-4 w-4" /> },
  drug: { label: "Drug Test", icon: <Pill className="h-4 w-4" /> },
  reference: { label: "References", icon: <Users className="h-4 w-4" /> },
}

const CHECK_KEYS = Object.keys(COMPONENT_META)

function progressOf(components: Verification["components"]) {
  const entries = CHECK_KEYS.map(k => components[k]).filter(c => c && c.status !== "Not Required")
  const done = entries.filter(c => c.status !== "Pending").length
  const total = entries.length || 1
  return { done, total, percent: Math.round((done / total) * 100) }
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Completed"
      ? "bg-emerald-100 text-emerald-800"
      : status === "In Progress"
        ? "bg-blue-100 text-blue-800"
        : status === "Failed"
          ? "bg-red-100 text-red-800"
          : status === "Cancelled"
            ? "bg-gray-100 text-gray-600"
            : "bg-amber-100 text-amber-800"
  return <Badge className={cls}>{status}</Badge>
}

function ResultBadge({ result }: { result?: string }) {
  if (!result) return null
  const cls =
    result === "Clear"
      ? "bg-emerald-100 text-emerald-800"
      : result === "Consider"
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800"
  return <Badge className={cls}>{result}</Badge>
}

function ComponentBadge({ status }: { status: ComponentStatus }) {
  const map = {
    Verified: "bg-emerald-100 text-emerald-700",
    Pending: "bg-amber-100 text-amber-700",
    Failed: "bg-red-100 text-red-700",
    "Not Required": "bg-gray-100 text-gray-500",
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status]}`}>{status}</span>
}

export default function BackgroundVerificationPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [candidates, setCandidates] = useState<EligibleCandidate[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [providerFilter, setProviderFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("checks")

  const [showInitiate, setShowInitiate] = useState(false)
  const [provider, setProvider] = useState("Manual")
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set())
  const [checkSelection, setCheckSelection] = useState<Record<string, boolean>>({
    identity: true,
    education: true,
    employment: true,
    criminal: true,
    drug: false,
    reference: false,
  })
  const [initNotes, setInitNotes] = useState("")

  const [detail, setDetail] = useState<Verification | null>(null)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [finalizeResult, setFinalizeResult] = useState("Clear")
  const [finalizeRisk, setFinalizeRisk] = useState("Low")
  const [reportUrl, setReportUrl] = useState("")
  const [componentNotes, setComponentNotes] = useState<Record<string, string>>({})

  const estimatedCost = useMemo(() => {
    const info = PROVIDER_INFO[provider as keyof typeof PROVIDER_INFO]
    const enabled = Object.values(checkSelection).filter(Boolean).length
    return (info?.costUsd ?? 0) * enabled
  }, [provider, checkSelection])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [listRes, statsRes, candRes] = await Promise.all([
        fetch("/api/background-verification", { credentials: "include" }),
        fetch("/api/background-verification/stats", { credentials: "include" }),
        fetch("/api/background-verification/candidates", { credentials: "include" }),
      ])
      if (listRes.ok) {
        const d = await listRes.json()
        setVerifications(d.verifications || [])
      }
      if (statsRes.ok) {
        const d = await statsRes.json()
        setStats(d.stats)
      }
      if (candRes.ok) {
        const d = await candRes.json()
        setCandidates(d.candidates || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const filtered = useMemo(() => {
    return verifications.filter(v => {
      const q = search.trim().toLowerCase()
      const matchQ =
        !q ||
        v.candidateName?.toLowerCase().includes(q) ||
        v.candidateEmail?.toLowerCase().includes(q) ||
        v.jobTitle?.toLowerCase().includes(q) ||
        v.applicationId.toLowerCase().includes(q)
      const matchStatus = statusFilter === "all" || v.status === statusFilter
      const matchProvider = providerFilter === "all" || v.provider === providerFilter
      return matchQ && matchStatus && matchProvider
    })
  }, [verifications, search, statusFilter, providerFilter])

  const overdueList = useMemo(() => {
    const now = Date.now()
    return verifications.filter(
      v =>
        v.status !== "Completed" &&
        v.status !== "Cancelled" &&
        v.estimatedCompletion &&
        new Date(v.estimatedCompletion).getTime() < now,
    )
  }, [verifications])

  const handleInitiate = async () => {
    const ids = selectedCandidateIds.size > 0
      ? Array.from(selectedCandidateIds)
      : []

    if (ids.length === 0) {
      toast({ title: "Select at least one candidate", variant: "destructive" })
      return
    }

    setActionLoading(true)
    try {
      const components = Object.fromEntries(
        CHECK_KEYS.map(k => [k, checkSelection[k] ?? false]),
      )
      const res = await fetch("/api/background-verification", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: ids.length > 1 ? "bulk" : "initiate",
          applicationId: ids.length === 1 ? ids[0] : undefined,
          applicationIds: ids.length > 1 ? ids : undefined,
          provider,
          components,
          notes: initNotes,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Failed", description: data.message, variant: "destructive" })
        return
      }
      toast({
        title: "Verification started",
        description: data.msg || `Initiated for ${ids.length} candidate(s)`,
      })
      setShowInitiate(false)
      setSelectedCandidateIds(new Set())
      setInitNotes("")
      if (data.verifications) setVerifications(data.verifications)
      else loadAll()
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const updateComponent = async (
    verificationId: string,
    component: string,
    status: ComponentStatus,
    notes?: string,
  ) => {
    setActionLoading(true)
    try {
      const res = await fetch("/api/background-verification", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId,
          action: "update-component",
          component,
          status,
          notes,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setVerifications(prev =>
          prev.map(v => (v._id === verificationId ? data.verification : v)),
        )
        if (detail?._id === verificationId) setDetail(data.verification)
        toast({ title: `${COMPONENT_META[component]?.label || component}: ${status}` })
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleFinalize = async () => {
    if (!detail) return
    setActionLoading(true)
    try {
      const res = await fetch("/api/background-verification", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: detail._id,
          action: "finalize",
          overallResult: finalizeResult,
          riskLevel: finalizeRisk,
          reportUrl: reportUrl || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setVerifications(prev =>
          prev.map(v => (v._id === detail._id ? data.verification : v)),
        )
        setDetail(data.verification)
        setFinalizeOpen(false)
        toast({ title: "Verification finalized", description: `Result: ${finalizeResult}` })
        loadAll()
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleExport = () => {
    window.open("/api/background-verification/export", "_blank")
  }

  const toggleCandidate = (id: string) => {
    setSelectedCandidateIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-6 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-blue-600" />
            Background Verification
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            End-to-end candidate screening — identity, employment, criminal, and compliance checks
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadAll} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowInitiate(true)}
          >
            <Plus className="h-4 w-4" /> New Check
          </Button>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueList.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                {overdueList.length} verification{overdueList.length > 1 ? "s" : ""} past estimated deadline
              </p>
              <p className="text-sm text-amber-800 mt-0.5">
                {overdueList.slice(0, 3).map(v => v.candidateName).join(", ")}
                {overdueList.length > 3 ? ` and ${overdueList.length - 3} more` : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats?.total ?? 0, icon: Shield, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "In Progress", value: stats?.inProgress ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Clear", value: stats?.clear ?? 0, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Overdue", value: stats?.overdue ?? 0, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Avg Days", value: stats?.avgTurnaround ?? 0, icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className={`p-4 ${s.bg} rounded-lg flex items-center gap-3`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="checks">Active Checks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="pipeline">Eligible Pipeline ({candidates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search candidate, job, or application ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All providers</SelectItem>
                {Object.keys(PROVIDER_INFO).map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-3">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
                <p className="font-semibold">No verifications found</p>
                <p className="text-sm text-muted-foreground">
                  Start a check from the pipeline tab or click New Check.
                </p>
                <Button onClick={() => setShowInitiate(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> New Check
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(v => {
                const prog = progressOf(v.components)
                const isOverdue =
                  v.status !== "Completed" &&
                  v.estimatedCompletion &&
                  new Date(v.estimatedCompletion).getTime() < Date.now()
                return (
                  <Card
                    key={v._id}
                    className={`hover:shadow-md transition-shadow cursor-pointer border-l-4 ${
                      v.status === "Completed" ? "border-l-emerald-500" :
                      v.status === "Failed" ? "border-l-red-500" :
                      isOverdue ? "border-l-orange-500" : "border-l-blue-500"
                    }`}
                    onClick={() => setDetail(v)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{v.candidateName || "Candidate"}</p>
                            {v.jobTitle && (
                              <span className="text-xs text-muted-foreground">· {v.jobTitle}</span>
                            )}
                            {isOverdue && (
                              <Badge className="bg-orange-100 text-orange-800 text-xs">Overdue</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {v.provider}
                            {v.providerReferenceId && ` · Ref ${v.providerReferenceId}`}
                            · Started {new Date(v.initiatedAt).toLocaleDateString()}
                            {v.estimatedCompletion && (
                              <> · ETA {new Date(v.estimatedCompletion).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ResultBadge result={v.overallResult} />
                          <StatusBadge status={v.status} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{prog.done}/{prog.total} checks</span>
                          <span>{prog.percent}%</span>
                        </div>
                        <SkillBar label="" value={prog.percent} color="#2563eb" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {CHECK_KEYS.map(key => {
                          const comp = v.components[key]
                          if (!comp || comp.status === "Not Required") return null
                          return (
                            <span key={key} className="inline-flex items-center gap-1 text-xs bg-muted/50 px-2 py-0.5 rounded-md">
                              {COMPONENT_META[key].icon}
                              <ComponentBadge status={comp.status} />
                            </span>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Completion Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Completion rate</span>
                  <span className="font-bold">{stats?.completionRate ?? 0}%</span>
                </div>
                <SkillBar label="" value={stats?.completionRate ?? 0} color="#10b981" />
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <div className="font-bold text-emerald-700">{stats?.clear ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Clear</div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-50">
                    <div className="font-bold text-amber-700">{stats?.consider ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Consider</div>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50">
                    <div className="font-bold text-red-700">{stats?.adverse ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Adverse</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Provider Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats?.byProvider || {}).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : (
                  Object.entries(stats?.byProvider || {}).map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span>{name}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eligible candidates</CardTitle>
              <CardDescription>
                Shortlisted / interview-stage applicants without an active background check
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No eligible candidates in your pipeline right now.
                </p>
              ) : (
                candidates.map(c => (
                  <div
                    key={c._id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={selectedCandidateIds.has(c._id)}
                      onCheckedChange={() => toggleCandidate(c._id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{c.candidateName}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.jobTitle} · {c.status}
                        {c.aiMatchScore != null && ` · AI ${c.aiMatchScore}%`}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/recruiter/candidates/${c._id}`}
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      Profile <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))
              )}
              {candidates.length > 0 && (
                <div className="pt-3 flex gap-2">
                  <Button
                    className="gap-2"
                    onClick={() => {
                      setShowInitiate(true)
                      setActiveTab("checks")
                    }}
                    disabled={selectedCandidateIds.size === 0}
                  >
                    <Shield className="h-4 w-4" />
                    Initiate for {selectedCandidateIds.size || 0} selected
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSelectedCandidateIds(new Set(candidates.map(c => c._id)))
                    }
                  >
                    Select all
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Initiate dialog */}
      <Dialog open={showInitiate} onOpenChange={setShowInitiate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Initiate background check</DialogTitle>
            <DialogDescription>
              Select checks and provider. Candidates receive an in-app notification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROVIDER_INFO).map(([p, info]) => (
                    <SelectItem key={p} value={p}>
                      {p} — ~{info.avgDays}d · ${info.costUsd}/check
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {estimatedCost > 0 && (
                <p className="text-xs text-muted-foreground">
                  Estimated cost: <strong>${estimatedCost}</strong> USD
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Verification components</Label>
              <div className="grid grid-cols-2 gap-2">
                {CHECK_KEYS.map(key => (
                  <label
                    key={key}
                    className="flex items-center gap-2 p-2 rounded-md border text-sm cursor-pointer hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={checkSelection[key]}
                      onCheckedChange={checked =>
                        setCheckSelection(prev => ({ ...prev, [key]: Boolean(checked) }))
                      }
                    />
                    {COMPONENT_META[key].icon}
                    {COMPONENT_META[key].label}
                  </label>
                ))}
              </div>
            </div>
            {candidates.length > 0 && (
              <div className="space-y-2">
                <Label>Candidates ({selectedCandidateIds.size} selected)</Label>
                <p className="text-xs text-muted-foreground">
                  Pick from pipeline tab or select below
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
                  {candidates.slice(0, 20).map(c => (
                    <label key={c._id} className="flex items-center gap-2 text-sm py-1">
                      <Checkbox
                        checked={selectedCandidateIds.has(c._id)}
                        onCheckedChange={() => toggleCandidate(c._id)}
                      />
                      <span className="truncate">{c.candidateName} — {c.jobTitle}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Internal notes (optional)</Label>
              <Textarea
                placeholder="Reason for check, compliance notes…"
                value={initNotes}
                onChange={e => setInitNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitiate(false)}>Cancel</Button>
            <Button
              onClick={handleInitiate}
              disabled={actionLoading || selectedCandidateIds.size === 0}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              Start check
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detail !== null} onOpenChange={open => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {detail.candidateName}
                  <StatusBadge status={detail.status} />
                  <ResultBadge result={detail.overallResult} />
                </DialogTitle>
                <DialogDescription>
                  {detail.jobTitle} · {detail.provider}
                  {detail.candidateEmail && ` · ${detail.candidateEmail}`}
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/recruiter/candidates/${detail.applicationId}`}
                  className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
                >
                  View candidate profile <ArrowUpRight className="h-3 w-3" />
                </Link>
                {detail.reportUrl && (
                  <a
                    href={detail.reportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Open report <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Verification components</Label>
                {CHECK_KEYS.map(key => {
                  const comp = detail.components[key]
                  if (!comp) return null
                  if (comp.status === "Not Required") return null
                  return (
                    <div key={key} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          {COMPONENT_META[key].icon}
                          {COMPONENT_META[key].label}
                        </div>
                        <ComponentBadge status={comp.status} />
                      </div>
                      {comp.notes && (
                        <p className="text-xs text-muted-foreground">{comp.notes}</p>
                      )}
                      <Input
                        placeholder="Add notes…"
                        className="h-8 text-xs"
                        value={componentNotes[key] || ""}
                        onChange={e =>
                          setComponentNotes(prev => ({ ...prev, [key]: e.target.value }))
                        }
                      />
                      {comp.status === "Pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            disabled={actionLoading}
                            onClick={() =>
                              updateComponent(
                                detail._id,
                                key,
                                "Verified",
                                componentNotes[key],
                              )
                            }
                          >
                            <CheckCircle2 className="h-3 w-3" /> Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-red-600"
                            disabled={actionLoading}
                            onClick={() =>
                              updateComponent(
                                detail._id,
                                key,
                                "Failed",
                                componentNotes[key],
                              )
                            }
                          >
                            <XCircle className="h-3 w-3" /> Fail
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {detail.history && detail.history.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <History className="h-4 w-4" /> Audit trail
                  </Label>
                  <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                    {detail.history
                      .slice()
                      .reverse()
                      .map((h, i) => (
                        <div key={i} className="px-3 py-2 text-xs">
                          <span className="font-medium">{h.action}</span>
                          <span className="text-muted-foreground ml-2">
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                {detail.status !== "Completed" && (
                  <Button
                    variant="outline"
                    onClick={() => setFinalizeOpen(true)}
                    className="gap-2"
                  >
                    Finalize result
                  </Button>
                )}
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Finalize dialog */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize verification</DialogTitle>
            <DialogDescription>
              Set the official outcome and optional report link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Overall result</Label>
              <Select value={finalizeResult} onValueChange={setFinalizeResult}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clear">Clear</SelectItem>
                  <SelectItem value="Consider">Consider</SelectItem>
                  <SelectItem value="Adverse">Adverse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Risk level</Label>
              <Select value={finalizeRisk} onValueChange={setFinalizeRisk}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Report URL (optional)</Label>
              <Input
                placeholder="https://…"
                value={reportUrl}
                onChange={e => setReportUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeOpen(false)}>Cancel</Button>
            <Button onClick={handleFinalize} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
