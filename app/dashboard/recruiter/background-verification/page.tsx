"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { SkillBar } from "@/components/ui/charts"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, Shield, CheckCircle2, AlertCircle, Clock, XCircle,
  Plus, ChevronDown, ChevronUp, RefreshCw, User, Search,
  Building2, GraduationCap, FileSearch, AlertTriangle,
} from "lucide-react"

type VerificationStatus = "Pending" | "In Progress" | "Completed" | "Failed"
type ComponentStatus = "Pending" | "Verified" | "Failed" | "Not Required"

interface VerificationComponent {
  status: ComponentStatus
  notes?: string
}

interface Verification {
  _id: string
  applicationId: string
  candidateName?: string
  jobTitle?: string
  provider: string
  status: VerificationStatus
  overallResult?: "Clear" | "Consider" | "Adverse"
  components: {
    identity: VerificationComponent
    education: VerificationComponent
    employment: VerificationComponent
    criminal: VerificationComponent
  }
  initiatedAt: string
  estimatedCompletion?: string
  completedAt?: string
}

const PROVIDER_INFO: Record<string, { description: string; avgDays: number }> = {
  Manual:    { description: "Handled by your internal team", avgDays: 7 },
  Checkr:    { description: "Automated US background checks", avgDays: 2 },
  Hireright: { description: "Global enterprise screening", avgDays: 3 },
  Sterling:  { description: "Compliance-first screening", avgDays: 3 },
  GoodHire:  { description: "Simple SMB background checks", avgDays: 2 },
}

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
  identity:   <User className="h-4 w-4" />,
  education:  <GraduationCap className="h-4 w-4" />,
  employment: <Building2 className="h-4 w-4" />,
  criminal:   <FileSearch className="h-4 w-4" />,
}

function ComponentBadge({ status }: { status: ComponentStatus }) {
  const cfg = {
    Verified:     { bg: "bg-green-100", text: "text-green-700", icon: <CheckCircle2 className="h-3 w-3" /> },
    Pending:      { bg: "bg-amber-100", text: "text-amber-700", icon: <Clock className="h-3 w-3" /> },
    Failed:       { bg: "bg-red-100",   text: "text-red-700",   icon: <XCircle className="h-3 w-3" /> },
    "Not Required": { bg: "bg-gray-100", text: "text-gray-500", icon: <span className="h-3 w-3 inline-block rounded-full bg-gray-300" /> },
  }[status] || { bg: "bg-gray-100", text: "text-gray-500", icon: null }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.icon} {status}
    </span>
  )
}

function OverallBadge({ result }: { result?: string }) {
  if (!result) return null
  const cfg = {
    Clear:    "bg-green-100 text-green-800",
    Consider: "bg-amber-100 text-amber-800",
    Adverse:  "bg-red-100 text-red-800",
  }[result] || "bg-gray-100 text-gray-600"
  return <Badge className={`${cfg} text-xs`}>{result}</Badge>
}

function VerificationProgress({ components }: { components: Verification["components"] }) {
  const entries = Object.values(components)
  const done = entries.filter(c => c.status !== "Pending").length
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{done}/{entries.length} checks complete</span>
        <span>{Math.round((done / entries.length) * 100)}%</span>
      </div>
      <SkillBar label="" value={(done / entries.length) * 100} color="#16a34a" />
    </div>
  )
}

