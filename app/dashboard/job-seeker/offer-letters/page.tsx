"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Search,
  Building2,
  CalendarDays,
  MapPin,
  Ban,
  Sparkles,
  TrendingUp,
  Mail,
  Printer,
  GitCompare,
  Shield,
  Briefcase,
  Award,
  Timer,
  ChevronRight,
  ListChecks,
  History,
  ExternalLink,
  PartyPopper,
  AlertTriangle,
} from "lucide-react"
import {
  format,
  formatDistanceToNow,
  differenceInDays,
  isPast,
} from "date-fns"
import type { OfferCompanyBranding } from "@/lib/offer-letter-company"

// ─── Types ───────────────────────────────────────────────────────────────────

interface OfferHistoryItem {
  action: string
  timestamp: string
  details?: { message?: string; reason?: string }
}

interface OfferLetter {
  _id: string
  applicationId?: string
  status: string
  offerDetails?: {
    position?: string
    department?: string
    startDate?: string
    employmentType?: string
    workLocation?: string
    workArrangement?: string
    reportingTo?: string
  }
  compensation?: {
    baseSalary?: number
    currency?: string
    salaryPeriod?: string
    bonus?: number
    bonusType?: string
    signingBonus?: number
    benefits?: string[]
  }
  terms?: {
    probationPeriod?: number
    noticePeriod?: number
    workingHours?: string
    vacationDays?: number
    backgroundCheckRequired?: boolean
    ndaRequired?: boolean
  }
  customContent?: {
    greeting?: string
    introduction?: string
    additionalTerms?: string
    closing?: string
  }
  expiresAt?: string
  sentAt?: string
  viewedAt?: string
  respondedAt?: string
  createdAt?: string
  history?: OfferHistoryItem[]
  signature?: {
    candidateSigned?: boolean
    candidateSignature?: string
    candidateSignedAt?: string
  }
  recruiterId?: {
    name?: string
    email?: string
    companyName?: string
    companyLogo?: string
    website?: string
    businessLocation?: string
    phone?: string
  } | string
  jobId?: { title?: string } | string
  companyBranding?: OfferCompanyBranding
}

type FilterTab = "all" | "action" | "accepted" | "declined" | "expired"
type SortKey = "date" | "salary" | "deadline"

const OFFER_PIPELINE = [
  { key: "received", label: "Received" },
  { key: "reviewed", label: "Reviewed" },
  { key: "decision", label: "Decision" },
  { key: "onboarding", label: "Onboarding" },
]

const STATUS_STYLES: Record<
  string,
  { label: string; className: string; accent: string; icon: React.ReactNode }
