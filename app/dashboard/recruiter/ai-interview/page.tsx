"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Brain,
  Sparkles,
  Copy,
  RefreshCw,
  Download,
  Trash2,
  Target,
  Search,
  Star,
  Video,
  Users,
  Briefcase,
  Filter,
  Layers,
  Wand2,
  FileText,
  ChevronRight,
  Plus,
  GitBranch,
  BarChart3,
} from "lucide-react"
import { format, formatDistanceToNow, isThisMonth } from "date-fns"

// ─── Types ───────────────────────────────────────────────────────────────────

type QuestionCategory = "technical" | "behavioral" | "situational" | "cultural"
type Difficulty = "easy" | "medium" | "hard"
type InterviewRound = "screening" | "technical" | "hr" | "leadership" | "culture"

interface Question {
  id: string
  question: string
  category: QuestionCategory
  difficulty: Difficulty
  expectedAnswer?: string
  followUpQuestions?: string[]
  tags: string[]
  starred?: boolean
}

interface QuestionSet {
  id: string
  name: string
  position: string
  questions: Question[]
  createdAt: string
  aiGenerated: boolean
  round?: InterviewRound
  jobId?: string
  notes?: string
}

interface RecruiterJob {
  _id: string
  title: string
  skills?: string[]
  experienceLevel?: string
  applicationCount?: number
}

const STORAGE_KEY = "ai-interview:sets:v2"

const CATEGORY_META: Record<
  QuestionCategory,
  { label: string; color: string; bg: string }
> = {
  technical: { label: "Technical", color: "#2563eb", bg: "#eff6ff" },
  behavioral: { label: "Behavioral", color: "#059669", bg: "#ecfdf5" },
  situational: { label: "Situational", color: "#ea580c", bg: "#fff7ed" },
  cultural: { label: "Cultural", color: "#7c3aed", bg: "#f5f3ff" },
}

const DIFFICULTY_META: Record<Difficulty, string> = {
  easy: "bg-emerald-100 text-emerald-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-red-100 text-red-800",
}

const ROUND_LABELS: Record<InterviewRound, string> = {
  screening: "Screening",
  technical: "Technical round",
  hr: "HR round",
  leadership: "Leadership",
  culture: "Culture fit",
}

const TEMPLATES = [
  {
    id: "faang-tech",
    name: "FAANG Technical",
    position: "Senior Software Engineer",
    experience: "Senior",
    skills: "Algorithms, System Design, Distributed Systems, SQL",
    categories: ["technical", "situational"] as QuestionCategory[],
    round: "technical" as InterviewRound,
  },
  {
    id: "behavioral-hr",
    name: "HR Behavioral",
    position: "Professional",
    experience: "Mid",
    skills: "Communication, Teamwork, Conflict resolution",
    categories: ["behavioral", "cultural"] as QuestionCategory[],
    round: "hr" as InterviewRound,
  },
  {
    id: "leadership",
    name: "Leadership Panel",
    position: "Engineering Manager",
    experience: "Senior",
    skills: "Leadership, Stakeholder management, Hiring",
    categories: ["behavioral", "situational"] as QuestionCategory[],
    round: "leadership" as InterviewRound,
  },
  {
    id: "startup",
    name: "Startup Generalist",
    position: "Full Stack Developer",
    experience: "Mid",
    skills: "React, Node.js, Product thinking, DevOps",
    categories: ["technical", "cultural"] as QuestionCategory[],
    round: "technical" as InterviewRound,
  },
]

