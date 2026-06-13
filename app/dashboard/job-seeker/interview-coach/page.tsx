"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SkillBar, ScoreRing } from "@/components/ui/charts"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/client-auth"
import {
  CATEGORY_META,
  DIFFICULTY_META,
  LINKED_TOOLS,
  QUICK_TIPS,
  ROLE_PRESETS,
  STAR_FRAMEWORK,
  analyzeAnswerDraft,
  scoreColorClass,
  type CoachCategory,
  type CoachDifficulty,
} from "@/lib/interview-coach-utils"
import {
  AlertCircle,
  Award,
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  History,
  Lightbulb,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Sparkles,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react"

interface Feedback {
  score: number
  clarity: number
  relevance: number
  strengths: string[]
  improvements: string[]
  betterAnswer: string
  fillerWordCount: number
  tip: string
}

interface Question {
  id: string
  question: string
  category: string
  difficulty: string
  questionNumber: number
  totalQuestions: number
}

interface Summary {
  averageScore: number
  rating: string
  topStrengths: string[]
  topImprovements: string[]
  totalFillerWords: number
  questionScores?: Array<{ question: string; score: number; category: string; index: number }>
  answeredCount?: number
  skippedCount?: number
}

interface CoachStats {
  totalSessions: number
  completedSessions: number
  averageScore: number
  bestScore: number
  weeklySessions: number
  totalQuestionsAnswered: number
}

interface SessionRow {
  id: string
  jobTitle: string
  overallScore: number
  questionsAnswered: number
  questionCount: number
  completedAt?: string
  createdAt: string
  isComplete?: boolean
  difficulty?: string
  focusCategory?: string
}

type Phase = "setup" | "answering" | "feedback" | "complete"
type MainTab = "practice" | "history" | "insights"

const TIMER_PRESETS = [
  { label: "Off", seconds: 0 },
  { label: "2 min", seconds: 120 },
  { label: "3 min", seconds: 180 },
  { label: "5 min", seconds: 300 },
]

export default function InterviewCoachPage() {
  const { toast } = useToast()
  const [mainTab, setMainTab] = useState<MainTab>("practice")
  const [phase, setPhase] = useState<Phase>("setup")
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<CoachStats | null>(null)
  const [tipIndex, setTipIndex] = useState(0)

  // Setup
  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [experienceLevel, setExperienceLevel] = useState("mid")
  const [questionCount, setQuestionCount] = useState("5")
  const [focusCategory, setFocusCategory] = useState<CoachCategory>("all")
  const [difficulty, setDifficulty] = useState<CoachDifficulty>("mixed")

  // Session
  const [sessionId, setSessionId] = useState("")
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [userAnswer, setUserAnswer] = useState("")
  const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [overallScore, setOverallScore] = useState(0)
  const [sessionScores, setSessionScores] = useState<Feedback[]>([])

  // Timer
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerLimit, setTimerLimit] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)

  // History
  const [history, setHistory] = useState<SessionRow[]>([])
  const [historyFilter, setHistoryFilter] = useState<"all" | "complete" | "in_progress">("all")
  const [selectedSession, setSelectedSession] = useState<any>(null)

  const draftAnalysis = useMemo(() => analyzeAnswerDraft(userAnswer), [userAnswer])

  const loadDashboard = useCallback(async () => {
    try {
      const res = await authFetch("/api/interview-coach")
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authFetch("/api/interview-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "history" }),
      })
      const data = await res.json()
      setHistory(data.sessions || [])
    } catch {
      toast({ title: "Failed to load history", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadDashboard()
    loadHistory()
  }, [loadDashboard, loadHistory])

  useEffect(() => {
    const id = setInterval(() => setTipIndex(i => (i + 1) % QUICK_TIPS.length), 6000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!timerRunning || timerLimit <= 0) return
    const id = setInterval(() => {
      setTimerSeconds(s => {
        if (s + 1 >= timerLimit) {
          setTimerRunning(false)
          toast({ title: "Time's up!", description: "Submit your answer or refine it quickly." })
          return timerLimit
        }
        return s + 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timerRunning, timerLimit, toast])

  function applyPreset(preset: (typeof ROLE_PRESETS)[0]) {
    setJobTitle(preset.title)
    setJobDescription(`Key skills: ${preset.skills.join(", ")}. ${preset.description}.`)
  }

  async function startSession() {
    if (!jobTitle.trim()) {
      toast({ title: "Enter a job title", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await authFetch("/api/interview-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          jobTitle: jobTitle.trim(),
          jobDescription,
          experienceLevel,
          questionCount: parseInt(questionCount, 10),
          focusCategory,
          difficulty,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setSessionId(data.sessionId)
      setCurrentQuestion(data.currentQuestion)
      setSessionScores([])
      setUserAnswer("")
      setTimerSeconds(0)
      setTimerRunning(timerLimit > 0)
      setPhase("answering")
      setMainTab("practice")
    } catch (e: any) {
      toast({ title: "Failed to start session", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function submitAnswer(skip = false) {
    if (!skip && !userAnswer.trim()) {
      toast({ title: "Write your answer first", variant: "destructive" })
      return
    }
    setLoading(true)
    setTimerRunning(false)
    try {
      const res = await authFetch("/api/interview-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: skip ? "skip" : "answer",
          sessionId,
          questionId: currentQuestion?.id,
          question: currentQuestion?.question,
          category: currentQuestion?.category,
          difficulty: currentQuestion?.difficulty,
          questionNumber: currentQuestion?.questionNumber,
          userAnswer: userAnswer.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      if (!skip) setSessionScores(prev => [...prev, data.feedback])
      setCurrentFeedback(data.feedback)

      if (data.sessionComplete) {
        setOverallScore(data.overallScore)
        setSummary(data.summary)
        setPhase("complete")
        loadDashboard()
        loadHistory()
      } else {
        setPhase("feedback")
        if (data.nextQuestion) setCurrentQuestion(data.nextQuestion)
      }
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function viewSession(id: string) {
    setLoading(true)
    try {
      const res = await authFetch(`/api/interview-coach?sessionId=${id}`)
      const data = await res.json()
      if (res.ok) setSelectedSession(data.session)
    } finally {
      setLoading(false)
    }
  }

  async function deleteSession(id: string) {
    const res = await authFetch(`/api/interview-coach?sessionId=${id}`, { method: "DELETE" })
    if (res.ok) {
      setHistory(prev => prev.filter(s => s.id !== id))
      if (selectedSession?.id === id) setSelectedSession(null)
      loadDashboard()
      toast({ title: "Session deleted" })
    }
  }

  function nextQuestion() {
    setUserAnswer("")
    setCurrentFeedback(null)
    setTimerSeconds(0)
    setTimerRunning(timerLimit > 0)
    setPhase("answering")
  }

  function restart() {
    setPhase("setup")
    setSessionId("")
    setCurrentQuestion(null)
    setUserAnswer("")
    setCurrentFeedback(null)
    setSummary(null)
    setOverallScore(0)
    setSessionScores([])
    setTimerSeconds(0)
    setTimerRunning(false)
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied to clipboard" })
  }

  function exportReport() {
    if (!summary) return
    const lines = [
      `Interview Coach Report — ${jobTitle}`,
      `Overall Score: ${overallScore}/100 (${summary.rating})`,
      "",
      "Strengths:",
      ...summary.topStrengths.map(s => `- ${s}`),
      "",
      "Focus Areas:",
      ...summary.topImprovements.map(s => `- ${s}`),
      "",
      ...(summary.questionScores || []).map(q => `Q${q.index} [${q.score}/100]: ${q.question}`),
    ]
    const blob = new Blob([lines.join("\n")], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `interview-coach-${jobTitle.replace(/\s+/g, "-").toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredHistory = history.filter(s => {
    if (historyFilter === "complete") return s.isComplete || s.completedAt
    if (historyFilter === "in_progress") return !s.isComplete && !s.completedAt
    return true
  })

  const scoreBg = (s: number) => (s >= 80 ? "bg-emerald-50" : s >= 60 ? "bg-amber-50" : "bg-rose-50")
  const timerDisplay = timerLimit > 0
    ? `${String(Math.floor((timerLimit - timerSeconds) / 60)).padStart(2, "0")}:${String((timerLimit - timerSeconds) % 60).padStart(2, "0")}`
    : null

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 via-indigo-700 to-violet-800 text-white p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-8 w-8" />
              <Badge className="bg-white/20 text-white border-0">AI Powered</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">AI Interview Coach</h1>
            <p className="text-purple-100 mt-1 max-w-xl text-sm md:text-base">
              Practice role-specific questions, get instant AI feedback, and track your improvement over time.
            </p>
          </div>
          {phase === "setup" && (
            <Button
              size="lg"
              className="bg-white text-purple-800 hover:bg-purple-50 shrink-0"
              onClick={() => { setMainTab("practice"); document.getElementById("coach-setup")?.scrollIntoView({ behavior: "smooth" }) }}
            >
              <Play className="h-4 w-4 mr-2" /> Start Practice
            </Button>
          )}
        </div>

        {/* Stats row */}
        {stats && (
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: "Sessions", value: stats.totalSessions, icon: History },
              { label: "Avg Score", value: `${stats.averageScore}%`, icon: TrendingUp },
              { label: "Best Score", value: `${stats.bestScore}%`, icon: Award },
              { label: "This Week", value: stats.weeklySessions, icon: Zap },
            ].map(item => (
              <div key={item.label} className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
                <item.icon className="h-4 w-4 text-purple-200 mb-1" />
                <p className="text-xl font-bold">{item.value}</p>
                <p className="text-xs text-purple-200">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tip ticker */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
        <Lightbulb className="h-4 w-4 shrink-0" />
        <span className="font-medium">Pro tip:</span>
        <span>{QUICK_TIPS[tipIndex]}</span>
      </div>

      <Tabs value={mainTab} onValueChange={v => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="practice">Practice</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* ── PRACTICE TAB ── */}
        <TabsContent value="practice" className="space-y-6 mt-6">
          {phase === "setup" && (
            <>
              {/* Role presets — Feature 1 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" /> Quick-start roles
                  </CardTitle>
                  <CardDescription>Tap a role to auto-fill your practice session</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {ROLE_PRESETS.map(p => (
                      <button
                        key={p.title}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className={`text-left p-3 rounded-xl border transition-all hover:border-purple-400 hover:bg-purple-50 ${
                          jobTitle === p.title ? "border-purple-500 bg-purple-50 ring-1 ring-purple-300" : "border-gray-200"
                        }`}
                      >
                        <span className="text-xl">{p.icon}</span>
                        <p className="font-medium text-sm mt-1">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.description}</p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Setup form — Features 2-6: JD, count, difficulty, category, experience */}
              <Card id="coach-setup">
                <CardHeader>
                  <CardTitle>Configure your session</CardTitle>
                  <CardDescription>Tailor questions to your target role and interview style</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Target job title *</label>
                    <Input
                      placeholder="e.g. SDE Backend, Product Manager"
                      value={jobTitle}
                      onChange={e => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Job description (optional)</label>
                    <Textarea
                      placeholder="Paste JD for tailored technical & behavioral questions…"
                      value={jobDescription}
                      onChange={e => setJobDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Questions</label>
                      <Select value={questionCount} onValueChange={setQuestionCount}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["3", "5", "7", "10"].map(n => (
                            <SelectItem key={n} value={n}>{n} questions</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Difficulty</label>
                      <Select value={difficulty} onValueChange={v => setDifficulty(v as CoachDifficulty)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mixed">Mixed</SelectItem>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Focus area</label>
                      <Select value={focusCategory} onValueChange={v => setFocusCategory(v as CoachCategory)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value="behavioral">Behavioral</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="situational">Situational</SelectItem>
                          <SelectItem value="cultural">Cultural</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Experience</label>
                      <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="mid">Mid-level</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" /> Per-question timer
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TIMER_PRESETS.map(t => (
                        <Button
                          key={t.label}
                          type="button"
                          size="sm"
                          variant={timerLimit === t.seconds ? "default" : "outline"}
                          className={timerLimit === t.seconds ? "bg-purple-600" : ""}
                          onClick={() => setTimerLimit(t.seconds)}
                        >
                          {t.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={startSession} disabled={loading || !jobTitle.trim()} className="w-full bg-purple-600 hover:bg-purple-700">
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
                    Start interview practice
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {/* Answering — Features 7-10: progress, STAR, live analysis, timer, skip */}
          {phase === "answering" && currentQuestion && (
            <div className="grid lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="text-sm text-muted-foreground">
                        Question {currentQuestion.questionNumber} of {currentQuestion.totalQuestions}
                      </span>
                      <div className="flex gap-2 items-center">
                        {timerDisplay && (
                          <Badge variant="outline" className={timerSeconds >= timerLimit * 0.85 ? "border-rose-400 text-rose-600" : ""}>
                            <Clock className="h-3 w-3 mr-1" /> {timerDisplay}
                          </Badge>
                        )}
                        <Badge className={CATEGORY_META[currentQuestion.category]?.color || ""}>
                          {CATEGORY_META[currentQuestion.category]?.label || currentQuestion.category}
                        </Badge>
                        <Badge className={DIFFICULTY_META[currentQuestion.difficulty]?.color || ""}>
                          {DIFFICULTY_META[currentQuestion.difficulty]?.label || currentQuestion.difficulty}
                        </Badge>
                      </div>
                    </div>
                    <SkillBar
                      label=""
                      value={(currentQuestion.questionNumber / currentQuestion.totalQuestions) * 100}
                      color="#7c3aed"
                    />
                    <CardTitle className="mt-4 text-lg leading-relaxed">{currentQuestion.question}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Structure your answer with STAR: Situation → Task → Action → Result…"
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      rows={10}
                      className="resize-none text-base"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{draftAnalysis.wordCount} words</span>
                        <span>{draftAnalysis.fillerCount} fillers</span>
                        <span className={draftAnalysis.readiness >= 60 ? "text-emerald-600" : "text-amber-600"}>
                          Readiness {draftAnalysis.readiness}%
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => submitAnswer(true)} disabled={loading}>
                          <SkipForward className="h-4 w-4 mr-1" /> Skip
                        </Button>
                        <Button onClick={() => submitAnswer(false)} disabled={loading || !userAnswer.trim()} className="bg-purple-600 hover:bg-purple-700">
                          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                          Submit
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{draftAnalysis.lengthHint}</p>
                  </CardContent>
                </Card>
              </div>

              {/* STAR guide sidebar */}
              <Card className="h-fit border-purple-100 bg-purple-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" /> STAR Framework
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {STAR_FRAMEWORK.map(step => (
                    <div key={step.letter} className="flex gap-2">
                      <div className="h-7 w-7 rounded-lg bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {step.letter}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Feedback phase — Feature 11: copy better answer */}
          {phase === "feedback" && currentFeedback && (
            <div className="space-y-4">
              <Card className={scoreBg(currentFeedback.score)}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Answer feedback</h3>
                    <ScoreRing value={currentFeedback.score} size={72} stroke={6} sublabel="/100" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <SkillBar label={`Clarity ${currentFeedback.clarity}%`} value={currentFeedback.clarity} color={currentFeedback.clarity >= 70 ? "#16a34a" : "#f59e0b"} />
                    <SkillBar label={`Relevance ${currentFeedback.relevance}%`} value={currentFeedback.relevance} color={currentFeedback.relevance >= 70 ? "#16a34a" : "#f59e0b"} />
                  </div>
                  {currentFeedback.fillerWordCount > 0 && (
                    <p className="text-sm text-orange-600 mt-3 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {currentFeedback.fillerWordCount} filler word(s) detected
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" /> What worked
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {currentFeedback.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-emerald-700">• {s}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
                      <AlertCircle className="h-4 w-4" /> Improve
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {currentFeedback.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-orange-700">• {s}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {currentFeedback.betterAnswer && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm text-purple-800">Stronger answer example</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => copyText(currentFeedback.betterAnswer)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-purple-900 italic">&ldquo;{currentFeedback.betterAnswer}&rdquo;</p>
                  </CardContent>
                </Card>
              )}

              {currentFeedback.tip && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <p className="text-sm text-blue-800 flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                      <span><strong>Tip:</strong> {currentFeedback.tip}</span>
                    </p>
                  </CardContent>
                </Card>
              )}

              <Button onClick={nextQuestion} className="w-full bg-purple-600 hover:bg-purple-700">
                Next question <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Complete — Features 12-13: score chart, export */}
          {phase === "complete" && summary && (
            <div className="space-y-4">
              <Card className={scoreBg(overallScore)}>
                <CardHeader className="text-center">
                  <Award className={`h-16 w-16 mx-auto ${scoreColorClass(overallScore)}`} />
                  <CardTitle className="text-2xl mt-2">Session complete!</CardTitle>
                  <CardDescription>Performance for <strong>{jobTitle}</strong></CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3">
                  <ScoreRing value={overallScore} size={120} stroke={10} label="Overall" />
                  <Badge className="text-lg px-4 py-1">{summary.rating}</Badge>
                  {summary.skippedCount ? (
                    <p className="text-sm text-muted-foreground">{summary.skippedCount} question(s) skipped</p>
                  ) : null}
                </CardContent>
              </Card>

              {summary.questionScores && summary.questionScores.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" /> Score by question
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.questionScores}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="index" tickFormatter={v => `Q${v}`} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                          {summary.questionScores.map((entry, i) => (
                            <Cell key={i} fill={entry.score >= 70 ? "#10b981" : entry.score >= 50 ? "#f59e0b" : "#ef4444"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {(summary.topStrengths.length ? summary.topStrengths : ["Keep practicing consistently"]).map((s, i) => (
                        <li key={i} className="text-sm text-emerald-700">• {s}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Focus next
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {summary.topImprovements.map((s, i) => (
                        <li key={i} className="text-sm text-orange-700">• {s}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={exportReport} variant="outline" className="gap-1.5">
                  <Download className="h-4 w-4" /> Export report
                </Button>
                <Button onClick={restart} className="gap-1.5 bg-purple-600 hover:bg-purple-700">
                  <RotateCcw className="h-4 w-4" /> Practice another role
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── HISTORY TAB — Feature 14: filter, detail, delete ── */}
        <TabsContent value="history" className="space-y-4 mt-6">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(["all", "complete", "in_progress"] as const).map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={historyFilter === f ? "default" : "ghost"}
                  className={historyFilter === f ? "bg-purple-600 hover:bg-purple-700" : ""}
                  onClick={() => setHistoryFilter(f)}
                >
                  {f === "all" ? "All" : f === "complete" ? "Completed" : "In progress"}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={loadHistory} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Past sessions</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No sessions yet. Start your first practice!</p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto">
                    {filteredHistory.map(s => (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-colors hover:bg-purple-50/50 ${
                          selectedSession?.id === s.id ? "border-purple-400 bg-purple-50" : ""
                        }`}
                        onClick={() => viewSession(s.id)}
                      >
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.jobTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.questionsAnswered}/{s.questionCount} questions · {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.isComplete || s.completedAt ? (
                            <ScoreRing value={s.overallScore || 0} size={48} stroke={4} sublabel="score" />
                          ) : (
                            <Badge variant="secondary">In progress</Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                            onClick={e => { e.stopPropagation(); deleteSession(s.id) }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Session detail</CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedSession ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Select a session to view answers & feedback</p>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{selectedSession.jobTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(selectedSession.createdAt), "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                      {selectedSession.overallScore != null && (
                        <ScoreRing value={selectedSession.overallScore} size={56} stroke={5} sublabel="score" />
                      )}
                    </div>
                    {(selectedSession.rounds || []).map((r: any, i: number) => (
                      <div key={i} className="p-3 border rounded-lg text-sm space-y-1">
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">Q{i + 1}</Badge>
                          {r.skipped && <Badge variant="destructive" className="text-[10px]">Skipped</Badge>}
                          {r.feedback?.score != null && (
                            <Badge className="text-[10px]">{r.feedback.score}/100</Badge>
                          )}
                        </div>
                        <p className="font-medium text-xs">{r.question}</p>
                        {!r.skipped && (
                          <p className="text-muted-foreground text-xs line-clamp-2">{r.userAnswer}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── INSIGHTS TAB — Feature 15: linked tools + progress insights ── */}
        <TabsContent value="insights" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats ? (
                  <>
                    <SkillBar label={`Average score (${stats.averageScore}%)`} value={stats.averageScore} color="#7c3aed" />
                    <SkillBar label={`Best score (${stats.bestScore}%)`} value={stats.bestScore} color="#10b981" />
                    <p className="text-sm text-muted-foreground">
                      You&apos;ve answered <strong>{stats.totalQuestionsAnswered}</strong> practice questions across{" "}
                      <strong>{stats.totalSessions}</strong> sessions.
                    </p>
                    {stats.averageScore >= 70 ? (
                      <p className="text-sm text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Strong performance — keep refining with harder questions.
                      </p>
                    ) : (
                      <p className="text-sm text-amber-700 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" /> Focus on STAR structure and specific examples to boost scores.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Complete a session to unlock insights.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connected career tools</CardTitle>
                <CardDescription>Continue preparing across HireAI</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LINKED_TOOLS.map(tool => (
                    <Button key={tool.href} asChild variant="outline" className="justify-start h-auto py-3">
                      <Link href={tool.href}>
                        <ChevronRight className="h-4 w-4 mr-2 text-purple-600 shrink-0" />
                        {tool.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-purple-100">
            <CardContent className="p-5">
              <h3 className="font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" /> How scoring works
              </h3>
              <div className="grid sm:grid-cols-3 gap-4 mt-3 text-sm text-muted-foreground">
                <div><strong className="text-foreground">Clarity</strong> — Is your answer structured and easy to follow?</div>
                <div><strong className="text-foreground">Relevance</strong> — Does it directly address the question and role?</div>
                <div><strong className="text-foreground">Impact</strong> — Do you show measurable results and ownership?</div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Ratings: {["Needs Practice (<40)", "Fair (40–54)", "Good (55–69)", "Strong (70–84)", "Excellent (85+)"].join(" · ")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