> = {
  Sent: {
    label: "New offer",
    className: "bg-blue-500/15 text-blue-700 border-blue-200",
    accent: "#2563eb",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  Viewed: {
    label: "Under review",
    className: "bg-violet-500/15 text-violet-700 border-violet-200",
    accent: "#7c3aed",
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  Accepted: {
    label: "Accepted",
    className: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
    accent: "#059669",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  Rejected: {
    label: "Declined",
    className: "bg-red-500/15 text-red-700 border-red-200",
    accent: "#dc2626",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  Expired: {
    label: "Expired",
    className: "bg-orange-500/15 text-orange-700 border-orange-200",
    accent: "#ea580c",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  Withdrawn: {
    label: "Withdrawn",
    className: "bg-slate-500/15 text-slate-600 border-slate-200",
    accent: "#64748b",
    icon: <Ban className="h-3.5 w-3.5" />,
  },
}

const ONBOARDING_STEPS = [
  { id: "pdf", label: "Download & save signed offer letter", icon: FileText },
  { id: "bg", label: "Complete background verification (if required)", icon: Shield },
  { id: "docs", label: "Submit identity & employment documents", icon: Briefcase },
  { id: "start", label: "Confirm start date with HR", icon: CalendarDays },
  { id: "welcome", label: "Review onboarding welcome pack", icon: PartyPopper },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(amount?: number, currency = "USD") {
  if (!amount) return "—"
  const locale = currency === "INR" ? "en-IN" : "en-US"
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

function resolveCompany(letter: OfferLetter) {
  return (
    letter.companyBranding?.companyName ||
    (typeof letter.recruiterId === "object" ? letter.recruiterId?.companyName : undefined) ||
    "Company"
  )
}

function resolveLogo(letter: OfferLetter) {
  return (
    letter.companyBranding?.logoUrl ||
    (typeof letter.recruiterId === "object" ? letter.recruiterId?.companyLogo : undefined)
  )
}

function positionTitle(letter: OfferLetter) {
  const job =
    letter.jobId && typeof letter.jobId === "object" ? letter.jobId.title : undefined
  return letter.offerDetails?.position || job || "Position"
}

function recruiterContact(letter: OfferLetter) {
  const r = letter.recruiterId
  if (!r || typeof r !== "object") return { name: "Recruiter", email: "" }
  return {
    name: r.name || "Recruiter",
    email: r.email || letter.companyBranding?.recruiterEmail || "",
    phone: r.phone || letter.companyBranding?.recruiterPhone,
  }
}

function getOfferPipelineProgress(status: string): number {
  if (status === "Accepted") return 4
  if (["Rejected", "Withdrawn", "Expired"].includes(status)) return 3
  if (status === "Viewed") return 2
  if (status === "Sent") return 1
  return 0
}

function daysUntilExpiry(expiresAt?: string) {
  if (!expiresAt) return null
  return differenceInDays(new Date(expiresAt), new Date())
}

function totalCompensation(letter: OfferLetter) {
  const base = letter.compensation?.baseSalary ?? 0
  const bonus = letter.compensation?.bonus ?? 0
  const signing = letter.compensation?.signingBonus ?? 0
  return base + bonus + signing
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function CompanyAvatar({ letter, size = 48 }: { letter: OfferLetter; size?: number }) {
  const logo = resolveLogo(letter)
  const company = resolveCompany(letter)
  const initials = company.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()

  if (logo) {
    return (
      <div
        className="rounded-xl border border-white/20 bg-white/10 overflow-hidden shrink-0 shadow-lg"
        style={{ width: size, height: size }}
      >
        <img src={logo} alt={company} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div
      className="rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg border border-white/20"
      style={{ width: size, height: size }}
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.32 }}>{initials}</span>
    </div>
  )
}

function OfferPipelineBar({ status }: { status: string }) {
  const progress = getOfferPipelineProgress(status)
  const isAccepted = status === "Accepted"
  const isClosed = ["Rejected", "Withdrawn", "Expired"].includes(status)

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Offer journey</span>
        <span>{isAccepted ? "Complete" : isClosed ? "Closed" : `${progress}/${OFFER_PIPELINE.length}`}</span>
      </div>
      <div className="flex items-center gap-1">
        {OFFER_PIPELINE.map((stage, i) => {
          const stageNum = i + 1
          const done = isAccepted ? true : progress > stageNum
          const active = !isAccepted && progress === stageNum
          return (
            <div key={stage.key} className="flex items-center flex-1 gap-1 min-w-0">
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <div
                  className={`h-1.5 w-full rounded-full transition-all ${
                    done ? "bg-violet-600" : active ? "bg-gradient-to-r from-violet-600 to-slate-200" : "bg-slate-200"
                  }`}
                />
                <span
                  className={`text-[9px] truncate w-full text-center ${
                    active ? "text-violet-700 font-bold" : done ? "text-slate-600" : "text-slate-400"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {i < OFFER_PIPELINE.length - 1 && (
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 mb-3 ${
                    done || active ? "bg-violet-600" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CompensationBreakdown({ letter }: { letter: OfferLetter }) {
  const base = letter.compensation?.baseSalary ?? 0
  const bonus = letter.compensation?.bonus ?? 0
  const signing = letter.compensation?.signingBonus ?? 0
  const total = base + bonus + signing
  if (!total) return null
  const currency = letter.compensation?.currency || "USD"

  const rows = [
    { label: "Base salary", value: base, color: "bg-violet-500" },
    { label: "Bonus", value: bonus, color: "bg-emerald-500" },
    { label: "Signing", value: signing, color: "bg-amber-500" },
  ].filter((r) => r.value > 0)

  return (
    <div className="rounded-xl border bg-slate-50/80 p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
        <TrendingUp className="h-3.5 w-3.5" /> Compensation breakdown
      </p>
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-200">
        {rows.map((r) => (
          <div
            key={r.label}
            className={`${r.color} transition-all`}
            style={{ width: `${(r.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-semibold">{formatMoney(r.value, currency)}</span>
          </div>
        ))}
        <div className="col-span-2 flex justify-between border-t pt-2 mt-1">
          <span className="font-medium text-slate-700">Total package</span>
          <span className="font-bold text-violet-700">{formatMoney(total, currency)}</span>
        </div>
      </div>
    </div>
  )
}

function OfferTimeline({ history }: { history?: OfferHistoryItem[] }) {
  const items = (history || []).slice().reverse().slice(0, 6)
  if (!items.length) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
        <History className="h-3.5 w-3.5" /> Activity timeline
      </p>
      <div className="space-y-2 pl-1">
        {items.map((h, i) => (
          <div key={i} className="flex gap-2 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
            <div>
              <p className="font-medium text-slate-700">{h.action}</p>
              <p className="text-muted-foreground">
                {h.details?.message || h.details?.reason || ""}
              </p>
              <p className="text-[10px] text-slate-400">
                {format(new Date(h.timestamp), "MMM d, yyyy · h:mm a")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OnboardingChecklist({ letter }: { letter: OfferLetter }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
      <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
        <ListChecks className="h-4 w-4" /> Onboarding checklist
      </p>
      <ul className="space-y-2">
        {ONBOARDING_STEPS.map((step) => {
          const Icon = step.icon
          const done = checked[step.id]
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => setChecked((p) => ({ ...p, [step.id]: !p[step.id] }))}
                className="flex items-start gap-2 w-full text-left text-sm group"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                    done
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-emerald-300 bg-white text-emerald-600"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3 w-3" />}
                </span>
                <span className={done ? "text-emerald-800 line-through opacity-70" : "text-slate-700"}>
                  {step.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {letter.offerDetails?.startDate && (
        <p className="text-xs text-emerald-700 bg-white/60 rounded-lg px-3 py-2 border border-emerald-100">
          Start date: <strong>{format(new Date(letter.offerDetails.startDate), "MMMM d, yyyy")}</strong>
        </p>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function JobSeekerOfferLettersPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [letters, setLetters] = useState<OfferLetter[]>([])
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [sortKey, setSortKey] = useState<SortKey>("date")
  const [compareMode, setCompareMode] = useState(false)
  const [selected, setSelected] = useState<OfferLetter | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [signature, setSignature] = useState("")

  const loadLetters = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch("/api/offer-letter", { credentials: "include", cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setLetters(data.offerLetters || [])
      } else if (!silent) {
        toast({ title: "Failed to load offers", variant: "destructive" })
      }
    } catch {
      if (!silent) toast({ title: "Network error", variant: "destructive" })
    } finally {
      if (!silent) setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadLetters()
    const onVisible = () => {
      if (document.visibilityState === "visible") loadLetters(true)
    }
    document.addEventListener("visibilitychange", onVisible)
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") loadLetters(true)
    }, 45000)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.clearInterval(interval)
    }
  }, [loadLetters])

  const stats = useMemo(() => {
    const total = letters.length
    const actionNeeded = letters.filter(
      (l) =>
        (l.status === "Sent" || l.status === "Viewed") &&
        (!l.expiresAt || !isPast(new Date(l.expiresAt))),
    ).length
    const accepted = letters.filter((l) => l.status === "Accepted").length
    const declined = letters.filter((l) => l.status === "Rejected").length
    const avgSalary =
      letters.length > 0
        ? Math.round(
            letters.reduce((s, l) => s + (l.compensation?.baseSalary ?? 0), 0) / letters.length,
          )
        : 0
    const currency = letters[0]?.compensation?.currency || "INR"
    const responseRate =
      total > 0
        ? Math.round(
            (letters.filter((l) => l.status !== "Sent").length / total) * 100,
          )
        : 0
    return { total, actionNeeded, accepted, declined, avgSalary, currency, responseRate }
  }, [letters])

  const filtered = useMemo(() => {
    let list = [...letters]

    if (activeTab === "action") {
      list = list.filter(
        (l) =>
          (l.status === "Sent" || l.status === "Viewed") &&
          (!l.expiresAt || !isPast(new Date(l.expiresAt))),
      )
    } else if (activeTab === "accepted") list = list.filter((l) => l.status === "Accepted")
    else if (activeTab === "declined") list = list.filter((l) => l.status === "Rejected")
    else if (activeTab === "expired") {
      list = list.filter(
        (l) =>
          l.status === "Expired" ||
          (l.expiresAt && isPast(new Date(l.expiresAt)) && l.status !== "Accepted"),
      )
    }

    const term = search.trim().toLowerCase()
    if (term) {
      list = list.filter((l) => {
        const pos = positionTitle(l).toLowerCase()
        const co = resolveCompany(l).toLowerCase()
        return pos.includes(term) || co.includes(term)
      })
    }

    if (sortKey === "salary") {
      list.sort((a, b) => totalCompensation(b) - totalCompensation(a))
    } else if (sortKey === "deadline") {
      list.sort((a, b) => {
        const da = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity
        const db = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity
        return da - db
      })
    } else {
      list.sort((a, b) => {
        const da = a.sentAt || a.createdAt || ""
        const db = b.sentAt || b.createdAt || ""
        return new Date(db).getTime() - new Date(da).getTime()
      })
    }

    return list
  }, [letters, search, activeTab, sortKey])

  const compareOffers = useMemo(
    () =>
      letters
        .filter((l) => l.status === "Sent" || l.status === "Viewed" || l.status === "Accepted")
        .slice(0, 3),
    [letters],
  )

  const openDetail = async (letter: OfferLetter) => {
    setSelected(letter)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/offer-letter/${letter._id}`, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        const full = data.offerLetter as OfferLetter
        setSelected(full)
        setLetters((prev) => prev.map((l) => (l._id === full._id ? { ...l, ...full } : l)))
      }
    } catch {
      toast({ title: "Could not load offer details", variant: "destructive" })
    } finally {
      setDetailLoading(false)
    }
  }

  const downloadPdf = async (id: string, preview = false) => {
    try {
      const res = await fetch(`/api/offer-letter/${id}/download`, { credentials: "include" })
      if (!res.ok) {
        toast({ title: "Download failed", variant: "destructive" })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (preview) {
        window.open(url, "_blank")
        setTimeout(() => URL.revokeObjectURL(url), 60000)
      } else {
        const a = document.createElement("a")
        a.href = url
        a.download = `offer-letter-${id}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      toast({ title: "Download failed", variant: "destructive" })
    }
  }

  const respond = async (
    action: "accept" | "reject",
    extra?: { signature?: string; reason?: string },
  ) => {
    if (!selected) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/offer-letter/${selected._id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.message || "Action failed", variant: "destructive" })
        return
      }
      toast({
        title: action === "accept" ? "Offer accepted! 🎉" : "Offer declined",
        description:
          action === "accept"
            ? "Congratulations — the recruiter has been notified."
            : "Your response has been recorded.",
      })
      setAcceptOpen(false)
      setRejectOpen(false)
      setSelected(null)
      await loadLetters()
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setActionLoading(false)
    }
  }

  const canRespond =
    selected &&
    (selected.status === "Sent" || selected.status === "Viewed") &&
    (!selected.expiresAt || !isPast(new Date(selected.expiresAt)))

  const TABS: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All offers", count: stats.total },
    { id: "action", label: "Action needed", count: stats.actionNeeded },
    { id: "accepted", label: "Accepted", count: stats.accepted },
    { id: "declined", label: "Declined", count: stats.declined },
    { id: "expired", label: "Expired", count: letters.filter((l) => l.status === "Expired").length },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-violet-50/30">
      {/* Hero */}
      <div className="relative overflow-hidden border-b bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgeT1w9IjEwJSIgLz48L2c+PC9zdmc+')] opacity-20" />
        <div className="relative mx-auto max-w-6xl px-4 py-8 md:py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-violet-200 text-sm font-medium mb-2">
                <Award className="h-4 w-4" />
                Career milestone hub
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">My Offers</h1>
              <p className="mt-2 text-violet-100/90 max-w-xl text-sm md:text-base">
                Premium offer workspace — review packages, track your offer journey, compare roles,
                and respond with confidence.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {compareOffers.length >= 2 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/15 text-white border-white/20 hover:bg-white/25"
                  onClick={() => setCompareMode((v) => !v)}
                >
                  <GitCompare className="h-4 w-4 mr-1.5" />
                  {compareMode ? "Hide compare" : "Compare offers"}
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/15 text-white border-white/20 hover:bg-white/25"
                onClick={() => loadLetters()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total offers", value: stats.total, icon: FileText },
              { label: "Action needed", value: stats.actionNeeded, icon: AlertTriangle },
              { label: "Accepted", value: stats.accepted, icon: CheckCircle2 },
              { label: "Avg. package", value: formatMoney(stats.avgSalary, stats.currency), icon: TrendingUp },
              { label: "Engagement", value: `${stats.responseRate}%`, icon: Eye },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3"
              >
                <div className="flex items-center gap-2 text-violet-200 text-xs font-medium">
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </div>
                <p className="mt-1 text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        {/* Compare panel — Feature: multi-offer comparison */}
        {compareMode && compareOffers.length >= 2 && (
          <div className="rounded-2xl border border-violet-200 bg-white shadow-lg shadow-violet-100/50 p-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <GitCompare className="h-4 w-4 text-violet-600" />
              Offer comparison
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {compareOffers.map((l) => (
                <div key={l._id} className="rounded-xl border bg-slate-50 p-4 space-y-2">
                  <p className="font-bold text-slate-900">{positionTitle(l)}</p>
                  <p className="text-sm text-muted-foreground">{resolveCompany(l)}</p>
                  <p className="text-lg font-bold text-violet-700">
                    {formatMoney(l.compensation?.baseSalary, l.compensation?.currency)}
                  </p>
                  {l.compensation?.bonus && (
                    <p className="text-xs text-emerald-600">
                      + {formatMoney(l.compensation.bonus, l.compensation?.currency)} bonus
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {l.offerDetails?.workLocation || "—"} · {l.offerDetails?.workArrangement || "—"}
                  </p>
                  <Badge variant="outline" className="text-[10px]">{l.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border p-3 shadow-sm">
          <div className="flex gap-1 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-violet-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-1.5 text-xs opacity-80">({tab.count})</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search role or company…"
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest first</SelectItem>
                <SelectItem value="salary">Highest package</SelectItem>
                <SelectItem value="deadline">Deadline soon</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
            <p className="text-sm text-muted-foreground">Loading your offers…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white py-20 text-center shadow-sm">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="font-semibold text-lg">No offers in this view</h3>
            <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
              When recruiters send you offers, they appear here with full package details,
              timelines, and download options.
            </p>
            <Button className="mt-6" variant="outline" asChild>
              <Link href="/dashboard/job-seeker/applications">
                View application pipeline <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((letter) => {
              const style = STATUS_STYLES[letter.status] || STATUS_STYLES.Sent
              const daysLeft = daysUntilExpiry(letter.expiresAt)
              const urgent =
                daysLeft !== null && daysLeft <= 3 && letter.status !== "Accepted"
              const contact = recruiterContact(letter)
              const company = resolveCompany(letter)

              return (
                <div
                  key={letter._id}
                  className="group rounded-2xl border bg-white shadow-sm hover:shadow-xl hover:shadow-violet-100/40 transition-all duration-300 overflow-hidden"
                  style={{ borderLeftWidth: 4, borderLeftColor: style.accent }}
                >
                  <div className="p-5">
                    <div className="flex gap-4">
                      <CompanyAvatar letter={letter} size={52} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h2 className="text-lg font-bold text-slate-900 leading-tight">
                              {positionTitle(letter)}
                            </h2>
                            <p className="text-sm font-medium text-slate-600 flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3.5 w-3.5" />
                              {company}
                            </p>
                          </div>
                          <Badge variant="outline" className={style.className}>
                            <span className="flex items-center gap-1">
                              {style.icon}
                              {style.label}
                            </span>
                          </Badge>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {letter.offerDetails?.workLocation && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
                              <MapPin className="h-3 w-3" />
                              {letter.offerDetails.workLocation}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2 py-1 text-violet-700 font-semibold">
                            {formatMoney(
                              letter.compensation?.baseSalary,
                              letter.compensation?.currency,
                            )}
                            {letter.compensation?.salaryPeriod
                              ? ` / ${letter.compensation.salaryPeriod}`
                              : ""}
                          </span>
                          {letter.offerDetails?.employmentType && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-slate-600">
                              <Briefcase className="h-3 w-3" />
                              {letter.offerDetails.employmentType}
                            </span>
                          )}
                        </div>

                        {/* Deadline countdown — Feature */}
                        {letter.expiresAt &&
                          letter.status !== "Accepted" &&
                          letter.status !== "Rejected" && (
                            <div
                              className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium border ${
                                urgent
                                  ? "bg-amber-50 border-amber-200 text-amber-800"
                                  : "bg-slate-50 border-slate-200 text-slate-600"
                              }`}
                            >
                              <Timer className="h-3.5 w-3.5 shrink-0" />
                              {daysLeft !== null && daysLeft < 0
                                ? "Response deadline passed"
                                : daysLeft === 0
                                  ? "Respond today"
                                  : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left to respond`}
                              <span className="opacity-70">
                                · {format(new Date(letter.expiresAt), "MMM d, yyyy")}
                              </span>
                            </div>
                          )}

                        <OfferPipelineBar status={letter.status} />

                        <p className="mt-2 text-xs text-muted-foreground">
                          From {contact.name}
                          {letter.sentAt
                            ? ` · Sent ${formatDistanceToNow(new Date(letter.sentAt), { addSuffix: true })}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => downloadPdf(letter._id)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" /> PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => downloadPdf(letter._id, true)}
                      >
                        <Printer className="h-3.5 w-3.5 mr-1" /> Preview
                      </Button>
                      {contact.email && (
                        <Button variant="outline" size="sm" className="h-8" asChild>
                          <a href={`mailto:${contact.email}?subject=Re: Offer for ${positionTitle(letter)}`}>
                            <Mail className="h-3.5 w-3.5 mr-1" /> Contact HR
                          </a>
                        </Button>
                      )}
                      {letter.applicationId && (
                        <Button variant="ghost" size="sm" className="h-8" asChild>
                          <Link href="/dashboard/job-seeker/applications">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> Pipeline
                          </Link>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-8 bg-violet-600 hover:bg-violet-700 ml-auto"
                        onClick={() => openDetail(letter)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View full offer
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <CompanyAvatar letter={selected} size={44} />
                  <div>
                    <DialogTitle className="text-xl">{positionTitle(selected)}</DialogTitle>
                    <DialogDescription>
                      {resolveCompany(selected)} · {selected.offerDetails?.employmentType || "Full-time"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                </div>
              ) : (
                <div className="space-y-5 text-sm">
                  <OfferPipelineBar status={selected.status} />

                  {selected.customContent?.greeting && (
                    <p className="text-muted-foreground italic">{selected.customContent.greeting}</p>
                  )}
                  {selected.customContent?.introduction && <p>{selected.customContent.introduction}</p>}

                  <CompensationBreakdown letter={selected} />

                  <div className="grid gap-3 sm:grid-cols-2 rounded-xl border p-4 bg-slate-50/80">
                    {[
                      { label: "Department", value: selected.offerDetails?.department },
                      {
                        label: "Start date",
                        value: selected.offerDetails?.startDate
                          ? format(new Date(selected.offerDetails.startDate), "MMM d, yyyy")
                          : "TBD",
                      },
                      { label: "Location", value: selected.offerDetails?.workLocation },
                      { label: "Arrangement", value: selected.offerDetails?.workArrangement },
                      {
                        label: "Probation",
                        value: `${selected.terms?.probationPeriod ?? 0} months`,
                      },
                      {
                        label: "Notice period",
                        value: `${selected.terms?.noticePeriod ?? 0} days`,
                      },
                    ].map((row) => (
                      <div key={row.label}>
                        <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
                        <p className="font-medium">{row.value || "—"}</p>
                      </div>
                    ))}
                  </div>

                  {selected.compensation?.benefits?.length ? (
                    <div>
                      <p className="font-semibold mb-2 flex items-center gap-1">
                        <Sparkles className="h-4 w-4 text-violet-500" /> Benefits
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selected.compensation.benefits.map((b) => (
                          <Badge key={b} variant="secondary" className="bg-violet-50 text-violet-700">
                            {b}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selected.customContent?.additionalTerms && (
                    <div className="rounded-xl border p-3 bg-amber-50/50 border-amber-100">
                      <p className="font-medium mb-1">Additional terms</p>
                      <p className="text-muted-foreground whitespace-pre-wrap text-xs">
                        {selected.customContent.additionalTerms}
                      </p>
                    </div>
                  )}

                  <OfferTimeline history={selected.history} />

                  {selected.status === "Accepted" && <OnboardingChecklist letter={selected} />}

                  {selected.signature?.candidateSigned && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 text-xs">
                      <CheckCircle2 className="h-4 w-4 inline mr-1" />
                      Signed by {selected.signature.candidateSignature} on{" "}
                      {format(new Date(selected.signature.candidateSignedAt!), "MMM d, yyyy")}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => downloadPdf(selected._id)}
                  className="sm:mr-auto"
                >
                  <Download className="h-4 w-4 mr-2" /> Download PDF
                </Button>
                {canRespond && (
                  <>
                    <Button variant="outline" onClick={() => setRejectOpen(true)}>Decline</Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setAcceptOpen(true)}
                    >
                      Accept offer
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept offer</DialogTitle>
            <DialogDescription>
              Type your full name as your electronic signature to accept this offer.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Your full name"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>Cancel</Button>
            <Button
              disabled={!signature.trim() || actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => respond("accept", { signature: signature.trim() })}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm acceptance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline offer</DialogTitle>
            <DialogDescription>
              Optionally share why you are declining — this helps the recruiter.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => respond("reject", { reason: rejectReason.trim() || undefined })}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