const ALL_CATEGORIES: QuestionCategory[] = [
  "technical",
  "behavioral",
  "situational",
  "cultural",
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AIInterviewPage() {
  const { toast } = useToast()
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [selectedSet, setSelectedSet] = useState<QuestionSet | null>(null)
  const [generating, setGenerating] = useState(false)
  const [jobs, setJobs] = useState<RecruiterJob[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>("")

  const [position, setPosition] = useState("")
  const [experience, setExperience] = useState("Mid")
  const [skills, setSkills] = useState("")
  const [questionCount, setQuestionCount] = useState(12)
  const [round, setRound] = useState<InterviewRound>("technical")
  const [selectedCategories, setSelectedCategories] = useState<QuestionCategory[]>([
    "technical",
    "behavioral",
    "situational",
  ])

  const [qSearch, setQSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: QuestionSet[] = JSON.parse(raw)
        setQuestionSets(parsed)
        setSelectedSet(parsed[0] || null)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(questionSets))
    } catch {}
  }, [questionSets])

  useEffect(() => {
    fetch("/api/job-descriptions/my-jobs", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setJobs(d?.jobs || d || []))
      .catch(() => {})
  }, [])

  const stats = useMemo(() => {
    const totalQ = questionSets.reduce((a, s) => a + s.questions.length, 0)
    const starred = questionSets.reduce(
      (a, s) => a + s.questions.filter((q) => q.starred).length,
      0,
    )
    const thisMonth = questionSets.filter((s) => isThisMonth(new Date(s.createdAt))).length
    const categories = new Set<string>()
    questionSets.forEach((s) => s.questions.forEach((q) => categories.add(q.category)))
    return {
      sets: questionSets.length,
      questions: totalQ,
      starred,
      thisMonth,
      categoryCoverage: categories.size,
      avgPerSet: questionSets.length ? Math.round(totalQ / questionSets.length) : 0,
    }
  }, [questionSets])

  const categoryBreakdown = useMemo(() => {
    if (!selectedSet) return []
    const counts: Record<string, number> = {}
    selectedSet.questions.forEach((q) => {
      counts[q.category] = (counts[q.category] || 0) + 1
    })
    return Object.entries(counts).map(([cat, count]) => ({
      cat: cat as QuestionCategory,
      count,
      pct: Math.round((count / selectedSet.questions.length) * 100),
    }))
  }, [selectedSet])

  const filteredQuestions = useMemo(() => {
    if (!selectedSet) return []
    return selectedSet.questions.filter((q) => {
      if (filterCategory !== "all" && q.category !== filterCategory) return false
      if (filterDifficulty !== "all" && q.difficulty !== filterDifficulty) return false
      if (qSearch.trim()) {
        const term = qSearch.toLowerCase()
        if (
          !q.question.toLowerCase().includes(term) &&
          !q.tags.some((t) => t.toLowerCase().includes(term))
        )
          return false
      }
      return true
    })
  }, [selectedSet, filterCategory, filterDifficulty, qSearch])

  const applyJob = (jobId: string) => {
    setSelectedJobId(jobId)
    const job = jobs.find((j) => j._id === jobId)
    if (!job) return
    setPosition(job.title)
    if (job.skills?.length) setSkills(job.skills.join(", "))
    if (job.experienceLevel) setExperience(job.experienceLevel)
    toast({ title: "Job loaded", description: job.title })
  }

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setPosition(tpl.position)
    setExperience(tpl.experience)
    setSkills(tpl.skills)
    setSelectedCategories(tpl.categories)
    setRound(tpl.round)
    toast({ title: "Template applied", description: tpl.name })
  }

  const generateQuestions = async () => {
    if (!position.trim()) return
    setGenerating(true)
    try {
      const level = /senior/i.test(experience) ? "Senior" : /junior|entry/i.test(experience) ? "Junior" : "Mid"
      const resp = await fetch("/api/ai/interview-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: position,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          experienceLevel: level,
          questionCount: Math.max(1, Math.min(50, questionCount)),
          preferredCategories: selectedCategories,
        }),
      })
      if (!resp.ok) throw new Error("Failed to generate")
      const data = await resp.json()
      const full: unknown[] = data?.questions?.fullQuestions || []
      let items: Question[] = []
      if (full.length > 0) {
        items = full.map((q: Record<string, unknown>, idx: number) => ({
          id: String(q.id || `q_${Date.now()}_${idx}`),
          question: String(q.question || q),
          category: (q.category as QuestionCategory) || "technical",
          difficulty: (q.difficulty as Difficulty) || "medium",
          expectedAnswer: q.expectedAnswer as string | undefined,
          followUpQuestions: (q.followUpQuestions as string[]) || [],
          tags: (q.tags as string[]) || [],
        }))
      } else {
        const pack = data?.questions || {}
        const fromCat = (arr: string[], cat: QuestionCategory) =>
          (arr || []).map((q, i) => ({
            id: `${cat}_${Date.now()}_${i}`,
            question: q,
            category: cat,
            difficulty: "medium" as Difficulty,
            tags: [] as string[],
          }))
        items = [
          ...fromCat(pack.technical, "technical"),
          ...fromCat(pack.behavioral, "behavioral"),
          ...fromCat(pack.roleSpecific, "situational"),
          ...fromCat(pack.general, "cultural"),
        ]
      }

      const newSet: QuestionSet = {
        id: `set_${Date.now()}`,
        name: `${position} · ${ROUND_LABELS[round]}`,
        position,
        questions: items.slice(0, questionCount),
        createdAt: new Date().toISOString(),
        aiGenerated: true,
        round,
        jobId: selectedJobId || undefined,
      }
      setQuestionSets((prev) => [newSet, ...prev])
      setSelectedSet(newSet)
      toast({ title: "Questions generated", description: `${newSet.questions.length} questions ready` })
    } catch {
      toast({ title: "Generation failed", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  const persistSet = (set: QuestionSet) => {
    setQuestionSets((prev) => prev.map((s) => (s.id === set.id ? set : s)))
    setSelectedSet(set)
  }

  const deleteSet = (id: string) => {
    setQuestionSets((prev) => prev.filter((s) => s.id !== id))
    if (selectedSet?.id === id) setSelectedSet(questionSets.find((s) => s.id !== id) || null)
    toast({ title: "Set deleted" })
  }

  const duplicateSet = (set: QuestionSet) => {
    const copy: QuestionSet = {
      ...set,
      id: `set_${Date.now()}`,
      name: `${set.name} (copy)`,
      createdAt: new Date().toISOString(),
      questions: set.questions.map((q) => ({ ...q, id: `${q.id}_copy` })),
    }
    setQuestionSets((prev) => [copy, ...prev])
    setSelectedSet(copy)
    toast({ title: "Set duplicated" })
  }

  const exportSet = (set: QuestionSet, asText = false) => {
    if (asText) {
      const body = set.questions
        .map((q, i) => `${i + 1}. [${q.category}/${q.difficulty}] ${q.question}`)
        .join("\n\n")
      const blob = new Blob([`${set.name}\n${set.position}\n\n${body}`], { type: "text/plain" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${set.name.replace(/\s+/g, "-")}.txt`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const blob = new Blob([JSON.stringify(set, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${set.name.replace(/\s+/g, "-")}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
    toast({ title: "Exported" })
  }

  const copyAll = () => {
    if (!selectedSet) return
    const text = selectedSet.questions.map((q, i) => `${i + 1}. ${q.question}`).join("\n")
    navigator.clipboard.writeText(text)
    toast({ title: "All questions copied" })
  }

  const toggleStar = (qid: string) => {
    if (!selectedSet) return
    const updated = {
      ...selectedSet,
      questions: selectedSet.questions.map((q) =>
        q.id === qid ? { ...q, starred: !q.starred } : q,
      ),
    }
    persistSet(updated)
  }

  const saveEdit = (qid: string) => {
    if (!selectedSet || !editText.trim()) return
    const updated = {
      ...selectedSet,
      questions: selectedSet.questions.map((q) =>
        q.id === qid ? { ...q, question: editText.trim() } : q,
      ),
    }
    persistSet(updated)
    setEditingId(null)
    toast({ title: "Question updated" })
  }

  const toggleCategory = (cat: QuestionCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-violet-50/20">
      {/* Hero — full width */}
      <div className="border-b bg-gradient-to-br from-violet-800 via-indigo-800 to-slate-900 text-white shrink-0">
        <div className="px-4 py-6 lg:px-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-violet-200 text-sm font-medium mb-1">
                <Brain className="h-4 w-4" />
                AI Interview Studio
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Interview Questions</h1>
              <p className="text-violet-100/90 text-sm mt-1 max-w-2xl">
                Generate role-specific question packs, map to hiring pipeline rounds, and export for live interviews.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                <Link href="/dashboard/recruiter/video-interviews">
                  <Video className="h-4 w-4 mr-1.5" /> Video interviews
                </Link>
              </Button>
              <Button size="sm" variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                <Link href="/dashboard/recruiter/candidates">
                  <Users className="h-4 w-4 mr-1.5" /> Candidates
                </Link>
              </Button>
              <Button size="sm" variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                <Link href="/dashboard/history">
                  <GitBranch className="h-4 w-4 mr-1.5" /> Pipeline history
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: "Question sets", val: stats.sets },
              { label: "Total questions", val: stats.questions },
              { label: "Avg / set", val: stats.avgPerSet },
              { label: "Starred", val: stats.starred },
              { label: "This month", val: stats.thisMonth },
              { label: "Categories", val: stats.categoryCoverage },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 border border-white/15 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-violet-200 font-semibold">{s.label}</p>
                <p className="text-xl font-bold">{s.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main workspace — fills remaining viewport */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Generator */}
        <aside className="w-full lg:w-[300px] shrink-0 border-r bg-white flex flex-col min-h-0 overflow-y-auto">
          <div className="p-4 border-b bg-violet-50/50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
              <Wand2 className="h-4 w-4 text-violet-600" />
              Generate pack
            </h2>
          </div>
          <div className="p-4 space-y-4 flex-1">
            {jobs.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">From job posting</label>
                <Select value={selectedJobId} onValueChange={applyJob}>
                  <SelectTrigger className="mt-1 h-9">
                    <SelectValue placeholder="Select a job…" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j._id} value={j._id}>
                        {j.title} ({j.applicationCount ?? 0} apps)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600">Position</label>
              <Input className="mt-1 h-9" placeholder="e.g. Data Scientist" value={position} onChange={(e) => setPosition(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600">Experience</label>
                <Select value={experience} onValueChange={setExperience}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Round</label>
                <Select value={round} onValueChange={(v) => setRound(v as InterviewRound)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROUND_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Key skills</label>
              <Input className="mt-1 h-9" placeholder="Python, ML, SQL…" value={skills} onChange={(e) => setSkills(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Count</label>
              <Input type="number" min={5} max={30} className="mt-1 h-9" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value) || 10)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">Categories</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_CATEGORIES.map((cat) => (
                  <label key={cat} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox checked={selectedCategories.includes(cat)} onCheckedChange={() => toggleCategory(cat)} />
                    {CATEGORY_META[cat].label}
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={generateQuestions} disabled={generating || !position.trim()} className="w-full bg-violet-600 hover:bg-violet-700">
              {generating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {generating ? "Generating…" : "Generate with AI"}
            </Button>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Quick templates</p>
              <div className="space-y-1.5">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="w-full text-left rounded-lg border px-3 py-2 text-xs hover:bg-violet-50 hover:border-violet-200 transition-colors"
                  >
                    <span className="font-semibold text-slate-800">{t.name}</span>
                    <span className="text-slate-500 block">{t.position}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Middle: Sets library */}
        <div className="w-full lg:w-[280px] shrink-0 border-r bg-slate-50/80 flex flex-col min-h-0">
          <div className="p-3 border-b bg-white flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-violet-600" />
              Library ({questionSets.length})
            </h2>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
              const blank: QuestionSet = {
                id: `set_${Date.now()}`,
                name: "Custom set",
                position: position || "Role",
                questions: [],
                createdAt: new Date().toISOString(),
                aiGenerated: false,
                round: "technical",
              }
              setQuestionSets((p) => [blank, ...p])
              setSelectedSet(blank)
            }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {questionSets.map((set) => (
              <button
                key={set.id}
                type="button"
                onClick={() => setSelectedSet(set)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  selectedSet?.id === set.id
                    ? "border-violet-500 bg-white shadow-md shadow-violet-100"
                    : "border-transparent bg-white hover:border-slate-200"
                }`}
              >
                <div className="flex justify-between gap-1">
                  <p className="font-semibold text-sm text-slate-900 line-clamp-2">{set.name}</p>
                  {set.aiGenerated && <Badge className="bg-violet-100 text-violet-700 text-[9px] shrink-0">AI</Badge>}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{set.position}</p>
                <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                  <span>{set.questions.length} Q</span>
                  <span>{formatDistanceToNow(new Date(set.createdAt), { addSuffix: true })}</span>
                </div>
                {set.round && (
                  <Badge variant="outline" className="mt-2 text-[9px]">{ROUND_LABELS[set.round]}</Badge>
                )}
              </button>
            ))}
            {questionSets.length === 0 && (
              <div className="text-center py-12 px-4 text-sm text-muted-foreground">
                <Brain className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                Generate your first pack
              </div>
            )}
          </div>
        </div>

        {/* Right: Question workspace */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-white">
          {selectedSet ? (
            <>
              <div className="border-b p-4 shrink-0 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedSet.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedSet.position}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="secondary">{selectedSet.questions.length} questions</Badge>
                      {selectedSet.round && <Badge variant="outline">{ROUND_LABELS[selectedSet.round]}</Badge>}
                      <Badge variant="outline" className="text-slate-500">
                        {format(new Date(selectedSet.createdAt), "MMM d, yyyy")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="h-8" onClick={copyAll}><Copy className="h-3.5 w-3.5 mr-1" /> Copy all</Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => exportSet(selectedSet, true)}><FileText className="h-3.5 w-3.5 mr-1" /> TXT</Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => exportSet(selectedSet)}><Download className="h-3.5 w-3.5 mr-1" /> JSON</Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => duplicateSet(selectedSet)}>Duplicate</Button>
                    <Button size="sm" variant="outline" className="h-8 text-red-600" onClick={() => deleteSet(selectedSet.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                {categoryBreakdown.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <BarChart3 className="h-4 w-4 text-violet-500 shrink-0" />
                    {categoryBreakdown.map((c) => (
                      <div key={c.cat} className="flex items-center gap-2 text-xs">
                        <span className="font-medium" style={{ color: CATEGORY_META[c.cat].color }}>{CATEGORY_META[c.cat].label}</span>
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: CATEGORY_META[c.cat].color }} />
                        </div>
                        <span className="text-slate-500">{c.count}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[140px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input className="pl-8 h-8 text-sm" placeholder="Search questions…" value={qSearch} onChange={(e) => setQSearch(e.target.value)} />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[130px] h-8 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {ALL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_META[c].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                    <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All levels</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">No questions match filters</div>
                ) : (
                  filteredQuestions.map((q, idx) => (
                    <div key={q.id} className="rounded-xl border border-slate-200 p-4 hover:border-violet-200 hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-400">Q{idx + 1}</span>
                        <div className="flex gap-1 flex-wrap justify-end">
                          <Badge className="text-[10px]" style={{ background: CATEGORY_META[q.category].bg, color: CATEGORY_META[q.category].color }}>
                            {CATEGORY_META[q.category].label}
                          </Badge>
                          <Badge className={`text-[10px] ${DIFFICULTY_META[q.difficulty]}`}>{q.difficulty}</Badge>
                        </div>
                      </div>
                      {editingId === q.id ? (
                        <div className="space-y-2">
                          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEdit(q.id)}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-900 font-medium leading-relaxed">{q.question}</p>
                      )}
                      {q.expectedAnswer && (
                        <div className="mt-3 rounded-lg bg-slate-50 border border-slate-100 p-3">
                          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Rubric / expected signals</p>
                          <p className="text-xs text-slate-600 leading-relaxed">{q.expectedAnswer}</p>
                        </div>
                      )}
                      {q.followUpQuestions?.length ? (
                        <ul className="mt-2 text-xs text-slate-500 space-y-1 pl-3">
                          {q.followUpQuestions.map((f, i) => <li key={i}>→ {f}</li>)}
                        </ul>
                      ) : null}
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100">
                        <div className="flex gap-1 flex-wrap">
                          {q.tags.map((t) => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
                        </div>
                        <div className="flex gap-0.5">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => toggleStar(q.id)}>
                            <Star className={`h-3.5 w-3.5 ${q.starred ? "fill-amber-400 text-amber-500" : ""}`} />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { navigator.clipboard.writeText(q.question); toast({ title: "Copied" }) }}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingId(q.id); setEditText(q.question) }}>
                            <Target className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pipeline footer strip */}
              <div className="border-t bg-slate-50 px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <GitBranch className="h-3.5 w-3.5" />
                  Map to pipeline: use this pack in{" "}
                  <Link href="/dashboard/recruiter/video-interviews" className="text-violet-600 font-semibold hover:underline">Video interviews</Link>
                  {" "}or assign when moving candidates to interview stage.
                </span>
                <Button size="sm" variant="outline" className="h-7" asChild>
                  <Link href="/dashboard/recruiter/candidates">
                    Open candidates <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
                <Brain className="h-10 w-10 text-violet-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Select or generate a question pack</h3>
              <p className="text-muted-foreground text-sm mt-2 max-w-md">
                Use AI to build technical, behavioral, and situational questions aligned to your jobs and interview rounds.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left">
                {[
                  { icon: Briefcase, title: "From jobs", desc: "Pull skills from postings" },
                  { icon: Sparkles, title: "AI generate", desc: "12+ smart questions" },
                  { icon: Video, title: "Run interviews", desc: "Export & use live" },
                ].map((item) => (
                  <div key={item.title} className="rounded-xl border p-3 bg-white">
                    <item.icon className="h-5 w-5 text-violet-600 mb-1" />
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
