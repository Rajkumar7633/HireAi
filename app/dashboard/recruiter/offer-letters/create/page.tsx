"use client"

// ─── Full rewrite: Advanced Offer Letter Creator ──────────────────────────
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Loader2, FileText, Send, Save, Search, User, Building2, DollarSign,
  Shield, Sparkles, Eye, ChevronRight, ChevronLeft, CheckCircle2,
  Clock, Gift, Briefcase, MapPin, Calendar, Star, RefreshCw,
  AlertCircle, Check, X, Zap, TrendingUp, Award, Heart,
  Coffee, Car, GraduationCap, Laptop, Globe, Users,
  RotateCcw, ArrowLeft, Download, Copy, Bell, Lock,
} from "lucide-react"

interface Candidate {
  applicationId: string; candidateId: string; name: string
  email: string; jobTitle: string; status: string; score?: number
}
interface BenefitItem { id: string; label: string; icon: React.ReactElement; description: string }

const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "SGD", "AED"]
const BENEFIT_CATALOG: BenefitItem[] = [
  { id: "health", label: "Health Insurance", icon: <Heart className="h-4 w-4" />, description: "Medical, dental & vision" },
  { id: "dental", label: "Dental Coverage", icon: <Shield className="h-4 w-4" />, description: "Full dental plan" },
  { id: "vision", label: "Vision Coverage", icon: <Eye className="h-4 w-4" />, description: "Eyewear & exams" },
  { id: "401k", label: "401(k) / Retirement", icon: <TrendingUp className="h-4 w-4" />, description: "Company match" },
  { id: "pto", label: "Unlimited PTO", icon: <Calendar className="h-4 w-4" />, description: "Flexible time off" },
  { id: "remote", label: "Remote Work", icon: <Globe className="h-4 w-4" />, description: "Work from anywhere" },
  { id: "stipend", label: "Home Office Stipend", icon: <Laptop className="h-4 w-4" />, description: "Equipment allowance" },
  { id: "learning", label: "Learning Budget", icon: <GraduationCap className="h-4 w-4" />, description: "Courses & conferences" },
  { id: "wellness", label: "Wellness Program", icon: <Coffee className="h-4 w-4" />, description: "Gym & mental health" },
  { id: "commuter", label: "Commuter Benefits", icon: <Car className="h-4 w-4" />, description: "Transit & parking" },
  { id: "stock", label: "Employee Stock Purchase", icon: <Award className="h-4 w-4" />, description: "Discounted shares" },
  { id: "parental", label: "Parental Leave", icon: <Users className="h-4 w-4" />, description: "16+ weeks paid" },
]
const TEMPLATES = [
  { id: "standard", name: "Standard Offer", description: "Full-time employee — balanced and professional", tag: "Most Used", tagColor: "bg-violet-100 text-violet-700",
    defaults: { employmentType: "Full-time", probationPeriod: 3, noticePeriod: 30, vacationDays: 20, benefits: ["health", "dental", "401k", "pto"] },
    intro: "We are pleased to extend this offer of employment for the position described below. We believe your skills and experience are an excellent match for our team.",
    closing: "We look forward to welcoming you to our team. Please sign and return this letter by the expiration date to confirm your acceptance." },
  { id: "senior", name: "Senior / Lead", description: "Experienced hires with enhanced compensation", tag: "Popular", tagColor: "bg-blue-100 text-blue-700",
    defaults: { employmentType: "Full-time", probationPeriod: 0, noticePeriod: 60, vacationDays: 25, benefits: ["health", "dental", "vision", "401k", "pto", "stipend", "learning"] },
    intro: "After a thorough evaluation process, we are thrilled to offer you this senior position. Your proven track record and leadership capabilities make you an outstanding candidate.",
    closing: "We are excited about the value you will bring and look forward to building something great together." },
  { id: "executive", name: "Executive", description: "C-level and VP roles with full package", tag: "Premium", tagColor: "bg-amber-100 text-amber-700",
    defaults: { employmentType: "Full-time", probationPeriod: 0, noticePeriod: 90, vacationDays: 30, benefits: ["health", "dental", "vision", "401k", "pto", "stipend", "learning", "wellness", "stock"] },
    intro: "Following an extensive search, we are honored to extend this executive offer. Your strategic vision and leadership record align perfectly with our company's direction and ambitions.",
    closing: "We are confident in your ability to drive transformational impact. We look forward to your leadership and to formally welcoming you to the team." },
  { id: "contract", name: "Contract / Freelance", description: "Fixed-term or project-based engagement", tag: "Flexible", tagColor: "bg-green-100 text-green-700",
    defaults: { employmentType: "Contract", probationPeriod: 0, noticePeriod: 14, vacationDays: 0, benefits: [] },
    intro: "We are pleased to engage your services on a contract basis for the project described below. The terms of this engagement are outlined in this letter.",
    closing: "Please review and sign this letter to confirm your engagement. We look forward to working together." },
  { id: "internship", name: "Internship", description: "Intern offer with learning-first terms", tag: "Entry Level", tagColor: "bg-pink-100 text-pink-700",
    defaults: { employmentType: "Internship", probationPeriod: 0, noticePeriod: 7, vacationDays: 5, benefits: ["learning", "wellness"] },
    intro: "We are excited to offer you an internship position with our team. This is a fantastic opportunity to gain hands-on experience and contribute to real-world projects.",
    closing: "We believe this internship will be a rewarding experience. We look forward to supporting your professional growth." },
]
const STEPS = [
  { id: 0, label: "Candidate", icon: <User className="h-4 w-4" /> },
  { id: 1, label: "Template", icon: <FileText className="h-4 w-4" /> },
  { id: 2, label: "Position", icon: <Briefcase className="h-4 w-4" /> },
  { id: 3, label: "Compensation", icon: <DollarSign className="h-4 w-4" /> },
  { id: 4, label: "Benefits & Terms", icon: <Gift className="h-4 w-4" /> },
  { id: 5, label: "Content", icon: <Sparkles className="h-4 w-4" /> },
  { id: 6, label: "Review & Send", icon: <Send className="h-4 w-4" /> },
]
const DRAFT_KEY = "hire_ai_offer_draft"

