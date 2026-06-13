"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { SkillBar, ScoreRing } from "@/components/ui/charts"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, ClipboardList, Star, CheckCircle2, Plus, Trash2,
  ArrowLeft, ThumbsUp, ThumbsDown, Minus, RefreshCw,
  User, Calendar, BarChart3, ChevronDown, ChevronUp,
} from "lucide-react"

type Recommendation = "Strong Hire" | "Hire" | "Maybe" | "No Hire" | "Strong No Hire"

interface ScorecardQuestion {
  question: string
  answer: string
  score: number
  notes: string
}

interface Scorecard {
  _id: string
  applicationId: string
  candidateName?: string
  jobTitle?: string
  interviewType?: string
  interviewDate?: string
  status: "Draft" | "Submitted"
  scores: Record<string, number>
  questions: ScorecardQuestion[]
  strengths: string[]
  weaknesses: string[]
  comments: string
  recommendation: string
  overallScore?: number
  submittedAt?: string
  createdAt?: string
}

const SCORE_CATEGORIES = [
  { key: "technical",       label: "Technical Skills",   emoji: "⚙️" },
  { key: "communication",   label: "Communication",      emoji: "💬" },
  { key: "problemSolving",  label: "Problem Solving",    emoji: "🧠" },
  { key: "cultureFit",      label: "Culture Fit",        emoji: "🤝" },
  { key: "leadership",      label: "Leadership",         emoji: "🎯" },
]

const REC_CONFIG: Record<Recommendation, { color: string; bg: string; icon: React.ReactNode }> = {
  "Strong Hire":    { color: "#16a34a", bg: "#f0fdf4", icon: <ThumbsUp className="h-4 w-4" /> },
  "Hire":           { color: "#2563eb", bg: "#eff6ff", icon: <ThumbsUp className="h-4 w-4" /> },
  "Maybe":          { color: "#d97706", bg: "#fffbeb", icon: <Minus className="h-4 w-4" /> },
  "No Hire":        { color: "#dc2626", bg: "#fef2f2", icon: <ThumbsDown className="h-4 w-4" /> },
  "Strong No Hire": { color: "#7f1d1d", bg: "#fef2f2", icon: <ThumbsDown className="h-4 w-4" /> },
}

function ScoreSlider({ label, emoji, value, onChange }: { label: string; emoji: string; value: number; onChange: (v: number) => void }) {
  const color = value >= 8 ? "#16a34a" : value >= 5 ? "#d97706" : "#dc2626"
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm flex items-center gap-1.5">{emoji} {label}</Label>
        <span className="text-sm font-bold w-10 text-right" style={{ color }}>{value}/10</span>
      </div>
      <input
        type="range" min={0} max={10} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full accent-purple-600"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Poor</span><span>Average</span><span>Excellent</span>
      </div>
    </div>
  )
}

function ScorecardCard({ sc, onSelect }: { sc: Scorecard; onSelect: () => void }) {
  const avg = sc.overallScore ?? Math.round(Object.values(sc.scores).reduce((s, v) => s + v, 0) / Object.keys(sc.scores).length)
  const rec = sc.recommendation as Recommendation
  const cfg = REC_CONFIG[rec]

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4"
      style={{ borderLeftColor: cfg?.color || "#6b7280" }}
      onClick={onSelect}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{sc.candidateName || "Candidate"}</p>
            {sc.jobTitle && <p className="text-xs text-muted-foreground">{sc.jobTitle}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">
              {sc.interviewType || "Technical"} · {sc.interviewDate ? new Date(sc.interviewDate).toLocaleDateString() : "No date"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {cfg && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ color: cfg.color, background: cfg.bg }}>
                {cfg.icon} {rec}
              </span>
            )}
            <Badge className={sc.status === "Submitted" ? "bg-green-100 text-green-700 text-xs" : "bg-amber-100 text-amber-700 text-xs"}>
              {sc.status}
            </Badge>
          </div>
        </div>
        <div className="space-y-1">
          <SkillBar label={`Overall Score: ${avg}/10`} value={avg * 10} color={avg >= 7 ? "#16a34a" : avg >= 5 ? "#f59e0b" : "#ef4444"} />
        </div>
      </CardContent>
    </Card>
  )
}

const DEFAULT_SCORES = { technical: 5, communication: 5, problemSolving: 5, cultureFit: 5, leadership: 5 }

