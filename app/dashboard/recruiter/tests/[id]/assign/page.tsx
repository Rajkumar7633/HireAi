"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, ArrowLeft, Code2, Users, Search, CheckCircle2,
  Send, UserCheck, Briefcase, Clock, BarChart3, Mail,
  Plus, X, Calendar, MessageSquare, CheckCircle, AlertCircle,
  Bell, Trash2, RefreshCw, ChevronRight, UserPlus, Eye,
  Info, XCircle,
} from "lucide-react"

interface Application {
  _id: string
  candidateName?: string
  candidateEmail?: string
  jobTitle?: string
  status: string
  appliedAt?: string
  testAssignedAt?: string
  jobSeekerId?: string
}

interface TestInfo {
  _id: string
  title: string
  durationMinutes: number
  passingScore: number
  questions?: any[]
  difficulty?: string
  tags?: string[]
}

interface EmailInvite {
  id: string
  email: string
  name?: string
  status: "queued" | "sending" | "notified" | "not_registered" | "already_assigned" | "error"
  message?: string
}

interface AssignedCandidate {
  _id?: string
  candidateName?: string
  candidateEmail?: string
  jobTitle?: string
  status?: string
  testAssignedAt?: string
}

type TabKey = "pipeline" | "email" | "assigned"

const STATUS_COLORS: Record<string, string> = {
  shortlisted: "bg-emerald-100 text-emerald-700",
  resume_reviewed: "bg-blue-100 text-blue-700",
  interviewed: "bg-purple-100 text-purple-700",
  applied: "bg-gray-100 text-gray-600",
  "Test Assigned": "bg-amber-100 text-amber-700",
}

