"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, ArrowLeft, Code2, Save, Sparkles, Shield, Clock,
  Settings2, CalendarIcon, BookOpen, Zap, CheckCircle2, CheckCircle,
  Globe, Lock, Send, Download, Trophy, Target, FileText,
  TestTube2, Timer, Layers, ChevronRight, Info, Users, BarChart3
} from "lucide-react"
import { CodingTestCreator, type CodingProblem } from "@/components/assessment/CodingTestCreator"
import { authFetch } from "@/lib/client-auth"

// ── Problem Templates ───────────────────────────────────────────────────────
const PROBLEM_TEMPLATES = [
  {
    name: "Two Sum", difficulty: "Easy", tags: ["Arrays", "HashMap"],
    statement: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
    constraints: "2 ≤ nums.length ≤ 10^4\n-10^9 ≤ nums[i] ≤ 10^9\nOnly one valid answer exists.",
    examples: [
      { input: "4\n2 7 11 15\n9", output: "0 1", explanation: "nums[0] + nums[1] = 9" },
      { input: "3\n3 2 4\n6", output: "1 2", explanation: "" },
    ],
    starterCode: "n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\nseen = {}\nfor i, num in enumerate(nums):\n    diff = target - num\n    if diff in seen:\n        print(seen[diff], i)\n        exit()\n    seen[num] = i",
  },
  {
    name: "Valid Parentheses", difficulty: "Medium", tags: ["Stack", "String"],
    statement: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    constraints: "1 ≤ s.length ≤ 10^4",
    examples: [
      { input: "()", output: "true", explanation: "" },
      { input: "(]", output: "false", explanation: "" },
    ],
    starterCode: "s = input().strip()\nstack = []\nmap_ = {')':'(', '}':'{', ']':'['}\nfor c in s:\n    if c in '([{':\n        stack.append(c)\n    elif not stack or stack[-1] != map_[c]:\n        print('false'); exit()\n    else:\n        stack.pop()\nprint('true' if not stack else 'false')",
  },
  {
    name: "Maximum Subarray", difficulty: "Medium", tags: ["DP", "Arrays"],
    statement: "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
    constraints: "1 ≤ nums.length ≤ 10^5\n-10^4 ≤ nums[i] ≤ 10^4",
    examples: [{ input: "-2 1 -3 4 -1 2 1 -5 4", output: "6", explanation: "[4,-1,2,1] has sum 6." }],
    starterCode: "nums = list(map(int, input().split()))\ncur = max_s = nums[0]\nfor n in nums[1:]:\n    cur = max(n, cur + n)\n    max_s = max(max_s, cur)\nprint(max_s)",
  },
  {
    name: "Binary Search", difficulty: "Easy", tags: ["Binary Search"],
    statement: "Given a sorted array and a target, return its index or -1 if not found.",
    constraints: "1 ≤ nums.length ≤ 10^4",
    examples: [{ input: "-1 0 3 5 9 12\n9", output: "4", explanation: "" }],
    starterCode: "nums = list(map(int, input().split()))\ntarget = int(input())\nlo, hi = 0, len(nums)-1\nwhile lo <= hi:\n    mid = (lo+hi)//2\n    if nums[mid] == target: print(mid); exit()\n    elif nums[mid] < target: lo = mid+1\n    else: hi = mid-1\nprint(-1)",
  },
  {
    name: "Fibonacci Number", difficulty: "Easy", tags: ["DP", "Recursion"],
    statement: "Given n, calculate F(n) where F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2).",
    constraints: "0 ≤ n ≤ 30",
    examples: [{ input: "10", output: "55", explanation: "" }],
    starterCode: "n = int(input())\na, b = 0, 1\nfor _ in range(n): a, b = b, a+b\nprint(a)",
  },
  {
    name: "Merge Intervals", difficulty: "Hard", tags: ["Arrays", "Sorting"],
    statement: "Given an array of intervals, merge all overlapping intervals. First line: n. Next n lines: start end.",
    constraints: "1 ≤ intervals.length ≤ 10^4",
    examples: [{ input: "4\n1 3\n2 6\n8 10\n15 18", output: "1 6\n8 10\n15 18", explanation: "" }],
    starterCode: "n = int(input())\nintervals = [list(map(int, input().split())) for _ in range(n)]\nintervals.sort()\nmerged = [intervals[0]]\nfor s, e in intervals[1:]:\n    if s <= merged[-1][1]: merged[-1][1] = max(merged[-1][1], e)\n    else: merged.append([s, e])\nfor a, b in merged: print(a, b)",
  },
]