function fmtSalary(amount: number, currency: string, period: string): string {
  if (!amount) return "—"
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount)
  return `${formatted} / ${period.toLowerCase()}`
}
function addDays(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().split("T")[0]
}

export default function CreateOfferLetterPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [draftRecovered, setDraftRecovered] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null)
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  const [candidateQuery, setCandidateQuery] = useState("")
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)

  const [selectedTemplate, setSelectedTemplate] = useState("standard")
  const [offerDetails, setOfferDetails] = useState({
    position: "", department: "", startDate: "", employmentType: "Full-time",
    reportingTo: "", workLocation: "", workArrangement: "On-site", jobLevel: "", jobCode: "",
  })
  const [compensation, setCompensation] = useState({
    baseSalary: "", currency: "USD", salaryPeriod: "Annual",
    bonus: "", bonusType: "Performance", signingBonus: "",
    equityGranted: false, equityType: "", equityQuantity: "", vestingSchedule: "", strikePrice: "",
    relocationIncluded: false, relocationAmount: "", relocationDetails: "",
  })
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>(["health", "dental", "401k", "pto"])
  const [terms, setTerms] = useState({
    probationPeriod: "3", noticePeriod: "30", workingHours: "40 hours/week",
    vacationDays: "20", sickDays: "10", otherTerms: "",
    backgroundCheckRequired: false, ndaRequired: false, nonCompete: false,
  })
  const [customContent, setCustomContent] = useState({
    greeting: "", introduction: "", additionalTerms: "", closing: "",
  })
  const [expiresAt, setExpiresAt] = useState(addDays(14))
  const [approvalRequired, setApprovalRequired] = useState(false)
  const [internalNotes, setInternalNotes] = useState("")
  const [aiGenerating, setAiGenerating] = useState(false)

  const showToast = useCallback((msg: string, type: "success" | "error" | "info" = "info") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }, [])

  const getDraftPayload = useCallback(() => ({
    selectedCandidate, selectedTemplate, offerDetails, compensation,
    selectedBenefits, terms, customContent, expiresAt, approvalRequired, internalNotes,
  }), [selectedCandidate, selectedTemplate, offerDetails, compensation, selectedBenefits, terms, customContent, expiresAt, approvalRequired, internalNotes])

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: getDraftPayload(), ts: Date.now() }))
      setSavedAt(new Date().toLocaleTimeString())
    } catch (_) {}
  }, [getDraftPayload])

  useEffect(() => {
    autoSaveTimer.current = setInterval(saveDraft, 30_000)
    return () => { if (autoSaveTimer.current) clearInterval(autoSaveTimer.current) }
  }, [saveDraft])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY); if (!raw) return
      const { data, ts } = JSON.parse(raw)
      if (Date.now() - ts > 7 * 86400000) { localStorage.removeItem(DRAFT_KEY); return }
      setDraftRecovered(true)
      if (data.selectedCandidate) setSelectedCandidate(data.selectedCandidate)
      if (data.selectedTemplate) setSelectedTemplate(data.selectedTemplate)
      if (data.offerDetails) setOfferDetails(data.offerDetails)
      if (data.compensation) setCompensation(data.compensation)
      if (data.selectedBenefits) setSelectedBenefits(data.selectedBenefits)
      if (data.terms) setTerms(data.terms)
      if (data.customContent) setCustomContent(data.customContent)
      if (data.expiresAt) setExpiresAt(data.expiresAt)
      if (typeof data.approvalRequired === "boolean") setApprovalRequired(data.approvalRequired)
      if (data.internalNotes) setInternalNotes(data.internalNotes)
    } catch (_) {}
  }, [])

  const searchCandidates = useCallback(async (q: string) => {
    setSearchLoading(true)
    try {
      const res = await fetch(`/api/offer-letter?candidateSearch=${encodeURIComponent(q)}`)
      const data = await res.json(); setCandidates(data.candidates || [])
    } catch { setCandidates([]) }
    finally { setSearchLoading(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchCandidates(candidateQuery), 350)
    return () => clearTimeout(t)
  }, [candidateQuery, searchCandidates])
  useEffect(() => { searchCandidates("") }, [searchCandidates])

  const applyTemplate = useCallback((tplId: string) => {
    const tpl = TEMPLATES.find((t) => t.id === tplId); if (!tpl) return
    setSelectedTemplate(tplId)
    setOfferDetails((p) => ({ ...p, employmentType: tpl.defaults.employmentType }))
    setTerms((p) => ({ ...p, probationPeriod: String(tpl.defaults.probationPeriod), noticePeriod: String(tpl.defaults.noticePeriod), vacationDays: String(tpl.defaults.vacationDays) }))
    setSelectedBenefits(tpl.defaults.benefits)
    setCustomContent((p) => ({ ...p, introduction: tpl.intro, closing: tpl.closing, greeting: selectedCandidate ? `Dear ${selectedCandidate.name.split(" ")[0]},` : p.greeting }))
    showToast(`Template "${tpl.name}" applied`, "success")
  }, [selectedCandidate, showToast])

  const generateAIContent = async () => {
    setAiGenerating(true)
    await new Promise((r) => setTimeout(r, 1800))
    const tpl = TEMPLATES.find((t) => t.id === selectedTemplate) ?? TEMPLATES[0]
    const firstName = selectedCandidate?.name.split(" ")[0] ?? "Candidate"
    setCustomContent({
      greeting: `Dear ${firstName},`,
      introduction: tpl.intro + (offerDetails.position ? ` The role of ${offerDetails.position} is a key position within our ${offerDetails.department || "organization"}.` : ""),
      additionalTerms: `This offer is contingent upon satisfactory completion of background screening and reference checks.${terms.ndaRequired ? " You will also be required to sign a Non-Disclosure Agreement prior to your start date." : ""}`,
      closing: tpl.closing,
    })
    setAiGenerating(false); showToast("Content generated by AI", "success")
  }

  const buildPayload = () => ({
    action: "create",
    applicationId: selectedCandidate?.applicationId || undefined,
    candidateId: selectedCandidate?.candidateId || undefined,
    templateId: selectedTemplate,
    offerDetails: { ...offerDetails, startDate: offerDetails.startDate || undefined },
    compensation: {
      baseSalary: parseFloat(compensation.baseSalary) || 0,
      currency: compensation.currency, salaryPeriod: compensation.salaryPeriod,
      bonus: parseFloat(compensation.bonus) || 0, bonusType: compensation.bonusType,
      signingBonus: parseFloat(compensation.signingBonus) || 0,
      equity: compensation.equityGranted
        ? { granted: true, type: compensation.equityType, quantity: parseFloat(compensation.equityQuantity) || 0, vestingSchedule: compensation.vestingSchedule, strikePrice: parseFloat(compensation.strikePrice) || 0 }
        : { granted: false },
      benefits: selectedBenefits.map((id) => BENEFIT_CATALOG.find((b) => b.id === id)?.label ?? id),
      relocation: compensation.relocationIncluded
        ? { included: true, amount: parseFloat(compensation.relocationAmount) || 0, details: compensation.relocationDetails }
        : { included: false },
    },
    terms: { probationPeriod: parseInt(terms.probationPeriod) || 0, noticePeriod: parseInt(terms.noticePeriod) || 30, workingHours: terms.workingHours, vacationDays: parseInt(terms.vacationDays) || 0, sickDays: parseInt(terms.sickDays) || 0, otherTerms: terms.otherTerms, backgroundCheckRequired: terms.backgroundCheckRequired, ndaRequired: terms.ndaRequired, nonCompete: terms.nonCompete },
    customContent, expiresAt: new Date(expiresAt).toISOString(), approvalRequired, internalNotes,
  })

  const handleSaveDraft = async () => {
    setSubmitting(true)
    try {
      const res = await fetch("/api/offer-letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) })
      const data = await res.json()
      if (data.success) { localStorage.removeItem(DRAFT_KEY); showToast("Draft saved!", "success"); setTimeout(() => router.push("/dashboard/recruiter/offer-letters"), 800) }
      else showToast(data.message || "Failed", "error")
    } catch { showToast("Network error", "error") } finally { setSubmitting(false) }
  }

  const handleSend = async () => {
    setSubmitting(true)
    try {
      const createRes = await fetch("/api/offer-letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()) })
      const createData = await createRes.json()
      if (!createData.success) { showToast(createData.message || "Create failed", "error"); return }
      if (!approvalRequired) {
        const sendRes = await fetch("/api/offer-letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", offerLetterId: createData.offerLetter._id }) })
        const sendData = await sendRes.json()
        if (!sendData.success) { showToast(sendData.message || "Send failed", "error"); return }
        showToast("Offer letter sent!", "success")
      } else {
        showToast("Submitted for approval!", "success")
      }
      localStorage.removeItem(DRAFT_KEY)
      setTimeout(() => router.push("/dashboard/recruiter/offer-letters"), 1000)
    } catch { showToast("Network error", "error") } finally { setSubmitting(false) }
  }

  const annualBase = parseFloat(compensation.baseSalary) || 0
  const annualBonus = parseFloat(compensation.bonus) || 0
  const signingBonus = parseFloat(compensation.signingBonus) || 0
  const totalComp = annualBase + annualBonus + signingBonus
  const benefitItems = BENEFIT_CATALOG.filter((b) => selectedBenefits.includes(b.id))
  const daysUntilExpiry = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 86400000))
  const isValid = !!selectedCandidate && !!offerDetails.position && !!compensation.baseSalary
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  return (
    <div className="w-full">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-emerald-600 text-white" : toast.type === "error" ? "bg-red-600 text-white" : "bg-slate-800 text-white"}`}>
          {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : toast.type === "error" ? <X className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Hero banner */}
      <div className="relative bg-gradient-to-r from-violet-700 via-indigo-600 to-blue-600 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:`radial-gradient(circle at 20% 50%,#fff 0,transparent 50%),radial-gradient(circle at 80% 20%,#a5b4fc 0,transparent 40%)`}} />
        <div className="relative px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <div className="w-px h-6 bg-white/25 shrink-0" />
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">Create Offer Letter</h1>
              <p className="text-white/60 text-[11px]">{STEPS[step].label} — Step {step + 1} of {STEPS.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedAt && (
              <span className="hidden sm:flex items-center gap-1 text-white/50 text-[11px]">
                <Check className="h-3 w-3" /> Saved {savedAt}
              </span>
            )}
            <button onClick={() => setPreviewOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                previewOpen ? "bg-white text-violet-700 border-white" : "bg-white/10 border-white/20 text-white hover:bg-white/20"
              }`}>
              <Eye className="h-3.5 w-3.5" /> {previewOpen ? "Hide Preview" : "Preview"}
            </button>
            <button onClick={saveDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all">
              <Save className="h-3.5 w-3.5" /> Save Draft
            </button>
          </div>
        </div>
        {/* Step progress bar inside banner */}
        <div className="px-6 pb-4 flex items-center gap-0 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center shrink-0">
              <button
                onClick={() => i <= step && setStep(i)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  i === step
                    ? "bg-white text-violet-700 shadow"
                    : i < step
                    ? "text-white/90 hover:bg-white/10 cursor-pointer"
                    : "text-white/35 cursor-default"
                }`}
              >
                <span className={`flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold shrink-0 ${
                  i === step ? "bg-violet-600 text-white" : i < step ? "bg-white/30 text-white" : "bg-white/15 text-white/40"
                }`}>
                  {i < step ? <Check className="h-2.5 w-2.5" /> : i + 1}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-px mx-1 w-4 shrink-0 ${i < step ? "bg-white/50" : "bg-white/15"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Draft recovery banner */}
      {draftRecovered && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700 text-sm">
            <RotateCcw className="h-4 w-4" />
            <span className="font-medium">Draft recovered</span>
            <span className="text-amber-600">— your previous unsaved work has been restored.</span>
          </div>
          <Button size="sm" variant="ghost" className="text-amber-600 hover:bg-amber-100 h-7 text-xs"
            onClick={() => { localStorage.removeItem(DRAFT_KEY); setDraftRecovered(false); showToast("Draft cleared", "info") }}>
            <X className="h-3 w-3 mr-1" /> Discard
          </Button>
        </div>
      )}

      <div className="w-full px-4 sm:px-6 pt-5 pb-6">
        <div className={`grid gap-5 ${previewOpen ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-[3fr_2fr]"}`}>
          {/* ── Wizard ─────────────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Step 0: Candidate */}
            {step === 0 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center"><User className="h-4 w-4 text-violet-600" /></div>
                    Select Candidate
                  </CardTitle>
                  <CardDescription>Search from your hiring pipeline — hired, shortlisted, or interview stage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input className="pl-9" placeholder="Search by name, email, or job title…" value={candidateQuery} onChange={(e) => setCandidateQuery(e.target.value)} />
                    {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />}
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {candidates.length === 0 && !searchLoading && (
                      <div className="text-center py-10 text-slate-400">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No candidates in pipeline yet.</p>
                        <p className="text-xs mt-1">Candidates in hired, shortlisted or interview stages will appear here.</p>
                      </div>
                    )}
                    {candidates.map((c) => (
                      <button key={c.applicationId} onClick={() => { setSelectedCandidate(c); setCustomContent((p) => ({ ...p, greeting: `Dear ${c.name.split(" ")[0]},` })) }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedCandidate?.applicationId === c.applicationId ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-violet-200 hover:bg-slate-50"}`}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-slate-800">{c.name}</p>
                          <p className="text-xs text-slate-500 truncate">{c.email}</p>
                          <p className="text-xs text-slate-400 truncate">{c.jobTitle}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className={`text-[10px] ${c.status === "Hired" || c.status === "hired" ? "bg-green-100 text-green-700 border-green-200" : c.status === "Shortlisted" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>{c.status}</Badge>
                          {c.score !== undefined && <span className="text-[10px] text-slate-400">Score: {c.score}%</span>}
                        </div>
                        {selectedCandidate?.applicationId === c.applicationId && <Check className="h-4 w-4 text-violet-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                  {selectedCandidate && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50 border border-violet-200">
                      <CheckCircle2 className="h-4 w-4 text-violet-600" />
                      <span className="text-sm font-medium text-violet-800">Selected: <strong>{selectedCandidate.name}</strong> for <strong>{selectedCandidate.jobTitle}</strong></span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 1: Template */}
            {step === 1 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center"><FileText className="h-4 w-4 text-blue-600" /></div>
                    Choose Template
                  </CardTitle>
                  <CardDescription>Select a pre-built template that auto-fills standard terms and letter content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TEMPLATES.map((tpl) => (
                      <button key={tpl.id} onClick={() => applyTemplate(tpl.id)}
                        className={`text-left p-4 rounded-xl border transition-all ${selectedTemplate === tpl.id ? "border-violet-400 bg-violet-50 shadow-sm" : "border-slate-200 hover:border-violet-200 hover:bg-slate-50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-sm">{tpl.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tpl.tagColor}`}>{tpl.tag}</span>
                        </div>
                        <p className="text-xs text-slate-500">{tpl.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tpl.defaults.benefits.slice(0, 3).map((b) => (
                            <span key={b} className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500">{BENEFIT_CATALOG.find((bc) => bc.id === b)?.label ?? b}</span>
                          ))}
                          {tpl.defaults.benefits.length > 3 && <span className="text-[10px] text-slate-400">+{tpl.defaults.benefits.length - 3}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Position */}
            {step === 2 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center"><Briefcase className="h-4 w-4 text-indigo-600" /></div>
                    Position Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-xs font-medium">Position Title <span className="text-red-500">*</span></Label><Input className="mt-1" placeholder="e.g. Senior Frontend Engineer" value={offerDetails.position} onChange={(e) => setOfferDetails({ ...offerDetails, position: e.target.value })} /></div>
                    <div><Label className="text-xs font-medium">Department</Label><Input className="mt-1" placeholder="e.g. Engineering" value={offerDetails.department} onChange={(e) => setOfferDetails({ ...offerDetails, department: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-xs font-medium">Start Date</Label><Input className="mt-1" type="date" value={offerDetails.startDate} onChange={(e) => setOfferDetails({ ...offerDetails, startDate: e.target.value })} /></div>
                    <div><Label className="text-xs font-medium">Employment Type</Label>
                      <Select value={offerDetails.employmentType} onValueChange={(v) => setOfferDetails({ ...offerDetails, employmentType: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{["Full-time","Part-time","Contract","Internship"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-xs font-medium">Reporting To</Label><Input className="mt-1" placeholder="e.g. Engineering Manager" value={offerDetails.reportingTo} onChange={(e) => setOfferDetails({ ...offerDetails, reportingTo: e.target.value })} /></div>
                    <div><Label className="text-xs font-medium">Work Location</Label><Input className="mt-1" placeholder="e.g. New York or Remote" value={offerDetails.workLocation} onChange={(e) => setOfferDetails({ ...offerDetails, workLocation: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label className="text-xs font-medium">Work Arrangement</Label>
                      <Select value={offerDetails.workArrangement} onValueChange={(v) => setOfferDetails({ ...offerDetails, workArrangement: v })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>{["On-site","Remote","Hybrid"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs font-medium">Job Level</Label><Input className="mt-1" placeholder="e.g. L5, Senior" value={offerDetails.jobLevel} onChange={(e) => setOfferDetails({ ...offerDetails, jobLevel: e.target.value })} /></div>
                    <div><Label className="text-xs font-medium">Job Code</Label><Input className="mt-1" placeholder="e.g. ENG-501" value={offerDetails.jobCode} onChange={(e) => setOfferDetails({ ...offerDetails, jobCode: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Compensation */}
            {step === 3 && (
              <div className="space-y-4">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center"><DollarSign className="h-4 w-4 text-green-600" /></div>
                      Compensation Package
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">Base Salary <span className="text-red-500">*</span></Label>
                      <div className="grid grid-cols-3 gap-3">
                        <Select value={compensation.currency} onValueChange={(v) => setCompensation({ ...compensation, currency: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                        <Input type="number" placeholder="100,000" value={compensation.baseSalary} onChange={(e) => setCompensation({ ...compensation, baseSalary: e.target.value })} />
                        <Select value={compensation.salaryPeriod} onValueChange={(v) => setCompensation({ ...compensation, salaryPeriod: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{["Annual","Monthly","Hourly"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">Bonus</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Input type="number" placeholder="10,000" value={compensation.bonus} onChange={(e) => setCompensation({ ...compensation, bonus: e.target.value })} />
                        <Input placeholder="Bonus type (e.g. Performance)" value={compensation.bonusType} onChange={(e) => setCompensation({ ...compensation, bonusType: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">Signing Bonus</Label>
                      <Input type="number" placeholder="e.g. 5,000" value={compensation.signingBonus} onChange={(e) => setCompensation({ ...compensation, signingBonus: e.target.value })} />
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border space-y-3">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">Equity / Stock Options</p><p className="text-xs text-slate-500">RSUs, stock options, or share grants</p></div>
                        <Switch checked={compensation.equityGranted} onCheckedChange={(v) => setCompensation({ ...compensation, equityGranted: v })} />
                      </div>
                      {compensation.equityGranted && (
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <Input placeholder="Type (e.g. RSU, ISO)" value={compensation.equityType} onChange={(e) => setCompensation({ ...compensation, equityType: e.target.value })} />
                          <Input type="number" placeholder="Number of shares" value={compensation.equityQuantity} onChange={(e) => setCompensation({ ...compensation, equityQuantity: e.target.value })} />
                          <Input placeholder="Vesting (e.g. 4yr / 1yr cliff)" value={compensation.vestingSchedule} onChange={(e) => setCompensation({ ...compensation, vestingSchedule: e.target.value })} />
                          <Input type="number" placeholder="Strike price" value={compensation.strikePrice} onChange={(e) => setCompensation({ ...compensation, strikePrice: e.target.value })} />
                        </div>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border space-y-3">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">Relocation Package</p><p className="text-xs text-slate-500">Assistance for candidates relocating</p></div>
                        <Switch checked={compensation.relocationIncluded} onCheckedChange={(v) => setCompensation({ ...compensation, relocationIncluded: v })} />
                      </div>
                      {compensation.relocationIncluded && (
                        <div className="space-y-2 pt-1">
                          <Input type="number" placeholder="Relocation allowance amount" value={compensation.relocationAmount} onChange={(e) => setCompensation({ ...compensation, relocationAmount: e.target.value })} />
                          <Textarea rows={2} placeholder="Relocation details…" value={compensation.relocationDetails} onChange={(e) => setCompensation({ ...compensation, relocationDetails: e.target.value })} />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                {annualBase > 0 && (
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className="p-4">
                      <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3">Total Compensation Summary</p>
                      <div className="space-y-2">
                        {[["Base Salary", annualBase, "bg-violet-500"],["Target Bonus", annualBonus, "bg-blue-400"],["Signing Bonus", signingBonus, "bg-amber-400"]].map(([label, amount, color]) => (
                          <div key={String(label)} className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                            <span className="text-xs text-slate-600 flex-1">{label}</span>
                            <span className="text-sm font-semibold text-slate-800">{Number(amount) > 0 ? fmtSalary(Number(amount), compensation.currency, "yr") : "—"}</span>
                            {Number(amount) > 0 && totalComp > 0 && (
                              <div className="w-20 h-1.5 bg-white/70 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round((Number(amount) / totalComp) * 100)}%` }} />
                              </div>
                            )}
                          </div>
                        ))}
                        <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                          <span className="text-sm font-semibold text-emerald-800">Total Package</span>
                          <span className="text-xl font-bold text-emerald-700">{fmtSalary(totalComp, compensation.currency, "yr")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Step 4: Benefits & Terms */}
            {step === 4 && (
              <div className="space-y-4">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center"><Gift className="h-4 w-4 text-pink-600" /></div>
                      Benefits Package
                    </CardTitle>
                    <CardDescription>Toggle benefits included in this offer</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {BENEFIT_CATALOG.map((b) => {
                        const active = selectedBenefits.includes(b.id)
                        return (
                          <button key={b.id} onClick={() => setSelectedBenefits((prev) => active ? prev.filter((x) => x !== b.id) : [...prev, b.id])}
                            className={`flex items-start gap-2 p-3 rounded-xl border text-left transition-all ${active ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                            <div className={`mt-0.5 shrink-0 ${active ? "text-violet-600" : "text-slate-400"}`}>{b.icon}</div>
                            <div>
                              <p className={`text-xs font-semibold ${active ? "text-violet-800" : "text-slate-700"}`}>{b.label}</p>
                              <p className="text-[10px] text-slate-400">{b.description}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-slate-400 mt-3">{selectedBenefits.length} benefit{selectedBenefits.length !== 1 ? "s" : ""} selected</p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center"><Clock className="h-4 w-4 text-amber-600" /></div>
                      Employment Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label className="text-xs font-medium">Probation (months)</Label><Input className="mt-1" type="number" min="0" value={terms.probationPeriod} onChange={(e) => setTerms({ ...terms, probationPeriod: e.target.value })} /></div>
                      <div><Label className="text-xs font-medium">Notice Period (days)</Label><Input className="mt-1" type="number" min="0" value={terms.noticePeriod} onChange={(e) => setTerms({ ...terms, noticePeriod: e.target.value })} /></div>
                      <div><Label className="text-xs font-medium">Working Hours/wk</Label><Input className="mt-1" value={terms.workingHours} onChange={(e) => setTerms({ ...terms, workingHours: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs font-medium">Vacation Days</Label><Input className="mt-1" type="number" min="0" value={terms.vacationDays} onChange={(e) => setTerms({ ...terms, vacationDays: e.target.value })} /></div>
                      <div><Label className="text-xs font-medium">Sick Days</Label><Input className="mt-1" type="number" min="0" value={terms.sickDays} onChange={(e) => setTerms({ ...terms, sickDays: e.target.value })} /></div>
                    </div>
                    <div><Label className="text-xs font-medium">Additional Terms</Label><Textarea className="mt-1" rows={2} placeholder="Any additional contractual terms…" value={terms.otherTerms} onChange={(e) => setTerms({ ...terms, otherTerms: e.target.value })} /></div>
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Compliance & Legal</p>
                      {[{ key: "backgroundCheckRequired", label: "Background Check Required" },{ key: "ndaRequired", label: "NDA Required" },{ key: "nonCompete", label: "Non-Compete Clause" }].map((item) => (
                        <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border">
                          <div className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-slate-400" /><span className="text-sm text-slate-700">{item.label}</span></div>
                          <Switch checked={terms[item.key as keyof typeof terms] as boolean} onCheckedChange={(v) => setTerms({ ...terms, [item.key]: v })} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 5: Content */}
            {step === 5 && (
              <Card className="border shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-fuchsia-100 flex items-center justify-center"><Sparkles className="h-4 w-4 text-fuchsia-600" /></div>
                      Letter Content
                    </CardTitle>
                    <Button size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50 text-xs" onClick={generateAIContent} disabled={aiGenerating}>
                      {aiGenerating ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Generating…</> : <><Zap className="h-3.5 w-3.5 mr-1.5" /> AI Generate</>}
                    </Button>
                  </div>
                  <CardDescription>Personalize the letter or use AI to auto-write the content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div><Label className="text-xs font-medium">Greeting</Label><Input className="mt-1" placeholder="e.g. Dear John," value={customContent.greeting} onChange={(e) => setCustomContent({ ...customContent, greeting: e.target.value })} /></div>
                  <div><Label className="text-xs font-medium">Introduction</Label><Textarea className="mt-1" rows={4} placeholder="Opening paragraph…" value={customContent.introduction} onChange={(e) => setCustomContent({ ...customContent, introduction: e.target.value })} /></div>
                  <div><Label className="text-xs font-medium">Additional Terms / Custom Clauses</Label><Textarea className="mt-1" rows={3} placeholder="Any special clauses or contingencies…" value={customContent.additionalTerms} onChange={(e) => setCustomContent({ ...customContent, additionalTerms: e.target.value })} /></div>
                  <div><Label className="text-xs font-medium">Closing</Label><Textarea className="mt-1" rows={2} placeholder="Closing paragraph before signature…" value={customContent.closing} onChange={(e) => setCustomContent({ ...customContent, closing: e.target.value })} /></div>
                  <div><Label className="text-xs font-medium">Internal Notes <span className="text-slate-400 font-normal">(not visible to candidate)</span></Label><Textarea className="mt-1" rows={2} placeholder="Notes for your team…" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} /></div>
                </CardContent>
              </Card>
            )}

            {/* Step 6: Review & Send */}
            {step === 6 && (
              <div className="space-y-4">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center"><Clock className="h-4 w-4 text-orange-600" /></div>
                      Offer Expiry
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {[7, 14, 30, 60].map((d) => (
                        <Button key={d} size="sm" variant="outline" className={`text-xs ${expiresAt === addDays(d) ? "border-violet-400 bg-violet-50 text-violet-700" : ""}`} onClick={() => setExpiresAt(addDays(d))}>{d} days</Button>
                      ))}
                      <Input type="date" className="w-40 h-8 text-xs" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                    </div>
                    {daysUntilExpiry > 0 && (
                      <div className={`flex items-center gap-2 text-sm ${daysUntilExpiry <= 7 ? "text-amber-600" : "text-slate-600"}`}>
                        <Bell className="h-4 w-4" />
                        Offer expires in <strong>{daysUntilExpiry} days</strong> — on {new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center"><Shield className="h-4 w-4 text-blue-600" /></div>
                      Approval Workflow
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border">
                      <div><p className="text-sm font-medium">Require Manager Approval</p><p className="text-xs text-slate-500">Offer will be submitted for review before sending</p></div>
                      <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3"><CardTitle className="text-base">Pre-send Checklist</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[
                        { label: "Candidate selected", ok: !!selectedCandidate },
                        { label: "Position title filled", ok: !!offerDetails.position },
                        { label: "Base salary set", ok: !!compensation.baseSalary },
                        { label: "Start date provided", ok: !!offerDetails.startDate },
                        { label: "Expiry date set", ok: !!expiresAt },
                        { label: "Letter content added", ok: !!(customContent.introduction || customContent.greeting) },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2.5 text-sm">
                          {item.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-400" />}
                          <span className={item.ok ? "text-slate-700" : "text-amber-600"}>{item.label}</span>
                          {!item.ok && <span className="text-xs text-amber-500">(recommended)</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                {selectedCandidate && (
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-indigo-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold">{selectedCandidate.name.charAt(0).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800">{selectedCandidate.name}</p>
                          <p className="text-xs text-slate-500">{selectedCandidate.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-violet-700">{compensation.baseSalary ? fmtSalary(parseFloat(compensation.baseSalary), compensation.currency, compensation.salaryPeriod) : "—"}</p>
                          <p className="text-xs text-slate-500">{offerDetails.position || "—"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center gap-2">
                {step < STEPS.length - 1 ? (
                  <Button className="bg-violet-600 hover:bg-violet-700" onClick={() => setStep((s) => s + 1)}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleSaveDraft} disabled={submitting}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Save Draft
                    </Button>
                    <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleSend} disabled={submitting || !isValid}>
                      {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…</> : approvalRequired ? <><Shield className="h-4 w-4 mr-2" /> Submit for Approval</> : <><Send className="h-4 w-4 mr-2" /> Send Offer</>}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Right panel: Summary sidebar (no preview) OR Live Preview ── */}
          {!previewOpen && (
            <div className="lg:sticky lg:top-4 h-fit space-y-4">
              {/* Offer summary card */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center"><FileText className="h-3.5 w-3.5 text-violet-600" /></div>
                    Offer Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Candidate */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {selectedCandidate ? selectedCandidate.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{selectedCandidate?.name || <span className="text-slate-400">No candidate selected</span>}</p>
                      <p className="text-[10px] text-slate-400 truncate">{selectedCandidate?.email || ""}</p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {([
                      { label: "Position", value: offerDetails.position || "—" },
                      { label: "Department", value: offerDetails.department || "—" },
                      { label: "Type", value: offerDetails.employmentType },
                      { label: "Start Date", value: offerDetails.startDate ? new Date(offerDetails.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—" },
                      { label: "Location", value: offerDetails.workLocation || "—" },
                    ] as Array<{ label: string; value: string }>).map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-start gap-2 py-1.5 text-xs">
                        <span className="text-slate-400 shrink-0">{label}</span>
                        <span className="font-medium text-slate-700 text-right truncate">{value}</span>
                      </div>
                    ))}
                  </div>
                  {annualBase > 0 && (
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100">
                      <p className="text-[10px] font-semibold text-violet-500 uppercase tracking-wide mb-1">Total Package</p>
                      <p className="text-lg font-bold text-violet-700">{fmtSalary(totalComp, compensation.currency, "yr")}</p>
                      {annualBonus > 0 && <p className="text-[10px] text-violet-400">incl. {fmtSalary(annualBonus, compensation.currency, "yr")} bonus</p>}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Benefits selected */}
              {selectedBenefits.length > 0 && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-pink-100 flex items-center justify-center"><Gift className="h-3.5 w-3.5 text-pink-600" /></div>
                      Benefits ({selectedBenefits.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedBenefits.map((id) => {
                        const b = BENEFIT_CATALOG.find((bc) => bc.id === id)
                        return b ? (
                          <span key={id} className="flex items-center gap-1 text-[10px] bg-violet-50 border border-violet-100 text-violet-700 rounded-full px-2 py-0.5">
                            {b.icon}<span>{b.label}</span>
                          </span>
                        ) : null
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step progress */}
              <Card className="border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Progress</p>
                  <div className="space-y-2">
                    {STEPS.map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 ${i < step ? "bg-violet-600 text-white" : i === step ? "bg-violet-100 text-violet-700 ring-1 ring-violet-400" : "bg-slate-100 text-slate-400"}`}>
                          {i < step ? <Check className="h-3 w-3" /> : i + 1}
                        </div>
                        <span className={`text-xs ${i <= step ? "text-slate-700 font-medium" : "text-slate-400"}`}>{s.label}</span>
                        {i === step && <span className="ml-auto text-[10px] bg-violet-100 text-violet-600 rounded-full px-2 py-0.5">Current</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all" style={{ width: `${((step) / (STEPS.length - 1)) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 text-right">Step {step + 1} of {STEPS.length}</p>
                </CardContent>
              </Card>

              {/* Preview toggle hint */}
              <button
                onClick={() => setPreviewOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-500 transition-colors text-xs font-medium"
              >
                <Eye className="h-4 w-4" /> Open Live Letter Preview
              </button>
            </div>
          )}

          {previewOpen && (
            <div className="lg:sticky lg:top-4 h-fit">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" /> Live Preview</CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Copy className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-y-auto max-h-[75vh] p-6 text-sm text-slate-800 font-serif space-y-4 bg-white leading-relaxed">
                    <div className="border-b pb-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div><p className="font-bold text-lg text-violet-700">HireAI</p><p className="text-xs text-slate-400">Recruiting Platform</p></div>
                        <p className="text-xs text-slate-400">{today}</p>
                      </div>
                    </div>
                    {selectedCandidate && <div className="space-y-0.5"><p className="font-semibold">{selectedCandidate.name}</p><p className="text-slate-500 text-xs">{selectedCandidate.email}</p></div>}
                    <p>{customContent.greeting || `Dear ${selectedCandidate?.name.split(" ")[0] ?? "Candidate"},`}</p>
                    {offerDetails.position && <p className="font-semibold">RE: Offer of Employment — {offerDetails.position}{offerDetails.department ? `, ${offerDetails.department}` : ""}</p>}
                    {customContent.introduction && <p>{customContent.introduction}</p>}
                    {offerDetails.position && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                        <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-600 border-b text-xs uppercase tracking-wide">Offer Details</div>
                        <div className="divide-y">
                          {[["Position", offerDetails.position],["Department", offerDetails.department],["Employment Type", offerDetails.employmentType],["Work Arrangement", offerDetails.workArrangement],["Work Location", offerDetails.workLocation],["Start Date", offerDetails.startDate ? new Date(offerDetails.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""],["Reporting To", offerDetails.reportingTo]].filter(([, v]) => v).map(([k, v]) => (
                            <div key={k} className="flex px-3 py-1.5"><span className="w-32 text-slate-500 shrink-0">{k}</span><span className="font-medium">{v}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {compensation.baseSalary && (
                      <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                        <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-600 border-b text-xs uppercase tracking-wide">Compensation</div>
                        <div className="divide-y">
                          {([] as string[][]).concat(
                            [["Base Salary", fmtSalary(parseFloat(compensation.baseSalary) || 0, compensation.currency, compensation.salaryPeriod)]],
                            compensation.bonus ? [["Target Bonus", fmtSalary(parseFloat(compensation.bonus) || 0, compensation.currency, "yr") + (compensation.bonusType ? ` (${compensation.bonusType})` : "")]] : [],
                            compensation.signingBonus ? [["Signing Bonus", fmtSalary(parseFloat(compensation.signingBonus) || 0, compensation.currency, "one-time")]] : [],
                            compensation.equityGranted && compensation.equityQuantity ? [["Equity", `${compensation.equityQuantity} ${compensation.equityType || "shares"}${compensation.vestingSchedule ? ` (${compensation.vestingSchedule})` : ""}`]] : [],
                          ).map(([k, v]) => <div key={k} className="flex px-3 py-1.5"><span className="w-32 text-slate-500 shrink-0">{k}</span><span className="font-medium">{v}</span></div>)}
                        </div>
                      </div>
                    )}
                    {benefitItems.length > 0 && (
                      <div>
                        <p className="font-semibold text-xs uppercase tracking-wide text-slate-500 mb-1">Benefits</p>
                        <div className="flex flex-wrap gap-1">{benefitItems.map((b) => <span key={b.id} className="text-xs bg-violet-50 border border-violet-100 text-violet-700 rounded-full px-2 py-0.5">{b.label}</span>)}</div>
                      </div>
                    )}
                    {(terms.probationPeriod || terms.noticePeriod) && (
                      <div className="text-xs text-slate-600 space-y-1">
                        {parseInt(terms.probationPeriod) > 0 && <p>• Probation period: {terms.probationPeriod} month{parseInt(terms.probationPeriod) !== 1 ? "s" : ""}</p>}
                        <p>• Notice period: {terms.noticePeriod} days</p>
                        {parseInt(terms.vacationDays) > 0 && <p>• Vacation: {terms.vacationDays} days per year</p>}
                        {terms.backgroundCheckRequired && <p>• Subject to satisfactory background check</p>}
                        {terms.ndaRequired && <p>• Non-Disclosure Agreement required</p>}
                      </div>
                    )}
                    {customContent.additionalTerms && <p className="text-xs text-slate-600 italic">{customContent.additionalTerms}</p>}
                    {customContent.closing && <p>{customContent.closing}</p>}
                    {expiresAt && <p className="text-xs text-slate-500">This offer is valid until <strong>{new Date(expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>. Please sign and return by that date.</p>}
                    <div className="pt-4 border-t mt-6 grid grid-cols-2 gap-8 text-xs">
                      <div><div className="h-10 border-b border-slate-300 mb-1" /><p className="text-slate-500">Recruiter / Authorized Signatory</p><p className="text-slate-400">Date: _______________</p></div>
                      <div><div className="h-10 border-b border-slate-300 mb-1" /><p className="text-slate-500">{selectedCandidate?.name ?? "Candidate"}</p><p className="text-slate-400">Date: _______________</p></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