export default function AssignCodingTestPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const testId = (params?.id ?? "") as string

  // ── Data ──────────────────────────────────────────
  const [test, setTest] = useState<TestInfo | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [assignedCandidates, setAssignedCandidates] = useState<AssignedCandidate[]>([])
  const [loading, setLoading] = useState(true)

  // ── Pipeline tab ──────────────────────────────────
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // ── Email invite tab ──────────────────────────────
  const [emailInput, setEmailInput] = useState("")
  const [emailName, setEmailName] = useState("")
  const [emailQueue, setEmailQueue] = useState<EmailInvite[]>([])
  const [emailError, setEmailError] = useState("")
  const emailRef = useRef<HTMLInputElement>(null)

  // ── Settings ──────────────────────────────────────
  const [customMessage, setCustomMessage] = useState("")
  const [deadline, setDeadline] = useState("")
  const [sendReminder, setSendReminder] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  // ── UI state ──────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("pipeline")
  const [assigning, setAssigning] = useState(false)
  const [justAssigned, setJustAssigned] = useState<string[]>([])

  // ── Load data ─────────────────────────────────────
  const loadData = async () => {
    setLoading(true)
    try {
      const [testRes, appRes, assignedRes] = await Promise.all([
        fetch(`/api/tests/${testId}`, { credentials: "include" }).catch(() => null),
        fetch(`/api/applications?status=shortlisted,resume_reviewed,interviewed,applied&limit=200`, { credentials: "include" }).catch(() => null),
        fetch(`/api/tests/${testId}/invite`, { credentials: "include" }).catch(() => null),
      ])

      if (testRes?.ok) {
        const d = await testRes.json()
        setTest(d.test || d)
      }

      if (appRes?.ok) {
        const d = await appRes.json()
        const apps: Application[] = d.applications || d || []
        setApplications(apps.filter((a: Application) => !a.testAssignedAt))
      }

      if (assignedRes?.ok) {
        const d = await assignedRes.json()
        setAssignedCandidates(d.assigned || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [testId])

  useEffect(() => {
    if (!loading && applications.length === 0 && activeTab === "pipeline") {
      setActiveTab("email")
    }
  }, [loading, applications.length])

  // ── Pipeline filtering ────────────────────────────
  const filtered = applications.filter(a => {
    const q = search.toLowerCase()
    const matchQ = !q ||
      (a.candidateName || "").toLowerCase().includes(q) ||
      (a.candidateEmail || "").toLowerCase().includes(q) ||
      (a.jobTitle || "").toLowerCase().includes(q)
    const matchStatus = statusFilter === "all" || a.status === statusFilter
    return matchQ && matchStatus
  })

  const uniqueStatuses = Array.from(new Set(applications.map(a => a.status)))

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) setSelected(new Set())
    else setSelected(new Set(filtered.map(a => a._id)))
  }

  // ── Email queue ───────────────────────────────────
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const parseEmailInvite = (
    email: string,
    name?: string,
    queue: EmailInvite[] = emailQueue,
  ): { invite: EmailInvite } | { error: string } | null => {
    const normalized = email.trim().toLowerCase()
    if (!normalized) return null
    if (!isValidEmail(normalized)) return { error: "Invalid email format" }
    if (queue.some(e => e.email === normalized)) return { error: "Already in the invite list" }
    return {
      invite: {
        id: Math.random().toString(36).slice(2),
        email: normalized,
        name: name?.trim() || undefined,
        status: "queued",
      },
    }
  }

  const addEmail = () => {
    const parsed = parseEmailInvite(emailInput, emailName)
    if (!parsed) { setEmailError("Please enter an email address"); return }
    if ("error" in parsed) { setEmailError(parsed.error); return }
    setEmailError("")
    setEmailQueue(prev => [...prev, parsed.invite])
    setEmailInput("")
    setEmailName("")
    emailRef.current?.focus()
    toast({ title: "Added to queue", description: `${parsed.invite.email} is ready to assign.` })
  }

  const getQueuedInvites = (includeDraft = true): EmailInvite[] => {
    const queued = emailQueue.filter(e => e.status === "queued")
    if (!includeDraft) return queued
    const parsed = parseEmailInvite(emailInput, emailName, queued)
    if (!parsed || "error" in parsed) return queued
    return [...queued, parsed.invite]
  }

  const removeEmail = (id: string) => setEmailQueue(prev => prev.filter(e => e.id !== id))

  // ── Paste multiple emails ─────────────────────────
  const handleEmailPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text")
    const pasted = text.split(/[\n,;]+/).map(s => s.trim().toLowerCase()).filter(s => isValidEmail(s))
    if (pasted.length > 1) {
      e.preventDefault()
      const newItems = pasted
        .filter(email => !emailQueue.some(eq => eq.email === email))
        .map(email => ({ id: Math.random().toString(36).slice(2), email, status: "queued" as const }))
      setEmailQueue(prev => [...prev, ...newItems])
      toast({ title: `${newItems.length} emails added to queue` })
    }
  }

  // ── Main assign handler ───────────────────────────
  const handleAssign = async () => {
    const pipelineSelected = Array.from(selected)
    const pendingInvites = getQueuedInvites(true)

    if (pipelineSelected.length === 0 && pendingInvites.length === 0) {
      toast({
        title: "Nothing to assign",
        description: "Enter a candidate email or select pipeline candidates, then click Send.",
        variant: "destructive",
      })
      return
    }

    // Persist any typed-but-not-added email into the visible queue
    if (pendingInvites.length > emailQueue.filter(e => e.status === "queued").length) {
      setEmailQueue(prev => {
        const existing = new Set(prev.map(e => e.email))
        const additions = pendingInvites.filter(e => !existing.has(e.email))
        return additions.length ? [...prev, ...additions] : prev
      })
      setEmailInput("")
      setEmailName("")
      setEmailError("")
    }

    const emailsToSend = pendingInvites.map(e => e.email)

    setAssigning(true)
    let pipelineOk = 0, emailNotified = 0, emailNotReg = 0, emailAlready = 0, emailFailed = 0

    try {
      // 1. Assign pipeline candidates
      if (pipelineSelected.length > 0) {
        const results = await Promise.allSettled(
          pipelineSelected.map(appId =>
            fetch("/api/tests/assign", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                applicationId: appId,
                testId,
                roundStage: "test_round",
                roundName: "Coding Test",
                message: customMessage || undefined,
                deadline: deadline || undefined,
              }),
            })
          )
        )
        const successful = pipelineSelected.filter((_, i) => {
          const r = results[i]
          return r.status === "fulfilled" && (r.value as Response).ok
        })
        pipelineOk = successful.length
        setJustAssigned(prev => [...prev, ...successful])
        setApplications(prev => prev.filter(a => !successful.includes(a._id)))
        setSelected(new Set())
      }

      // 2. Send email invites
      if (emailsToSend.length > 0) {
        setEmailQueue(prev => prev.map(e =>
          e.status === "queued" ? { ...e, status: "sending" } : e
        ))

        const res = await fetch(`/api/tests/${testId}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            invites: pendingInvites.map(e => ({ email: e.email, name: e.name })),
            message: customMessage || undefined,
            deadline: deadline || undefined,
          }),
        })

        const data = await res.json().catch(() => ({}))

        if (res.ok) {
          emailNotified = data.summary?.notified ?? 0
          emailNotReg = data.summary?.notRegistered ?? 0
          emailAlready = data.summary?.alreadyAssigned ?? 0
          emailFailed = data.summary?.errors ?? 0

          setEmailQueue(prev => prev.map(e => {
            const result = data.results?.find((r: any) => r.email === e.email)
            if (!result) return e
            return { ...e, status: result.status, name: result.name || e.name, message: result.message }
          }))
        } else {
          setEmailQueue(prev => prev.map(e =>
            emailsToSend.includes(e.email) ? { ...e, status: "error", message: data.message || "Assignment failed" } : e
          ))
          toast({
            title: "Email assignment failed",
            description: data.message || "Could not assign test to the entered email(s).",
            variant: "destructive",
          })
        }
      }

      // Refresh assigned list
      fetch(`/api/tests/${testId}/invite`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setAssignedCandidates(d.assigned || []) })

      // Toast summary
      const parts: string[] = []
      if (pipelineOk > 0) parts.push(`${pipelineOk} pipeline candidate${pipelineOk !== 1 ? "s" : ""} assigned`)
      if (emailNotified > 0) parts.push(`${emailNotified} job seeker${emailNotified !== 1 ? "s" : ""} assigned`)
      if (emailAlready > 0) parts.push(`${emailAlready} already had this test`)
      if (emailNotReg > 0) parts.push(`${emailNotReg} pending registration`)
      if (emailFailed > 0) parts.push(`${emailFailed} failed`)

      toast({
        title: parts.length ? "Assignment complete" : "Done",
        description: parts.length ? parts.join(" · ") : "No changes were made.",
        variant: emailFailed > 0 && emailNotified === 0 && pipelineOk === 0 ? "destructive" : "default",
      })
    } catch {
      toast({ title: "Assignment failed", variant: "destructive" })
    } finally {
      setAssigning(false)
    }
  }

  const queuedInvites = getQueuedInvites(true)
  const totalPending = selected.size + queuedInvites.length
  const draftInvite = parseEmailInvite(emailInput, emailName, emailQueue.filter(e => e.status === "queued"))
  const hasDraftEmail = Boolean(draftInvite && "invite" in draftInvite)

  // ── Loading ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <p className="text-sm text-gray-500">Loading assign panel…</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────
  return (
    <div className="w-full bg-gray-50 pb-32">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-14 z-30">
        <div className="w-full max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-500 hover:text-gray-900 shrink-0"
              onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div className="w-px h-5 bg-gray-200 shrink-0" />
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center shrink-0 shadow-sm">
                <Code2 className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  Assign: {test?.title || "Coding Test"}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-gray-400">{test?.durationMinutes}m</span>
                  {test?.passingScore && <span className="text-[10px] text-gray-400">· Pass {test.passingScore}%</span>}
                  {(test?.questions?.length ?? 0) > 0 && (
                    <span className="text-[10px] text-gray-400">· {test?.questions?.length} problems</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs hidden sm:flex"
              onClick={() => router.push(`/dashboard/recruiter/tests/${testId}/analytics`)}>
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs hidden sm:flex"
              onClick={() => router.push(`/dashboard/recruiter/tests/${testId}/preview`)}>
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
            <Button onClick={handleAssign} disabled={assigning || totalPending === 0} size="sm"
              className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 px-4 shadow-sm">
              {assigning
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                : <><Send className="h-3.5 w-3.5" /> Send{totalPending > 0 ? ` (${totalPending})` : ""}</>
              }
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-5 py-5 space-y-5">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pipeline Eligible", value: applications.length, icon: Users, color: "purple" },
            { label: "Selected", value: selected.size, icon: UserCheck, color: "emerald" },
            { label: "Email Queue", value: queuedInvites.length, icon: Mail, color: "blue" },
            { label: "Already Assigned", value: assignedCandidates.length + justAssigned.length, icon: CheckCircle2, color: "amber" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label}
              className={`bg-white rounded-xl border border-${color}-100 px-4 py-3 flex items-center gap-3 shadow-sm`}>
              <div className={`w-9 h-9 rounded-lg bg-${color}-50 flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 text-${color}-500`} />
              </div>
              <div>
                <p className={`text-xl font-bold text-${color}-600`}>{value}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Settings Panel (collapsible) ── */}
        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            onClick={() => setShowSettings(v => !v)}
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              Assignment Settings
              <span className="text-xs font-normal text-gray-400 ml-1">Custom message, deadline &amp; reminder</span>
            </div>
            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${showSettings ? "rotate-90" : ""}`} />
          </button>

          {showSettings && (
            <div className="border-t border-gray-100 px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/50">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Custom Message (optional)
                </label>
                <textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  placeholder="Hi! We'd like to invite you to complete our coding assessment…"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" /> Deadline (optional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="h-9 text-xs border-gray-200"
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <div
                    onClick={() => setSendReminder(v => !v)}
                    className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${sendReminder ? "bg-purple-500" : "bg-gray-300"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${sendReminder ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                  <span className="text-xs text-gray-600">Send 24h reminder</span>
                  <Bell className="h-3.5 w-3.5 text-gray-400" />
                </label>
              </div>
            </div>
          )}
        </Card>

        {/* ── Main tabs ── */}
        <div>
          {/* Tab bar */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm mb-4">
            {([
              { key: "pipeline", label: "Pipeline Candidates", icon: Users, count: applications.length },
              { key: "email", label: "Invite by Email", icon: Mail, count: emailQueue.length },
              { key: "assigned", label: "Already Assigned", icon: CheckCircle, count: assignedCandidates.length },
            ] as Array<{ key: TabKey; label: string; icon: any; count: number }>).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 rounded-lg transition-all ${
                  activeTab === tab.key
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-bold ${
                    activeTab === tab.key ? "bg-white/25 text-white" : "bg-gray-100 text-gray-600"
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── TAB: Pipeline Candidates ── */}
          {activeTab === "pipeline" && (
            <Card className="border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, email, or role…"
                    className="pl-9 h-9 border-gray-200 focus:border-purple-400 text-sm" />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>

                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="h-9 text-xs border border-gray-200 rounded-lg px-3 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="all">All Statuses</option>
                  {uniqueStatuses.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>

                <Button variant="outline" size="sm" className="h-9 text-xs shrink-0" onClick={selectAll}>
                  {selected.size === filtered.length && filtered.length > 0 ? "Deselect All" : `Select All (${filtered.length})`}
                </Button>

                <Button variant="ghost" size="sm" className="h-9 text-xs gap-1.5 text-gray-500 shrink-0" onClick={loadData}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>

              {filtered.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                    <Users className="h-7 w-7 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600">No eligible candidates found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {search || statusFilter !== "all"
                        ? "Try adjusting your search or status filter"
                        : "Shortlisted or in-review candidates will appear here"
                      }
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs mt-2"
                    onClick={() => setActiveTab("email")}>
                    <Mail className="h-3.5 w-3.5" /> Invite by Email instead
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filtered.map(app => {
                    const isSelected = selected.has(app._id)
                    const initials = (app.candidateName || "?").split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
                    const statusClass = STATUS_COLORS[app.status] || "bg-gray-100 text-gray-600"

                    return (
                      <div key={app._id} onClick={() => toggle(app._id)}
                        className={`flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all ${
                          isSelected ? "bg-purple-50 hover:bg-purple-50/80" : "hover:bg-gray-50/80"
                        }`}>

                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? "bg-purple-600 border-purple-600" : "border-gray-300 hover:border-purple-400"
                        }`}>
                          {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>

                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700"
                        }`}>
                          {initials}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{app.candidateName || "Unknown Candidate"}</p>
                          <p className="text-xs text-gray-400 truncate">{app.candidateEmail || "—"}</p>
                        </div>

                        <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 max-w-[160px]">
                          <Briefcase className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{app.jobTitle || "—"}</span>
                        </div>

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusClass}`}>
                          {app.status.replace(/_/g, " ")}
                        </span>

                        {app.appliedAt && (
                          <span className="hidden lg:flex items-center gap-1 text-[10px] text-gray-400 shrink-0">
                            <Clock className="h-3 w-3" />
                            {new Date(app.appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )}

          {/* ── TAB: Invite by Email ── */}
          {activeTab === "email" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { step: "1", title: "Enter email", desc: "Type the job seeker's registered email" },
                  { step: "2", title: "Review queue", desc: "Add one or more candidates to the list" },
                  { step: "3", title: "Send assignment", desc: "Test appears in their job seeker dashboard" },
                ].map(item => (
                  <div key={item.step} className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
                        {item.step}
                      </span>
                      <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    </div>
                    <p className="text-xs text-gray-500 pl-8">{item.desc}</p>
                  </div>
                ))}
              </div>

              <Card className="border-purple-100 shadow-sm ring-1 ring-purple-50">
                <CardHeader className="pb-3 border-b border-gray-100 bg-gradient-to-r from-purple-50/80 to-white">
                  <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-purple-600" />
                    Assign by Email
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    The candidate must be registered as a job seeker on HireAI with this email.
                  </p>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email Address *</label>
                        <Input
                          ref={emailRef}
                          type="email"
                          value={emailInput}
                          onChange={e => { setEmailInput(e.target.value); setEmailError("") }}
                          onPaste={handleEmailPaste}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail() } }}
                          placeholder="anuj@example.com"
                          className={`h-10 border-gray-200 focus:border-purple-400 text-sm ${emailError ? "border-red-400 ring-1 ring-red-200" : ""}`}
                        />
                        {emailError && <p className="text-xs text-red-500 mt-1.5">{emailError}</p>}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Name (optional)</label>
                        <Input
                          value={emailName}
                          onChange={e => setEmailName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail() } }}
                          placeholder="Candidate name"
                          className="h-10 border-gray-200 focus:border-purple-400 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={addEmail} variant="outline"
                        className="h-10 border-purple-200 text-purple-700 hover:bg-purple-50 gap-1.5 text-xs px-4">
                        <Plus className="h-4 w-4" /> Add to queue
                      </Button>
                      <Button
                        onClick={handleAssign}
                        disabled={assigning || (!hasDraftEmail && emailQueue.filter(e => e.status === "queued").length === 0)}
                        className="h-10 bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs px-5 shadow-sm"
                      >
                        {assigning
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Assigning…</>
                          : <><Send className="h-4 w-4" /> Assign now</>
                        }
                      </Button>
                    </div>
                  </div>

                  {hasDraftEmail && draftInvite && "invite" in draftInvite && (
                    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <p className="font-semibold">Ready to assign: {draftInvite.invite.email}</p>
                        <p className="mt-0.5">Click <strong>Assign now</strong> to send immediately, or <strong>Add to queue</strong> for multiple candidates.</p>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Paste multiple emails separated by commas, semicolons, or new lines
                  </p>
                </CardContent>
              </Card>

              {emailQueue.length > 0 ? (
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Invite Queue
                      <span className="text-gray-400 font-normal ml-2 text-xs">({emailQueue.length} emails)</span>
                    </h3>
                    <button onClick={() => setEmailQueue([])}
                      className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" /> Clear all
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {emailQueue.map(item => (
                      <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {item.name ? item.name.charAt(0).toUpperCase() : item.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          {item.name && <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>}
                          <p className="text-xs text-gray-500 truncate">{item.email}</p>
                        </div>
                        <div className="shrink-0">
                          {item.status === "queued" && (
                            <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Queued</span>
                          )}
                          {item.status === "sending" && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                              <Loader2 className="h-3 w-3 animate-spin" /> Sending
                            </span>
                          )}
                          {item.status === "notified" && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Assigned on platform
                            </span>
                          )}
                          {item.status === "already_assigned" && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                              <AlertCircle className="h-3 w-3" /> Already assigned
                            </span>
                          )}
                          {item.status === "not_registered" && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                              <AlertCircle className="h-3 w-3" /> Not registered yet
                            </span>
                          )}
                          {item.status === "error" && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-500">
                              <XCircle className="h-3 w-3" /> {item.message || "Failed"}
                            </span>
                          )}
                        </div>
                        {item.status === "queued" && (
                          <button onClick={() => removeEmail(item.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                  <Mail className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold text-gray-600">No emails in queue yet</p>
                  <p className="text-xs mt-1.5 text-gray-400 max-w-sm mx-auto">
                    Enter a job seeker's email above and click <strong>Assign now</strong> — you don't need to add to queue first.
                  </p>
                </div>
              )}

              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">How email assignment works:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                    <li>Registered job seekers get the test in <strong>My Tests</strong> instantly</li>
                    <li>They also receive an in-app notification</li>
                    <li>If the email is not registered yet, the invite is saved until they sign up</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB: Already Assigned ── */}
          {activeTab === "assigned" && (
            <Card className="border-gray-200 shadow-sm overflow-hidden">
              {assignedCandidates.length === 0 && justAssigned.length === 0 ? (
                <div className="py-14 text-center">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No candidates assigned yet</p>
                  <p className="text-xs text-gray-400 mt-1">After you assign the test, candidates will appear here</p>
                </div>
              ) : (
                <>
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {assignedCandidates.length} Assigned
                    </h3>
                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5 text-gray-500" onClick={loadData}>
                      <RefreshCw className="h-3 w-3" /> Refresh
                    </Button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {assignedCandidates.map((c, i) => (
                      <div key={c._id || i} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {(c.candidateName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{c.candidateName || "Unknown"}</p>
                          <p className="text-xs text-gray-400 truncate">{c.candidateEmail || "—"}</p>
                        </div>
                        {c.jobTitle && (
                          <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 max-w-[140px]">
                            <Briefcase className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{c.jobTitle}</span>
                          </div>
                        )}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Assigned
                          </span>
                          {c.testAssignedAt && (
                            <span className="text-[10px] text-gray-400">
                              {new Date(c.testAssignedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ── Sticky bottom CTA ── */}
      {totalPending > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          <div className="max-w-6xl mx-auto px-5 pb-5 pointer-events-auto">
            <div className="bg-white border border-purple-200 rounded-2xl shadow-2xl shadow-purple-500/15 p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {selected.size > 0 && (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                      <Users className="h-4 w-4" /> {selected.size} pipeline candidate{selected.size !== 1 ? "s" : ""}
                    </span>
                  )}
                  {queuedInvites.length > 0 && (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                      <Mail className="h-4 w-4" /> {queuedInvites.length} email invite{queuedInvites.length !== 1 ? "s" : ""}
                    </span>
                  )}
                  {deadline && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      Due {new Date(deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Candidates will receive instant notifications on the job seeker platform
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Button variant="ghost" size="sm" className="text-xs text-gray-500"
                  onClick={() => { setSelected(new Set()); setEmailQueue([]); }}>
                  Clear all
                </Button>
                <Button onClick={handleAssign} disabled={assigning}
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white gap-2 px-6 shadow-lg shadow-purple-500/25 font-semibold">
                  {assigning
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending invites…</>
                    : <><Send className="h-4 w-4" /> Assign &amp; Notify {totalPending}</>
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