const LANG_OPTIONS = ["python", "javascript", "typescript", "java", "cpp", "c", "go", "rust", "kotlin", "swift"]
const LANG_LABELS: Record<string, string> = {
  python: "Python", javascript: "JavaScript", typescript: "TypeScript",
  java: "Java", cpp: "C++", c: "C", go: "Go", rust: "Rust", kotlin: "Kotlin", swift: "Swift",
}

const DIFF_BADGE: Record<string, string> = {
  Easy: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Medium: "bg-amber-50 text-amber-700 border border-amber-200",
  Hard: "bg-rose-50 text-rose-700 border border-rose-200",
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CreateCodingTestPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(90)
  const [passingScore, setPassingScore] = useState(70)
  const [maxAttempts, setMaxAttempts] = useState(1)
  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)

  const [problems, setProblems] = useState<CodingProblem[]>([{
    id: `prob_${Date.now()}`, questionText: "", type: "code_snippet", difficulty: "Medium",
    tags: [], constraints: "", examples: [], language: "python",
    starterCode: "# Write your solution here\n\n",
    testCases: [], points: 20, timeLimitMs: 2000, memoryLimitMb: 256,
  }])

  const [enableSchedule, setEnableSchedule] = useState(false)
  const [availableFrom, setAvailableFrom] = useState("")
  const [availableTo, setAvailableTo] = useState("")

  const [enableProctoring, setEnableProctoring] = useState(true)
  const [enableObjectDetection, setEnableObjectDetection] = useState(true)
  const [restrictCopyPaste, setRestrictCopyPaste] = useState(true)
  const [detectTabSwitch, setDetectTabSwitch] = useState(true)
  const [webcamRequired, setWebcamRequired] = useState(true)
  const [requireFullscreen, setRequireFullscreen] = useState(true)
  const [enableAudioMonitoring, setEnableAudioMonitoring] = useState(true)
  const [enablePeriodicSnapshots, setEnablePeriodicSnapshots] = useState(true)
  const [shuffleProblems, setShuffleProblems] = useState(false)
  const [maxTabSwitches, setMaxTabSwitches] = useState(2)

  const [restrictLanguages, setRestrictLanguages] = useState(false)
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(["python", "javascript", "java", "cpp", "typescript"])

  const [showTemplateLib, setShowTemplateLib] = useState(false)
  const [aiPrompt, setAiPrompt] = useState("")
  const [aiGenerating, setAiGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<"settings" | "schedule" | "security" | "languages">("settings")

  const totalPoints = problems.reduce((s, p) => s + p.points, 0)
  const totalTCs = problems.reduce((s, p) => s + p.testCases.length, 0)
  const diff = {
    Easy: problems.filter(p => p.difficulty === "Easy").length,
    Medium: problems.filter(p => p.difficulty === "Medium").length,
    Hard: problems.filter(p => p.difficulty === "Hard").length,
  }

  const loadTemplate = (tmpl: typeof PROBLEM_TEMPLATES[0]) => {
    const p: CodingProblem = {
      id: `prob_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      questionText: tmpl.statement, type: "code_snippet", difficulty: tmpl.difficulty as any,
      tags: tmpl.tags, constraints: tmpl.constraints,
      examples: tmpl.examples.map((e, i) => ({ id: `ex_${i}`, input: e.input, output: e.output, explanation: e.explanation })),
      language: "python", starterCode: tmpl.starterCode, testCases: [],
      points: tmpl.difficulty === "Easy" ? 10 : tmpl.difficulty === "Medium" ? 20 : 30,
      timeLimitMs: 2000, memoryLimitMb: 256,
    }
    setProblems(prev => [...prev, p])
    setShowTemplateLib(false)
    toast({ title: `✅ "${tmpl.name}" added as Problem ${problems.length + 1}` })
  }

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) { toast({ title: "Enter a prompt first", variant: "destructive" }); return }
    setAiGenerating(true)
    try {
      const res = await fetch("/api/ai/generate-problem", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      })
      const data = await res.json()
      if (res.ok && data.problem) {
        setProblems(prev => [...prev, {
          id: `prob_${Date.now()}`, questionText: data.problem.statement || aiPrompt,
          type: "code_snippet", difficulty: data.problem.difficulty || "Medium",
          tags: data.problem.tags || [], constraints: data.problem.constraints || "",
          examples: (data.problem.examples || []).map((e: any, i: number) => ({ id: `ex_${i}`, input: e.input, output: e.output, explanation: e.explanation || "" })),
          language: "python", starterCode: data.problem.starterCode || "# Write your solution here\n",
          testCases: (data.problem.testCases || []).map((tc: any, i: number) => ({ id: `tc_${i}`, input: tc.input, expectedOutput: tc.output || tc.expectedOutput || "", hidden: tc.hidden || false, weight: 1 })),
          points: 20, timeLimitMs: 2000, memoryLimitMb: 256,
        }])
        toast({ title: "🤖 AI problem generated!" }); setAiPrompt("")
      } else throw new Error("AI failed")
    } catch {
      setProblems(prev => [...prev, {
        id: `prob_${Date.now()}`, questionText: `${aiPrompt}\n\nRead input from stdin and print output to stdout.`,
        type: "code_snippet", difficulty: "Medium", tags: ["AI Generated"], constraints: "1 ≤ n ≤ 10^5",
        examples: [], language: "python", starterCode: "# Write your solution here\n",
        testCases: [], points: 20, timeLimitMs: 2000, memoryLimitMb: 256,
      }])
      toast({ title: "Draft created from prompt", description: "Add test cases and refine the statement." })
      setAiPrompt("")
    } finally { setAiGenerating(false) }
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ title, description, durationMinutes, passingScore, problems }, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob); const a = document.createElement("a")
    a.href = url; a.download = `${title || "coding-test"}.json`; a.click(); URL.revokeObjectURL(url)
  }

  const [savedTestId, setSavedTestId] = useState<string | null>(null)

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: "Test title is required", variant: "destructive" }); return }
    if (problems.some(p => !p.questionText.trim())) { toast({ title: "All problems need a statement", variant: "destructive" }); return }
    setSaving(true)
    try {
      const payload: any = {
        title: title.trim(), description, durationMinutes, passingScore, maxAttempts, isPublic,
        questions: problems.map(p => ({
          questionText: p.questionText, type: "code_snippet", difficulty: p.difficulty,
          tags: p.tags, constraints: p.constraints,
          examples: p.examples.map(ex => ({ input: ex.input, output: ex.output, explanation: ex.explanation })),
          language: p.language, starterCode: p.starterCode,
          testCases: p.testCases.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput, hidden: tc.hidden, weight: tc.weight })),
          points: p.points, timeLimitMs: p.timeLimitMs, memoryLimitMb: p.memoryLimitMb, correctAnswer: "",
        })),
        settings: {
          enableProctoring, enableObjectDetection, restrictCopyPaste, detectTabSwitch,
          webcamRequired, requireFullscreen, enableAudioMonitoring, enablePeriodicSnapshots,
          shuffleProblems, maxTabSwitches, restrictLanguages,
          allowedLanguages: restrictLanguages ? allowedLanguages : [],
        },
      }
      if (enableSchedule) { payload.availableFrom = availableFrom || null; payload.availableTo = availableTo || null }
      const res = await authFetch("/api/tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as any).message || "Save failed") }
      const result = await res.json()
      const newId = result.test?._id || result._id || result.id || null
      setSavedTestId(newId)
      toast({ title: "🎉 Test published!", description: `"${title}" is live and ready to assign to candidates.` })
      // Don't auto-redirect — let the user choose what to do next
    } catch (e: any) { toast({ title: "Error saving test", description: e.message, variant: "destructive" }) }
    finally { setSaving(false) }
  }

  const TABS = [
    { key: "settings", label: "Settings", icon: <Settings2 className="h-3.5 w-3.5" /> },
    { key: "schedule", label: "Schedule", icon: <CalendarIcon className="h-3.5 w-3.5" /> },
    { key: "security", label: "Security", icon: <Shield className="h-3.5 w-3.5" /> },
    { key: "languages", label: "Languages", icon: <Code2 className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* ── SUCCESS BANNER ─────────────────────────────────────────────────── */}
      {savedTestId && (
        <div className="shrink-0 bg-emerald-600 text-white px-5 py-3 flex items-center justify-between gap-4 z-50">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-white shrink-0" />
            <div>
              <p className="text-sm font-semibold">Test published successfully!</p>
              <p className="text-xs text-emerald-100">"{title}" is live. Assign it to candidates or view analytics.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline"
              className="h-8 bg-white/10 hover:bg-white/20 border-white/30 text-white text-xs gap-1.5"
              onClick={() => router.push(`/dashboard/recruiter/tests/${savedTestId}/analytics`)}>
              <BarChart3 className="h-3.5 w-3.5" />View Analytics
            </Button>
            <Button size="sm"
              className="h-8 bg-white text-emerald-700 hover:bg-emerald-50 text-xs gap-1.5 font-semibold"
              onClick={() => router.push(`/dashboard/recruiter/tests/${savedTestId}/assign`)}>
              <Users className="h-3.5 w-3.5" />Assign to Candidates
            </Button>
            <Button size="sm" variant="ghost"
              className="h-8 text-white hover:bg-white/10 text-xs"
              onClick={() => router.push("/dashboard/recruiter/tests")}>
              Go to Tests
            </Button>
          </div>
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="h-14 shrink-0 flex items-center justify-between px-5 bg-white border-b border-gray-200 shadow-sm z-40">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 gap-1.5 px-2" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />Back
          </Button>
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center shadow-sm">
              <Code2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-tight">{title || "New Coding Test"}</p>
              <p className="text-[10px] text-gray-400 leading-tight">HackerRank-style · Judge0 execution</p>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1">
            <FileText className="h-3 w-3 text-gray-400" />{problems.length} problem{problems.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 text-amber-700">
            <Trophy className="h-3 w-3" />{totalPoints} pts
          </span>
          <span className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1 text-blue-700">
            <TestTube2 className="h-3 w-3" />{totalTCs} test cases
          </span>
          <span className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-2.5 py-1 text-green-700">
            <Timer className="h-3 w-3" />{durationMinutes}m
          </span>
          {diff.Easy > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DIFF_BADGE.Easy}`}>E:{diff.Easy}</span>}
          {diff.Medium > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DIFF_BADGE.Medium}`}>M:{diff.Medium}</span>}
          {diff.Hard > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${DIFF_BADGE.Hard}`}>H:{diff.Hard}</span>}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-gray-600 hidden sm:flex" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />Export
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 px-4 shadow-sm">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : "Save & Publish"}
          </Button>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100 shrink-0 px-1 pt-1">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key as any)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-all rounded-t border-b-2 ${activeTab === t.key
                  ? "border-purple-500 text-purple-600 bg-purple-50/60"
                  : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
                {t.icon}<span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* SETTINGS TAB */}
            {activeTab === "settings" && (
              <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Test Title <span className="text-red-500">*</span></Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Backend Engineering Challenge"
                    className="h-9 text-sm border-gray-200 focus:border-purple-400 focus:ring-purple-100" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Instructions shown to candidates before they start…"
                    rows={3} className="text-xs border-gray-200 resize-none focus:border-purple-400 focus:ring-purple-100" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1"><Clock className="h-3 w-3 text-gray-400" />Duration (min)</Label>
                    <Input type="number" min={15} max={300} value={durationMinutes}
                      onChange={e => setDurationMinutes(parseInt(e.target.value) || 90)}
                      className="h-8 text-sm border-gray-200 focus:border-purple-400" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1"><Target className="h-3 w-3 text-gray-400" />Pass Score (%)</Label>
                    <Input type="number" min={0} max={100} value={passingScore}
                      onChange={e => setPassingScore(parseInt(e.target.value) || 70)}
                      className="h-8 text-sm border-gray-200 focus:border-purple-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">Max Attempts</Label>
                    <Select value={String(maxAttempts)} onValueChange={v => setMaxAttempts(Number(v))}>
                      <SelectTrigger className="h-8 text-xs border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5].map(n => <SelectItem key={n} value={String(n)} className="text-xs">{n} attempt{n > 1 ? "s" : ""}</SelectItem>)}
                        <SelectItem value="0" className="text-xs">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">Visibility</Label>
                    <div className="flex items-center gap-2 h-8">
                      <Switch checked={isPublic} onCheckedChange={setIsPublic} className="data-[state=checked]:bg-green-500" />
                      <span className="text-xs flex items-center gap-1 text-gray-600">
                        {isPublic ? <><Globe className="h-3 w-3 text-green-500" /><span className="text-green-600 font-medium">Public</span></> : <><Lock className="h-3 w-3 text-gray-400" />Private</>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Difficulty chart */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Difficulty Distribution</p>
                  {[
                    { l: "Easy", c: diff.Easy, col: "bg-emerald-400", bg: "bg-emerald-100" },
                    { l: "Medium", c: diff.Medium, col: "bg-amber-400", bg: "bg-amber-100" },
                    { l: "Hard", c: diff.Hard, col: "bg-rose-400", bg: "bg-rose-100" },
                  ].map(d => (
                    <div key={d.l} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-11">{d.l}</span>
                      <div className={`flex-1 h-2 ${d.bg} rounded-full overflow-hidden`}>
                        <div className={`h-full ${d.col} rounded-full transition-all duration-300`}
                          style={{ width: problems.length > 0 ? `${(d.c / problems.length) * 100}%` : "0%" }} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 w-4 text-right">{d.c}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-200">
                    <span className="text-amber-600 font-medium">{totalPoints} pts total</span>
                    <span className="text-blue-500 font-medium">{totalTCs} test cases</span>
                  </div>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><Zap className="h-3 w-3" />Pro Tips</p>
                  {["Add ≥3 hidden test cases for accurate Judge0 scoring", "Easy warmup → Medium core → Hard stretch", "400+ concurrent users supported"].map((t, i) => (
                    <p key={i} className="text-[10px] text-blue-500 flex items-start gap-1.5">
                      <CheckCircle2 className="h-2.5 w-2.5 shrink-0 mt-0.5 text-blue-400" />{t}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* SCHEDULE TAB */}
            {activeTab === "schedule" && (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Enable Scheduling</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Set an availability window</p>
                  </div>
                  <Switch checked={enableSchedule} onCheckedChange={setEnableSchedule} className="data-[state=checked]:bg-purple-500" />
                </div>
                {enableSchedule ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600">Available From</Label>
                      <Input type="datetime-local" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)}
                        className="h-8 text-xs border-gray-200 focus:border-purple-400" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600">Available Until</Label>
                      <Input type="datetime-local" value={availableTo} onChange={e => setAvailableTo(e.target.value)}
                        className="h-8 text-xs border-gray-200 focus:border-purple-400" />
                    </div>
                    <p className="text-[10px] text-gray-400 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                      Ideal for campus drives with 100–500 simultaneous candidates.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <CalendarIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Test available immediately after publishing</p>
                  </div>
                )}
              </div>
            )}

            {/* SECURITY TAB */}
            {activeTab === "security" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">Proctoring Suite</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Enable all anti-cheat features</p>
                  </div>
                  <Switch checked={enableProctoring} onCheckedChange={setEnableProctoring} className="data-[state=checked]:bg-red-500" />
                </div>
                <div className="space-y-2">
                  {[
                    { l: "Require Fullscreen", d: "Candidate must enter fullscreen before test", v: requireFullscreen, s: setRequireFullscreen },
                    { l: "Voice / Audio monitoring", d: "Detect speech and background noise via mic", v: enableAudioMonitoring, s: setEnableAudioMonitoring },
                    { l: "Periodic snapshots", d: "Capture webcam stills every 20s for review", v: enablePeriodicSnapshots, s: setEnablePeriodicSnapshots },
                    { l: "Phone/Object AI (COCO-SSD)", d: "Detect phones, books, and extra persons via camera", v: enableObjectDetection, s: setEnableObjectDetection },
                    { l: "Restrict Copy-Paste", d: "Block clipboard in editor", v: restrictCopyPaste, s: setRestrictCopyPaste },
                    { l: "Tab Switch Detection", d: "Warn when leaving test window", v: detectTabSwitch, s: setDetectTabSwitch },
                    { l: "Webcam Required", d: "Candidate must enable camera", v: webcamRequired, s: setWebcamRequired },
                    { l: "Shuffle Problems", d: "Randomize problem order per user", v: shuffleProblems, s: setShuffleProblems },
                  ].map(item => (
                    <div key={item.l} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                      <div>
                        <p className="text-xs font-medium text-gray-700">{item.l}</p>
                        <p className="text-[10px] text-gray-400">{item.d}</p>
                      </div>
                      <Switch checked={item.v} onCheckedChange={item.s} className="scale-75 data-[state=checked]:bg-orange-500" />
                    </div>
                  ))}
                </div>
                {detectTabSwitch && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">Auto-submit after N tab switches</Label>
                    <Input type="number" min={1} max={10} value={maxTabSwitches}
                      onChange={e => setMaxTabSwitches(parseInt(e.target.value) || 3)}
                      className="h-8 text-sm border-gray-200 w-24 focus:border-purple-400" />
                  </div>
                )}
              </div>
            )}

            {/* LANGUAGES TAB */}
            {activeTab === "languages" && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Restrict Languages</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Allow only specific languages</p>
                  </div>
                  <Switch checked={restrictLanguages} onCheckedChange={setRestrictLanguages} className="data-[state=checked]:bg-purple-500" />
                </div>
                {restrictLanguages ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">{allowedLanguages.length} language{allowedLanguages.length !== 1 ? "s" : ""} selected</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {LANG_OPTIONS.map(lang => (
                        <label key={lang} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs font-medium ${allowedLanguages.includes(lang)
                          ? "bg-purple-50 border-purple-300 text-purple-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"}`}>
                          <input type="checkbox" checked={allowedLanguages.includes(lang)}
                            onChange={e => { if (e.target.checked) setAllowedLanguages(p => [...p, lang]); else setAllowedLanguages(p => p.filter(l => l !== lang)) }}
                            className="rounded accent-purple-500 h-3 w-3" />
                          {LANG_LABELS[lang]}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    All 10 languages available to candidates
                  </p>
                )}
              </div>
            )}
          </div>

          {/* AI Generator */}
          <div className="shrink-0 border-t border-gray-200 bg-gradient-to-b from-white to-purple-50/30 p-3 space-y-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-purple-500" />AI Problem Generator
            </p>
            <Textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
              placeholder="e.g. 'Graph BFS for senior backend role'"
              rows={2} className="text-xs border-gray-200 resize-none focus:border-purple-400 bg-white" />
            <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 gap-1.5 shadow-sm"
              onClick={handleAiGenerate} disabled={aiGenerating}>
              {aiGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {aiGenerating ? "Generating…" : "Generate with AI"}
            </Button>
          </div>

          {/* Template Library */}
          <div className="shrink-0 border-t border-gray-200 p-3 space-y-2">
            <button onClick={() => setShowTemplateLib(!showTemplateLib)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors px-1">
              <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-blue-500" />Problem Templates</span>
              <ChevronRight className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showTemplateLib ? "rotate-90" : ""}`} />
            </button>
            {showTemplateLib && (
              <div className="space-y-1 max-h-44 overflow-y-auto rounded-lg border border-gray-100">
                {PROBLEM_TEMPLATES.map(tmpl => (
                  <div key={tmpl.name} onClick={() => loadTemplate(tmpl)}
                    className="p-2 cursor-pointer hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">{tmpl.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${DIFF_BADGE[tmpl.difficulty]}`}>{tmpl.difficulty}</span>
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {tmpl.tags.slice(0, 2).map(t => (
                        <span key={t} className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── MAIN: PROBLEM EDITOR ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">
          <div className="flex-1 overflow-y-auto">
            <CodingTestCreator problems={problems} onChange={setProblems} />
          </div>

          {/* Bottom publish bar */}
          <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-gray-400" />{problems.length} problem{problems.length !== 1 ? "s" : ""}</span>
              <span className="flex items-center gap-1.5 text-amber-600 font-medium"><Trophy className="h-3.5 w-3.5" />{totalPoints} pts</span>
              <span className="flex items-center gap-1.5 text-green-600 font-medium"><Target className="h-3.5 w-3.5" />Pass at {passingScore}%</span>
              {enableProctoring && <span className="flex items-center gap-1.5 text-red-500 font-medium"><Shield className="h-3.5 w-3.5" />Proctored</span>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs text-gray-600" onClick={() => router.push("/dashboard/recruiter/tests")}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} size="sm" className="h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs px-5 gap-1.5 shadow-sm">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {saving ? "Publishing…" : "Publish Test"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