function VerificationCard({
  v,
  onUpdate,
  loading,
}: {
  v: Verification
  onUpdate: (id: string, component: string, status: ComponentStatus) => void
  loading: boolean
}) {
  const [expanded, setExpanded] = useState(false)

  const statusColor =
    v.status === "Completed" ? "border-l-green-500" :
    v.status === "Failed"    ? "border-l-red-500"   :
    v.status === "In Progress" ? "border-l-blue-500" :
    "border-l-amber-400"

  return (
    <Card className={`border-l-4 ${statusColor}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{v.candidateName || "Candidate"}</p>
              {v.jobTitle && <span className="text-xs text-muted-foreground">· {v.jobTitle}</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: <code className="font-mono">{v.applicationId.slice(0, 12)}…</code>
              · {v.provider} · Started {new Date(v.initiatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <OverallBadge result={v.overallResult} />
            <Badge className={
              v.status === "Completed"   ? "bg-green-100 text-green-700" :
              v.status === "In Progress" ? "bg-blue-100 text-blue-700"   :
              v.status === "Failed"      ? "bg-red-100 text-red-700"     :
              "bg-amber-100 text-amber-700"
            }>{v.status}</Badge>
          </div>
        </div>

        <VerificationProgress components={v.components} />

        <button
          className="flex items-center gap-1 text-xs text-primary hover:underline"
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide" : "View"} components
        </button>

        {expanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {(Object.entries(v.components) as [string, VerificationComponent][]).map(([key, comp]) => (
              <div key={key} className="flex items-center justify-between border rounded-lg p-2.5 bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{COMPONENT_ICONS[key]}</span>
                  <span className="text-xs font-medium capitalize">{key}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ComponentBadge status={comp.status} />
                  {comp.status === "Pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs px-2"
                      disabled={loading}
                      onClick={() => onUpdate(v._id, key, "Verified")}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function BackgroundVerificationPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [applicationId, setApplicationId] = useState("")
  const [provider, setProvider] = useState("Manual")
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState("")
  const [verifications, setVerifications] = useState<Verification[]>([])

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/background-verification")
      if (res.ok) {
        const data = await res.json()
        setVerifications(data.verifications || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInitiate = async () => {
    if (!applicationId.trim()) {
      toast({ title: "Application ID required", variant: "destructive" })
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch("/api/background-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initiate", applicationId, provider,
          components: { identity: true, education: true, employment: true, criminal: true },
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Verification initiated!", description: `${provider} will process within ${PROVIDER_INFO[provider]?.avgDays ?? 5} business days.` })
        setApplicationId("")
        setShowForm(false)
        if (data.verification) setVerifications(prev => [data.verification, ...prev])
        else fetchAll()
      } else {
        toast({ title: "Failed", description: data.message || "Could not initiate.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateComponent = async (verificationId: string, component: string, status: ComponentStatus) => {
    setActionLoading(true)
    try {
      const res = await fetch("/api/background-verification", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationId, action: "update-component", component, status }),
      })
      const data = await res.json()
      if (data.success) {
        setVerifications(prev => prev.map(v => v._id === verificationId ? data.verification : v))
        toast({ title: `${component} marked as ${status}` })
      }
    } catch {
      toast({ title: "Update failed", variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const stats = {
    total:     verifications.length,
    completed: verifications.filter(v => v.status === "Completed").length,
    pending:   verifications.filter(v => v.status === "Pending" || v.status === "In Progress").length,
    failed:    verifications.filter(v => v.status === "Failed").length,
  }

  const filtered = verifications.filter(v =>
    !search.trim() ||
    v.applicationId.toLowerCase().includes(search.toLowerCase()) ||
    v.candidateName?.toLowerCase().includes(search.toLowerCase()) ||
    v.jobTitle?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" /> Background Verification
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track and manage candidate background checks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowForm(f => !f)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" /> New Check
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-blue-600", bg: "bg-blue-50", icon: <Shield className="h-4 w-4 text-blue-600" /> },
          { label: "Completed", value: stats.completed, color: "text-green-600", bg: "bg-green-50", icon: <CheckCircle2 className="h-4 w-4 text-green-600" /> },
          { label: "In Progress", value: stats.pending, color: "text-amber-600", bg: "bg-amber-50", icon: <Clock className="h-4 w-4 text-amber-600" /> },
          { label: "Failed", value: stats.failed, color: "text-red-600", bg: "bg-red-50", icon: <AlertTriangle className="h-4 w-4 text-red-600" /> },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className={`p-4 flex items-center gap-3 ${s.bg} rounded-lg`}>
              <div className="p-2 bg-white rounded-lg shadow-sm">{s.icon}</div>
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New Check Form */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Initiate Background Check</CardTitle>
            <CardDescription>Starts checks for Identity, Education, Employment, and Criminal records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm">Application ID <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Paste application ID…"
                  value={applicationId}
                  onChange={e => setApplicationId(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Provider</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROVIDER_INFO).map(([p, info]) => (
                      <SelectItem key={p} value={p}>
                        <div>
                          <div className="font-medium">{p}</div>
                          <div className="text-xs text-muted-foreground">{info.description} · ~{info.avgDays}d</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleInitiate} disabled={actionLoading || !applicationId} className="bg-blue-600 hover:bg-blue-700 gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Initiate Check
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      {verifications.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by candidate, job title, or application ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" /> Loading verifications…
        </div>
      ) : verifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
            <div>
              <p className="font-semibold">No background checks yet</p>
              <p className="text-sm text-muted-foreground mt-1">Initiate a check for a candidate to get started.</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" /> Start First Check
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">No results for "{search}"</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearch("")}>Clear search</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => (
            <VerificationCard key={v._id} v={v} onUpdate={handleUpdateComponent} loading={actionLoading} />
          ))}
        </div>
      )}
    </div>
  )
}