export default function InterviewScorecardsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [view, setView] = useState<"list" | "create" | "detail">("list")
  const [scorecards, setScorecards] = useState<Scorecard[]>([])
  const [selected, setSelected] = useState<Scorecard | null>(null)

  // Form state
  const [applicationId, setApplicationId] = useState("")
  const [interviewType, setInterviewType] = useState("Technical")
  const [scores, setScores] = useState({ ...DEFAULT_SCORES })
  const [questions, setQuestions] = useState<ScorecardQuestion[]>([{ question: "", answer: "", score: 5, notes: "" }])
  const [strengths, setStrengths] = useState("")
  const [weaknesses, setWeaknesses] = useState("")
  const [comments, setComments] = useState("")
  const [recommendation, setRecommendation] = useState<Recommendation>("Hire")

  useEffect(() => { fetchScorecards() }, [])

  const fetchScorecards = async () => {
    setListLoading(true)
    try {
      const res = await fetch("/api/interview-scorecards")
      if (res.ok) {
        const data = await res.json()
        setScorecards(data.scorecards || [])
      }
    } finally {
      setListLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!applicationId.trim()) {
      toast({ title: "Application ID required", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/interview-scorecards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create", applicationId, interviewType,
          interviewDate: new Date().toISOString(), interviewDuration: 60,
          scores, questions,
          strengths: strengths.split(",").map(s => s.trim()).filter(Boolean),
          weaknesses: weaknesses.split(",").map(s => s.trim()).filter(Boolean),
          comments, recommendation,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: "Scorecard created!" })
        setScorecards(prev => [data.scorecard, ...prev])
        setSelected(data.scorecard)
        setView("detail")
        resetForm()
      } else {
        toast({ title: "Failed", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch("/api/interview-scorecards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scorecardId: id, action: "submit" }),
      })
      const data = await res.json()
      if (data.success) {
        setScorecards(prev => prev.map(s => s._id === id ? data.scorecard : s))
        setSelected(data.scorecard)
        toast({ title: "Scorecard submitted!" })
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setApplicationId(""); setInterviewType("Technical")
    setScores({ ...DEFAULT_SCORES })
    setQuestions([{ question: "", answer: "", score: 5, notes: "" }])
    setStrengths(""); setWeaknesses(""); setComments(""); setRecommendation("Hire")
  }

  const avgScore = useMemo(() => Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / 5), [scores])
  const stats = {
    total: scorecards.length,
    submitted: scorecards.filter(s => s.status === "Submitted").length,
    hires: scorecards.filter(s => s.recommendation === "Strong Hire" || s.recommendation === "Hire").length,
    avgScore: scorecards.length
      ? Math.round(scorecards.reduce((sum, s) => sum + (s.overallScore ?? Object.values(s.scores).reduce((a, b) => a + b, 0) / Object.keys(s.scores).length), 0) / scorecards.length)
      : 0,
  }

  // ── LIST VIEW ──
  if (view === "list") {
    return (
      <div className="p-4 md:p-6 space-y-5 w-full">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-blue-600" /> Interview Scorecards
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Evaluate candidates with structured scoring</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchScorecards}><RefreshCw className="h-4 w-4" /></Button>
            <Button onClick={() => setView("create")} className="bg-blue-600 hover:bg-blue-700 gap-2">
              <Plus className="h-4 w-4" /> New Scorecard
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, icon: <ClipboardList className="h-4 w-4 text-blue-600" />, bg: "bg-blue-50" },
            { label: "Submitted", value: stats.submitted, icon: <CheckCircle2 className="h-4 w-4 text-green-600" />, bg: "bg-green-50" },
            { label: "Hire Recs", value: stats.hires, icon: <ThumbsUp className="h-4 w-4 text-purple-600" />, bg: "bg-purple-50" },
            { label: "Avg Score", value: `${stats.avgScore}/10`, icon: <BarChart3 className="h-4 w-4 text-amber-600" />, bg: "bg-amber-50" },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className={`p-4 flex items-center gap-3 ${s.bg} rounded-lg`}>
                <div className="p-2 bg-white rounded-lg shadow-sm">{s.icon}</div>
                <div><div className="text-xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {listLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" /> Loading scorecards…
          </div>
        ) : scorecards.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center space-y-3">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="font-semibold">No scorecards yet</p>
              <p className="text-sm text-muted-foreground">Create your first scorecard to start evaluating candidates.</p>
              <Button onClick={() => setView("create")} className="bg-blue-600 hover:bg-blue-700 gap-2">
                <Plus className="h-4 w-4" /> New Scorecard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {scorecards.map(sc => (
              <ScorecardCard key={sc._id} sc={sc} onSelect={() => { setSelected(sc); setView("detail") }} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── CREATE VIEW ──
  if (view === "create") {
    return (
      <div className="p-4 md:p-6 space-y-5 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <h1 className="text-xl font-bold">New Interview Scorecard</h1>
        </div>

        {/* Basic info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Interview Details</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <Label>Application ID <span className="text-destructive">*</span></Label>
              <Input placeholder="Paste application ID…" value={applicationId} onChange={e => setApplicationId(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label>Interview Type</Label>
              <Select value={interviewType} onValueChange={setInterviewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Technical", "HR", "Behavioral", "System Design", "Cultural Fit", "Final Round"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Recommendation</Label>
              <Select value={recommendation} onValueChange={v => setRecommendation(v as Recommendation)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(REC_CONFIG) as Recommendation[]).map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Scores */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Category Scores</CardTitle>
              <Badge variant="secondary" className="text-base font-bold">{avgScore}/10 avg</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {SCORE_CATEGORIES.map(cat => (
              <ScoreSlider key={cat.key} label={cat.label} emoji={cat.emoji}
                value={scores[cat.key as keyof typeof scores]}
                onChange={v => setScores(s => ({ ...s, [cat.key]: v }))} />
            ))}
          </CardContent>
        </Card>

        {/* Q&A */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Questions & Answers</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setQuestions(q => [...q, { question: "", answer: "", score: 5, notes: "" }])}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Q{i + 1}</span>
                  {questions.length > 1 && (
                    <button onClick={() => setQuestions(qs => qs.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Input placeholder="Question asked…" value={q.question}
                  onChange={e => setQuestions(qs => qs.map((x, idx) => idx === i ? { ...x, question: e.target.value } : x))} />
                <Textarea placeholder="Candidate's response…" rows={2} value={q.answer}
                  onChange={e => setQuestions(qs => qs.map((x, idx) => idx === i ? { ...x, answer: e.target.value } : x))} className="resize-none" />
                <div className="flex items-center gap-3">
                  <Label className="text-xs shrink-0">Score: {q.score}/10</Label>
                  <input type="range" min={0} max={10} value={q.score}
                    onChange={e => setQuestions(qs => qs.map((x, idx) => idx === i ? { ...x, score: parseInt(e.target.value) } : x))}
                    className="flex-1 accent-purple-600" />
                  <Input placeholder="Notes" value={q.notes} className="w-32 text-xs"
                    onChange={e => setQuestions(qs => qs.map((x, idx) => idx === i ? { ...x, notes: e.target.value } : x))} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Assessment */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Overall Assessment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm">Strengths <span className="text-xs text-muted-foreground font-normal">(comma-separated)</span></Label>
                <Input placeholder="e.g. System design, Clean code, Communication" value={strengths} onChange={e => setStrengths(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Areas to Improve <span className="text-xs text-muted-foreground font-normal">(comma-separated)</span></Label>
                <Input placeholder="e.g. Testing, Documentation" value={weaknesses} onChange={e => setWeaknesses(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Overall Comments</Label>
              <Textarea placeholder="Summary of the interview…" value={comments} onChange={e => setComments(e.target.value)} rows={3} className="resize-none" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleCreate} disabled={loading || !applicationId} className="bg-blue-600 hover:bg-blue-700 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Scorecard
          </Button>
          <Button variant="outline" onClick={() => { resetForm(); setView("list") }}>Cancel</Button>
        </div>
      </div>
    )
  }

  // ── DETAIL VIEW ──
  if (view === "detail" && selected) {
    const avg = selected.overallScore ?? Math.round(Object.values(selected.scores).reduce((s, v) => s + v, 0) / Object.keys(selected.scores).length)
    const rec = selected.recommendation as Recommendation
    const recCfg = REC_CONFIG[rec]
    return (
      <div className="p-4 md:p-6 space-y-5 w-full">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("list")}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
          <h1 className="text-xl font-bold">Scorecard Detail</h1>
          {selected.status === "Draft" && (
            <Button onClick={() => handleSubmit(selected._id)} disabled={loading} className="ml-auto bg-green-600 hover:bg-green-700 gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-5 flex items-center gap-5">
            <ScoreRing value={avg * 10} size={72} stroke={6} label={String(avg)} sublabel="/10 avg" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{selected.candidateName || "Candidate"}</p>
                {selected.jobTitle && <span className="text-sm text-muted-foreground">· {selected.jobTitle}</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{selected.interviewType || "Technical"}</Badge>
                {selected.interviewDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(selected.interviewDate).toLocaleDateString()}
                  </span>
                )}
                <Badge className={selected.status === "Submitted" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                  {selected.status}
                </Badge>
                {recCfg && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ color: recCfg.color, background: recCfg.bg }}>
                    {recCfg.icon} {rec}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Category Scores</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {SCORE_CATEGORIES.map(cat => {
              const v = selected.scores[cat.key] || 0
              return (
                <SkillBar key={cat.key} label={`${cat.emoji} ${cat.label}: ${v}/10`} value={v * 10} color={v >= 7 ? "#16a34a" : v >= 5 ? "#f59e0b" : "#ef4444"} />
              )
            })}
          </CardContent>
        </Card>

        {selected.strengths?.length > 0 || selected.weaknesses?.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {selected.strengths?.length > 0 && (
              <Card className="bg-green-50/30 border-green-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-green-700 flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> Strengths</CardTitle></CardHeader>
                <CardContent className="pt-0 flex flex-wrap gap-1.5">
                  {selected.strengths.map((s, i) => (
                    <Badge key={i} className="bg-green-100 text-green-700 border-green-200 text-xs font-normal">{s}</Badge>
                  ))}
                </CardContent>
              </Card>
            )}
            {selected.weaknesses?.length > 0 && (
              <Card className="bg-red-50/30 border-red-200">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700 flex items-center gap-1"><ThumbsDown className="h-4 w-4" /> Areas to Improve</CardTitle></CardHeader>
                <CardContent className="pt-0 flex flex-wrap gap-1.5">
                  {selected.weaknesses.map((w, i) => (
                    <Badge key={i} className="bg-red-100 text-red-700 border-red-200 text-xs font-normal">{w}</Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}

        {selected.comments && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Comments</CardTitle></CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">{selected.comments}</CardContent>
          </Card>
        )}
      </div>
    )
  }

  return null
}
