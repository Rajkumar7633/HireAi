"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Ban,
  Shield,
  ShieldCheck,
} from "lucide-react"

interface OfferLetter {
  _id: string
  applicationId?: string
  candidateId?: { _id?: string; name?: string; email?: string } | string
  status: string
  approvalStatus?: string
  approvalRequired?: boolean
  offerDetails?: {
    position?: string
    department?: string
    startDate?: string
    employmentType?: string
    workLocation?: string
  }
  compensation?: {
    baseSalary?: number
    currency?: string
    salaryPeriod?: string
    bonus?: number
  }
  expiresAt?: string
  sentAt?: string
  createdAt?: string
}

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-700",
  "Pending Approval": "bg-amber-100 text-amber-800",
  Sent: "bg-blue-100 text-blue-800",
  Viewed: "bg-indigo-100 text-indigo-800",
  Accepted: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
  Expired: "bg-orange-100 text-orange-800",
  Withdrawn: "bg-gray-100 text-gray-600",
}

function formatMoney(amount?: number, currency = "USD") {
  if (!amount) return "—"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

function candidateName(letter: OfferLetter) {
  const c = letter.candidateId
  if (c && typeof c === "object") return c.name || c.email || "Candidate"
  return "Candidate"
}

function candidateEmail(letter: OfferLetter) {
  const c = letter.candidateId
  if (c && typeof c === "object") return c.email || ""
  return ""
}

export default function OfferLettersPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [letters, setLetters] = useState<OfferLetter[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const loadLetters = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/offer-letter", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setLetters(data.offerLetters || [])
      } else {
        toast({ title: "Failed to load offer letters", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadLetters()
  }, [loadLetters])

  const stats = useMemo(() => {
    const awaitingApproval = letters.filter(
      l => l.status === "Pending Approval" && l.approvalStatus !== "Approved",
    ).length
    const approvedReady = letters.filter(
      l => l.status === "Pending Approval" && l.approvalStatus === "Approved",
    ).length
    return {
      total: letters.length,
      draft: letters.filter(l => l.status === "Draft").length,
      pending: letters.filter(l => l.status === "Pending Approval").length,
      awaitingApproval,
      approvedReady,
      sent: letters.filter(l => ["Sent", "Viewed"].includes(l.status)).length,
      accepted: letters.filter(l => l.status === "Accepted").length,
    }
  }, [letters])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return letters.filter(l => {
      const matchStatus = statusFilter === "all" || l.status === statusFilter
      const name = candidateName(l).toLowerCase()
      const email = candidateEmail(l).toLowerCase()
      const position = (l.offerDetails?.position || "").toLowerCase()
      const matchQ =
        !q ||
        name.includes(q) ||
        email.includes(q) ||
        position.includes(q) ||
        l._id.toLowerCase().includes(q)
      return matchStatus && matchQ
    })
  }, [letters, search, statusFilter])

  const runAction = async (
    letterId: string,
    action: "send" | "withdraw" | "delete" | "approve" | "reject-approval",
    extra?: { reason?: string },
  ) => {
    setActionId(letterId)
    try {
      if (action === "delete") {
        const res = await fetch(`/api/offer-letter?id=${letterId}`, {
          method: "DELETE",
          credentials: "include",
        })
        const data = await res.json()
        if (res.ok) {
          setLetters(prev => prev.filter(l => l._id !== letterId))
          toast({ title: "Draft deleted" })
        } else {
          toast({ title: data.message || "Delete failed", variant: "destructive" })
        }
        return
      }

      const res = await fetch("/api/offer-letter", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          offerLetterId: letterId,
          reason: extra?.reason,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.offerLetter) {
          setLetters(prev =>
            prev.map(l => (l._id === letterId ? { ...l, ...data.offerLetter } : l)),
          )
        }
        const titles: Record<string, string> = {
          send: "Offer sent to candidate",
          withdraw: "Offer withdrawn",
          approve: "Offer approved — you can send it to the candidate",
          "reject-approval": "Approval rejected — returned to draft for edits",
        }
        toast({ title: titles[action] || "Updated" })
        loadLetters()
      } else {
        toast({ title: data.message || "Action failed", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setActionId(null)
    }
  }

  const canSend = (letter: OfferLetter) => {
    if (letter.status === "Draft" && !letter.approvalRequired) return true
    if (letter.status === "Pending Approval" && letter.approvalStatus === "Approved") return true
    return false
  }

  const needsApproval = (letter: OfferLetter) =>
    letter.status === "Pending Approval" && letter.approvalStatus !== "Approved"

  return (
    <div className="p-4 md:p-6 space-y-6 w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-violet-600" />
            Offer Letters
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, send, and track candidate offer letters
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadLetters} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button asChild className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Link href="/dashboard/recruiter/offer-letters/create">
              <Plus className="h-4 w-4" /> New Offer
            </Link>
          </Button>
        </div>
      </div>

      {stats.awaitingApproval > 0 && (
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">
                  {stats.awaitingApproval} offer{stats.awaitingApproval > 1 ? "s" : ""} waiting for approval
                </p>
                <p className="text-sm text-amber-800 mt-0.5">
                  There is no separate manager portal yet. A hiring lead or another recruiter on your team
                  approves offers on this page, then the creator sends the letter to the candidate.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-amber-300 bg-white"
              onClick={() => setStatusFilter("Pending Approval")}
            >
              Show pending
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: FileText, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Drafts", value: stats.draft, icon: Clock, color: "text-slate-600", bg: "bg-slate-50" },
          { label: "Pending Approval", value: stats.pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Sent / Viewed", value: stats.sent, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Accepted", value: stats.accepted, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidate, position, or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(STATUS_STYLES).map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" /> Loading offer letters…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
            <p className="font-semibold">No offer letters yet</p>
            <p className="text-sm text-muted-foreground">
              {letters.length > 0 ? "No results match your filters." : "Create your first offer letter to get started."}
            </p>
            <Button asChild className="gap-2 bg-violet-600 hover:bg-violet-700">
              <Link href="/dashboard/recruiter/offer-letters/create">
                <Plus className="h-4 w-4" /> Create Offer Letter
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(letter => {
            const currency = letter.compensation?.currency || "USD"
            const salary = formatMoney(letter.compensation?.baseSalary, currency)
            const period = letter.compensation?.salaryPeriod || "Annual"
            const isExpired =
              letter.expiresAt && new Date(letter.expiresAt).getTime() < Date.now() &&
              !["Accepted", "Rejected", "Withdrawn"].includes(letter.status)

            return (
              <Card key={letter._id} className="hover:shadow-md transition-shadow border-l-4 border-l-violet-400">
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{candidateName(letter)}</p>
                        {letter.offerDetails?.position && (
                          <span className="text-sm text-muted-foreground">
                            · {letter.offerDetails.position}
                          </span>
                        )}
                        {isExpired && (
                          <Badge className="bg-orange-100 text-orange-800">Expired</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {candidateEmail(letter)}
                        {letter.offerDetails?.department && ` · ${letter.offerDetails.department}`}
                        {letter.offerDetails?.workLocation && ` · ${letter.offerDetails.workLocation}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(letter.createdAt || "").toLocaleDateString()}
                        {letter.sentAt && ` · Sent ${new Date(letter.sentAt).toLocaleDateString()}`}
                        {letter.expiresAt && ` · Expires ${new Date(letter.expiresAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={STATUS_STYLES[letter.status] || "bg-gray-100"}>
                        {letter.status}
                      </Badge>
                      {letter.approvalRequired && (
                        <Badge
                          className={
                            letter.approvalStatus === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : letter.approvalStatus === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                          }
                        >
                          {letter.approvalStatus === "Approved"
                            ? "Approved"
                            : letter.approvalStatus === "Rejected"
                              ? "Approval rejected"
                              : "Awaiting approval"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span>
                      <strong>{salary}</strong>
                      <span className="text-muted-foreground"> / {period.toLowerCase()}</span>
                    </span>
                    {letter.offerDetails?.employmentType && (
                      <span className="text-muted-foreground">{letter.offerDetails.employmentType}</span>
                    )}
                    {letter.offerDetails?.startDate && (
                      <span className="text-muted-foreground">
                        Start {new Date(letter.offerDetails.startDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {(letter.candidateId && typeof letter.candidateId === "object" && letter.candidateId._id) && (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1" asChild>
                        <Link href={`/dashboard/recruiter/candidates/${letter.candidateId._id}`}>
                          <Eye className="h-3.5 w-3.5" /> View candidate
                        </Link>
                      </Button>
                    )}
                    {needsApproval(letter) && (
                      <>
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                          disabled={actionId === letter._id}
                          onClick={() => runAction(letter._id, "approve")}
                        >
                          {actionId === letter._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          Approve offer
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1 text-red-600"
                          disabled={actionId === letter._id}
                          onClick={() => runAction(letter._id, "reject-approval", { reason: "Changes requested" })}
                        >
                          <XCircle className="h-3.5 w-3.5" /> Request changes
                        </Button>
                      </>
                    )}
                    {canSend(letter) && (
                      <Button
                        size="sm"
                        className="h-8 text-xs gap-1 bg-violet-600 hover:bg-violet-700"
                        disabled={actionId === letter._id}
                        onClick={() => runAction(letter._id, "send")}
                      >
                        {actionId === letter._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        Send to candidate
                      </Button>
                    )}
                    {["Sent", "Viewed", "Pending Approval"].includes(letter.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        disabled={actionId === letter._id}
                        onClick={() => runAction(letter._id, "withdraw")}
                      >
                        <Ban className="h-3.5 w-3.5" /> Withdraw
                      </Button>
                    )}
                    {letter.status === "Draft" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1 text-red-600 hover:text-red-700"
                        disabled={actionId === letter._id}
                        onClick={() => runAction(letter._id, "delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    )}
                    {letter.status === "Accepted" && (
                      <Badge className="gap-1 bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Accepted
                      </Badge>
                    )}
                    {letter.status === "Rejected" && (
                      <Badge className="gap-1 bg-red-100 text-red-800">
                        <XCircle className="h-3.5 w-3.5" /> Rejected
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
