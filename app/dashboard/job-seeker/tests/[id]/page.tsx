"use client"

import Link from "next/link"
import { useRef, useState, useEffect, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2, Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight,
  Send, Trophy, Play, CheckCircle, XCircle, Tag, Info,
  Terminal, ZoomIn, ZoomOut, RotateCcw, BookOpen, Moon, Sun, Code2,
  BarChart3, Timer, Shield, AlertTriangle, Camera,
} from "lucide-react"
import { useSession } from "@/hooks/use-session"
import { CodingTestProctor } from "@/components/proctor/coding-test-proctor"
import { MonacoCodeEditor } from "@/components/code/MonacoCodeEditor"
import { authFetch } from "@/lib/client-auth"
import {
  CODING_SECURITY_LAYERS,
  mergeTestSecurity,
  computeIntegrityScore,
  type SecurityActivityLog,
  type TestSecuritySettings,
} from "@/lib/coding-test-security"

const LANGS = [
  { value: "javascript", label: "JavaScript", monaco: "javascript", judgeId: 63 },
  { value: "typescript", label: "TypeScript", monaco: "typescript", judgeId: 74 },
  { value: "python", label: "Python 3", monaco: "python", judgeId: 71 },
  { value: "java", label: "Java", monaco: "java", judgeId: 62 },
  { value: "cpp", label: "C++17", monaco: "cpp", judgeId: 54 },
  { value: "c", label: "C", monaco: "c", judgeId: 50 },
  { value: "go", label: "Go", monaco: "go", judgeId: 60 },
  { value: "rust", label: "Rust", monaco: "rust", judgeId: 73 },
  { value: "kotlin", label: "Kotlin", monaco: "kotlin", judgeId: 78 },
  { value: "swift", label: "Swift", monaco: "swift", judgeId: 83 },
]

const STARTERS: Record<string, string> = {
  javascript: "// Read from stdin\nconst lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n')\n\n// Your solution here\n",
  typescript: "// Read from stdin\nconst lines: string[] = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n')\n\n// Your solution here\n",
  python: "import sys\ninput_data = sys.stdin.read().split('\\n')\n\n# Your solution here\n",
  java: "import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // Your solution here\n    }\n}",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n    \n    // Your solution here\n    \n    return 0;\n}",
  c: "#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    // Your solution here\n    return 0;\n}",
  go: "package main\n\nimport (\n    \"bufio\"\n    \"fmt\"\n    \"os\"\n)\n\nfunc main() {\n    reader := bufio.NewReader(os.Stdin)\n    _ = reader\n    // Your solution here\n}",
  rust: "use std::io::{self, BufRead};\n\nfn main() {\n    let stdin = io::stdin();\n    let mut lines = stdin.lock().lines();\n    // Your solution here\n}",
  kotlin: "import java.util.Scanner\n\nfun main() {\n    val sc = Scanner(System.`in`)\n    // Your solution here\n}",
  swift: "import Foundation\nlet input = readLine()!\n// Your solution here",
}

interface RunResult { input: string; expectedOutput: string; actualOutput: string; passed: boolean; time: number | null; error: string | null }
interface Question {
  _id: string; questionText: string; type: "multiple_choice" | "short_answer" | "code_snippet"
  options?: string[]; points?: number; language?: string; starterCode?: string
  difficulty?: string; tags?: string[]; constraints?: string
  examples?: { input: string; output: string; explanation?: string }[]
  testCases?: { input: string; expectedOutput: string; hidden?: boolean }[]
  hiddenTestCaseCount?: number
}
interface TestDetails {
  _id: string; title: string; description?: string; questions: Question[]
  durationMinutes: number; settings?: TestSecuritySettings; passingScore?: number
}
interface HiddenValidation {
  samplePassed: number; sampleTotal: number
  hiddenPassed: number; hiddenTotal: number
  allSamplePassed: boolean; allHiddenPassed: boolean; canSubmit: boolean
  sampleResults: boolean[]; hiddenResults: boolean[]
}
interface AppDetails { _id: string; jobDescriptionId: { _id: string; title: string }; testId: string | { _id: string }; testScore?: number; status: string }
interface SubmitResult {
  score: number
  submissionId: string
  timedOut?: boolean
  passed?: boolean
  breakdown?: {
    questionId: string
    score: number
    maxScore: number
    passed: boolean
    passedCases?: number
    totalCases?: number
    error?: string | null
  }[]
}

const COMPLETED_STATUSES = new Set(["Test Completed", "Test Passed", "Test Failed", "test_completed", "Reviewed"])
const ACTIVE_TEST_STATUSES = new Set(["Test Assigned", "in_progress"])

// ─────────────────────────────────────────────────────────────────────────────
export default function TakeTestPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCollegeMode = searchParams?.get("source") === "college"
  const appId = (params?.id as string) ?? ""
  const { toast } = useToast()
  const { session, isLoading: sessionLoading } = useSession()

  const [app, setApp] = useState<AppDetails | null>(null)
  const [test, setTest] = useState<TestDetails | null>(null)
  const [answers, setAnswers] = useState<{ questionId: string; answer: string | string[]; language?: string }[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(10)
  const [runResults, setRunResults] = useState<Record<string, RunResult[]>>({})
  const [running, setRunning] = useState<string | null>(null)

  // Editor state
  const [fontSize, setFontSize] = useState(14)
  const [theme, setTheme] = useState<"vs-dark" | "vs-light">("vs-dark")
  const [consoleTab, setConsoleTab] = useState<"cases" | "custom">("cases")
  const [customIn, setCustomIn] = useState("")
  const [customOut, setCustomOut] = useState("")
  const [customRunning, setCustomRunning] = useState(false)

  // Security / proctoring
  const [securityReady, setSecurityReady] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [agreedProctoring, setAgreedProctoring] = useState(false)
  const [preflightError, setPreflightError] = useState("")
  const [securityLogs, setSecurityLogs] = useState<SecurityActivityLog[]>([])
  const [hiddenValidation, setHiddenValidation] = useState<Record<string, HiddenValidation>>({})
  const [validatingHidden, setValidatingHidden] = useState<string | null>(null)
  const preflightVideoRef = useRef<HTMLVideoElement>(null)
  const preflightStreamRef = useRef<MediaStream | null>(null)
  const pendingDurationRef = useRef<number | null>(null)

  const tabSwitches = useRef(0)
  const submittingRef = useRef(false)
  const autoSubmitted = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-save drafts
  const saveDraft = useCallback((qId: string, code: string) => {
    try { localStorage.setItem(`draft-${appId}-${qId}`, code) } catch {}
  }, [appId])
  const loadDraft = useCallback((qId: string) => {
    try { return localStorage.getItem(`draft-${appId}-${qId}`) } catch { return null }
  }, [appId])

  useEffect(() => {
    return () => {
      preflightStreamRef.current?.getTracks().forEach(t => t.stop())
      preflightStreamRef.current = null
    }
  }, [])

  const enableCamera = async () => {
    setPreflightError("")
    try {
      preflightStreamRef.current?.getTracks().forEach(t => t.stop())
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: true,
      })
      preflightStreamRef.current = stream
      if (preflightVideoRef.current) {
        preflightVideoRef.current.srcObject = stream
        await preflightVideoRef.current.play()
      }
      setCameraReady(true)
    } catch {
      setCameraReady(false)
      setPreflightError("Camera/microphone access is required. Allow permissions in your browser and try again.")
    }
  }

  const beginTest = async () => {
    if (!cameraReady || !agreedProctoring) return
    preflightStreamRef.current?.getTracks().forEach(t => t.stop())
    preflightStreamRef.current = null
    if (!isCollegeMode) {
      try {
        await authFetch(`/api/applications/${appId}/start-test`, { method: "POST" })
        setApp(prev => prev ? { ...prev, status: "in_progress" } : prev)
      } catch {
        /* allow local start if API unreachable */
      }
    }
    if (pendingDurationRef.current !== null) {
      setTimeLeft(pendingDurationRef.current)
      pendingDurationRef.current = null
    }
    setSecurityReady(true)
  }

  const doSubmit = useCallback(async (timedOut = false, currentAnswers?: typeof answers) => {
    if (submittingRef.current || autoSubmitted.current) return
    submittingRef.current = true; autoSubmitted.current = true
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setSubmitting(true)
    try {
      const finalAnswers = currentAnswers ?? answers
      const submitUrl = isCollegeMode
        ? `/api/job-seeker/college-tests/${appId}/submit`
        : `/api/applications/${appId}/submit-test`
      const res = await authFetch(submitUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: finalAnswers,
          tabSwitches: tabSwitches.current,
          activityLog: securityLogs,
          integrityAudit: {
            score: computeIntegrityScore(
              tabSwitches.current,
              securityLogs,
              mergeTestSecurity(test?.settings).maxTabSwitches ?? 2,
            ),
            summary: securityLogs.length ? `${securityLogs.length} security events` : "Clean session",
            flags: securityLogs.map(l => l.type),
            logs: securityLogs,
            tabSwitches: tabSwitches.current,
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult({
          score: data.score ?? 0,
          submissionId: data.submissionId,
          timedOut,
          passed: data.passed,
          breakdown: data.breakdown,
        })
        setSubmitted(true)
        setApp(prev => prev ? { ...prev, status: data.status || "Test Completed", testScore: data.score ?? 0 } : prev)
        try { finalAnswers.forEach(a => localStorage.removeItem(`draft-${appId}-${a.questionId}`)) } catch {}
        toast({ title: timedOut ? "⏰ Time's Up!" : "✅ Submitted!", description: `Score: ${data.score ?? 0}%` })
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: "Submission failed", description: (err as any).message || "Please retry.", variant: "destructive" })
        submittingRef.current = false; autoSubmitted.current = false
      }
    } catch {
      toast({ title: "Network error", description: "Check your connection.", variant: "destructive" })
      submittingRef.current = false; autoSubmitted.current = false
    } finally { setSubmitting(false) }
  }, [appId, answers, toast, isCollegeMode, securityLogs, test?.settings])

  const handleSecurityActivity = useCallback((log: SecurityActivityLog) => {
    setSecurityLogs(prev => [...prev, log])
  }, [])

  const handleSecurityTerminate = useCallback((reason: string) => {
    toast({ title: "Test ended", description: reason, variant: "destructive" })
    tabSwitches.current = mergeTestSecurity(test?.settings).maxTabSwitches ?? 2
    doSubmit(true, answers)
  }, [answers, doSubmit, test?.settings, toast])

  const testSettings = mergeTestSecurity(test?.settings)

  const validateHiddenCases = async (q: Question) => {
    const ans = answers.find(a => a.questionId === q._id)
    const code = (ans?.answer as string) || ""
    const lang = ans?.language || q.language || "python"
    const langCfg = LANGS.find(l => l.value === lang) || LANGS[2]
    if (!code.trim() || !test?._id) return null
    setValidatingHidden(q._id)
    try {
      const res = await authFetch("/api/code/validate-hidden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: test._id,
          questionId: q._id,
          code,
          languageId: langCfg.judgeId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setHiddenValidation(prev => ({ ...prev, [q._id]: data as HiddenValidation }))
        return data as HiddenValidation
      }
      toast({ title: "Validation failed", description: data.message, variant: "destructive" })
      return null
    } catch {
      toast({ title: "Network error", variant: "destructive" })
      return null
    } finally {
      setValidatingHidden(null)
    }
  }

  const canSubmitCodingQuestion = (q: Question) => {
    const hv = hiddenValidation[q._id]
    const sampleRuns = runResults[q._id] || []
    const visible = (q.testCases || []).filter(tc => !tc.hidden)
    const sampleOk = visible.length === 0 || sampleRuns.length === visible.length &&
      sampleRuns.every(r => r.passed)
    const hiddenOk = !hv || hv.canSubmit
    return sampleOk && hiddenOk
  }

  const trySubmitTest = async () => {
    if (!test) return
    const codingQs = test.questions.filter(q => q.type === "code_snippet")
    for (const q of codingQs) {
      if (!canSubmitCodingQuestion(q)) {
        const hv = await validateHiddenCases(q)
        if (!hv?.canSubmit) {
          toast({
            title: "Fix your code before submitting",
            description: "All sample and hidden test cases must pass. Hidden case inputs are not shown — only pass/fail status.",
            variant: "destructive",
          })
          return
        }
      }
    }
    const un = test.questions.length - answered
    if (un > 0 && !window.confirm(`${un} unanswered question(s). Submit anyway?`)) return
    doSubmit(false, answers)
  }

  useEffect(() => {
    if (timeLeft === null || submitted || !securityReady) return
    if (timeLeft <= 0) { if (!autoSubmitted.current) doSubmit(true, answers); return }
    timerRef.current = setInterval(() => setTimeLeft(p => (p !== null && p > 0 ? p - 1 : 0)), 1000)
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [timeLeft, submitted, doSubmit, answers, securityReady])

  useEffect(() => {
    if (!submitted) return
    const iv = setInterval(() => setCountdown(c => { if (c <= 1) { clearInterval(iv); router.replace("/dashboard/job-seeker/tests"); return 0 } return c - 1 }), 1000)
    return () => clearInterval(iv)
  }, [submitted, router])

  useEffect(() => {
    if (appId && session) {
      if (isCollegeMode) fetchCollegeAssignment()
      else fetchApp()
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, session, isCollegeMode])

  const fetchCollegeAssignment = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/job-seeker/college-tests/${appId}`, { cache: "no-store" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast({
          title: "Could not load test",
          description: (err as { message?: string }).message || "Assignment not found.",
          variant: "destructive",
        })
        router.push("/dashboard/job-seeker/tests")
        return
      }

      const data = await res.json()
      const assignment = data.assignment
      const testPayload = data.test

      setApp({
        _id: String(assignment._id),
        jobDescriptionId: { _id: "", title: assignment.testTitle || "College Assessment" },
        testId: String(testPayload._id),
        testScore: assignment.testScore,
        status: assignment.status === "completed" ? "Test Completed" : "assigned",
      })

      if (assignment.status === "completed") {
        setResult({
          score: assignment.testScore ?? 0,
          submissionId: "",
          passed: (assignment.testScore ?? 0) >= (testPayload.passingScore ?? 60),
          breakdown: [],
        })
        setSubmitted(true)
      }

      const durationMinutes = testPayload.durationMinutes ?? testPayload.timeLimit ?? 30
      const normalized: TestDetails = {
        _id: String(testPayload._id),
        title: testPayload.title || assignment.testTitle || "College Assessment",
        description: testPayload.description,
        durationMinutes,
        questions: (testPayload.questions || []).map((q: Question, i: number) => ({
          ...q,
          _id: q._id?.toString?.() || q._id || String(i),
          questionText: q.questionText || (q as { question?: string }).question || "",
          type: ((q as { type?: string }).type === "coding" ? "code_snippet" : q.type) as Question["type"],
        })),
      }
      setTest(normalized)
      setAnswers(normalized.questions.map(q => {
        const saved = q.type === "code_snippet" ? loadDraft(q._id) : null
        return {
          questionId: q._id,
          answer: saved ?? (q.type === "multiple_choice" ? [] : (q.starterCode || STARTERS[q.language || "python"] || "")),
          language: q.language || "python",
        }
      }))
      pendingDurationRef.current = durationMinutes * 60
      setTimeLeft(null)
    } catch {
      toast({ title: "Failed to load test", variant: "destructive" })
      router.push("/dashboard/job-seeker/tests")
    } finally {
      setLoading(false)
    }
  }

  const resolveApplicationId = async (id: string): Promise<string | null> => {
    const appRes = await authFetch(`/api/applications/${id}`, { cache: "no-store" })
    if (appRes.ok) return id

    // URL may be a testId (legacy links) — resolve via assigned tests list
    const testsRes = await authFetch("/api/job-seeker/tests", { cache: "no-store" })
    if (!testsRes.ok) return null
    const { tests } = await testsRes.json()
    const match = (tests || []).find((t: any) =>
      String(t.applicationId) === id || String(t.testId) === id
    )
    return match?.applicationId ? String(match.applicationId) : null
  }

  const fetchApp = async () => {
    setLoading(true)
    try {
      const applicationId = await resolveApplicationId(appId)
      if (!applicationId) {
        toast({
          title: "Test not found",
          description: "This test is not assigned to your account or the link is invalid.",
          variant: "destructive",
        })
        router.push("/dashboard/job-seeker/tests")
        return
      }

      const res = await authFetch(`/api/applications/${applicationId}`, { cache: "no-store" })
      if (!res.ok) {
        toast({ title: "Could not load test", variant: "destructive" })
        router.push("/dashboard/job-seeker/tests")
        return
      }

      const data = await res.json()
      const a: AppDetails = data.application
      setApp(a)

      if (COMPLETED_STATUSES.has(a.status)) {
        setResult({
          score: a.testScore ?? 0,
          submissionId: "",
          passed: (a.testScore ?? 0) >= 70,
          breakdown: [],
        })
        setSubmitted(true)
      }

      const rawId = a.testId as any
      const testId = typeof rawId === "string" ? rawId : rawId?._id ?? null
      if (testId) await fetchTest(String(testId))
      else {
        toast({ title: "No test assigned", variant: "destructive" })
        router.push("/dashboard/job-seeker/tests")
      }
    } catch {
      toast({ title: "Failed to load test", variant: "destructive" })
      router.push("/dashboard/job-seeker/tests")
    } finally {
      setLoading(false)
    }
  }

  const fetchTest = async (testId: string) => {
    try {
      const res = await authFetch(`/api/tests/${testId}`, { cache: "no-store" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast({
          title: "Failed to load test",
          description: (err as any).message || "The test could not be loaded.",
          variant: "destructive",
        })
        router.push("/dashboard/job-seeker/tests")
        return
      }
      const data: TestDetails = await res.json()
      const durationMinutes = (data as any).durationMinutes ?? (data as any).timeLimit ?? 30
      const normalized: TestDetails = {
        ...data,
        durationMinutes,
        questions: (data.questions || []).map((q: any, i: number) => ({
          ...q,
          _id: q._id?.toString?.() || q._id || q.id?.toString?.() || String(i),
          questionText: q.questionText || q.question || "",
          type: q.type === "coding" ? "code_snippet" : q.type,
        })),
      }
      setTest(normalized)
      setAnswers(normalized.questions.map(q => {
        const saved = q.type === "code_snippet" ? loadDraft(q._id) : null
        return {
          questionId: q._id,
          answer: saved ?? (q.type === "multiple_choice" ? [] : (q.starterCode || STARTERS[q.language || "python"] || "")),
          language: q.language || "python",
        }
      }))
      pendingDurationRef.current = durationMinutes * 60
      setTimeLeft(null)
    } catch {
      toast({ title: "Failed to load questions", variant: "destructive" })
      router.push("/dashboard/job-seeker/tests")
    }
  }

  const setAnswer = (qId: string, value: string | string[], lang?: string) => {
    setAnswers(p => p.map(a => a.questionId === qId ? { ...a, answer: value, ...(lang ? { language: lang } : {}) } : a))
    if (typeof value === "string") saveDraft(qId, value)
  }

  const switchLang = (qId: string, lang: string) => {
    const saved = loadDraft(`${qId}-${lang}`)
    setAnswers(p => p.map(a => a.questionId === qId ? { ...a, language: lang, answer: saved || STARTERS[lang] || "" } : a))
  }

  const runCode = async (q: Question) => {
    const ans = answers.find(a => a.questionId === q._id)
    const code = (ans?.answer as string) || ""; const lang = ans?.language || q.language || "python"
    const langCfg = LANGS.find(l => l.value === lang) || LANGS[2]
    const visible = (q.testCases || []).filter(tc => !tc.hidden)
    if (!code.trim()) { toast({ title: "Write some code first", variant: "destructive" }); return }
    if (!visible.length) { toast({ title: "No sample test cases" }); return }
    setRunning(q._id); setConsoleTab("cases")
    try {
      const res = await authFetch("/api/code/run-tests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, languageId: langCfg.judgeId, testCases: visible.map(tc => ({ input: tc.input, expectedOutput: tc.expectedOutput })) }),
      })
      const data = await res.json()
      if (res.ok && data.results) {
        setRunResults(p => ({ ...p, [q._id]: data.results }))
        const passed = data.results.filter((r: RunResult) => r.passed).length
        toast({ title: `${passed}/${data.results.length} sample cases passed`, variant: passed === data.results.length ? "default" : "destructive" })
        await validateHiddenCases(q)
      } else {
        toast({
          title: res.status === 401 ? "Session expired" : "Run failed",
          description: data.message || (res.status === 401 ? "Please log in again and retry." : "Could not run code."),
          variant: "destructive",
        })
      }
    } catch { toast({ title: "Network error", variant: "destructive" }) }
    finally { setRunning(null) }
  }

  const runCustom = async (q: Question) => {
    const ans = answers.find(a => a.questionId === q._id)
    const code = (ans?.answer as string) || ""; const lang = ans?.language || q.language || "python"
    const langCfg = LANGS.find(l => l.value === lang) || LANGS[2]
    if (!code.trim()) return; setCustomRunning(true)
    try {
      const res = await authFetch("/api/code/run-tests", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, languageId: langCfg.judgeId, testCases: [{ input: customIn, expectedOutput: "" }] }),
      })
      const data = await res.json()
      if (res.ok && data.results?.[0]) { const r = data.results[0]; setCustomOut(r.error ? `Error:\n${r.error}` : r.actualOutput || "(no output)") }
    } catch { setCustomOut("Network error") }
    finally { setCustomRunning(false) }
  }

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
  }

  const answered = answers.filter(a => {
    if (Array.isArray(a.answer)) return a.answer.length > 0
    const q = test?.questions.find(q => q._id === a.questionId)
    const starter = q?.starterCode || STARTERS[q?.language || "python"] || ""
    return String(a.answer).trim() !== "" && a.answer !== starter
  }).length

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (sessionLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1117] gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#30363d] border-t-purple-500 animate-spin" />
          <Code2 className="h-6 w-6 text-purple-400 absolute inset-0 m-auto" />
        </div>
        <p className="text-[#8b949e] text-sm">Loading your test environment…</p>
      </div>
    )
  }

  if (!session || session.role !== "job_seeker") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Access Denied</h2>
          <p className="text-[#8b949e] text-sm mb-4">Only job seekers can take tests.</p>
          <Button className="bg-purple-600 hover:bg-purple-500" asChild><Link href="/dashboard">Go to Dashboard</Link></Button>
        </div>
      </div>
    )
  }

  // ─── Result Screen ─────────────────────────────────────────────────────────
  if (submitted && result) {
    const passed = result.score >= 70
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Score card */}
          <div className={`rounded-2xl overflow-hidden border ${passed ? "border-green-700/50" : "border-orange-700/50"}`}>
            {/* Header banner */}
            <div className={`p-8 text-center ${passed ? "bg-gradient-to-br from-green-900/60 to-emerald-900/40" : "bg-gradient-to-br from-orange-900/60 to-red-900/40"}`}>
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 ${passed ? "bg-green-800/40 border-green-600" : "bg-orange-800/40 border-orange-600"}`}>
                {passed ? <Trophy className="h-10 w-10 text-yellow-400" /> : <AlertCircle className="h-10 w-10 text-orange-400" />}
              </div>
              <h1 className="text-3xl font-black text-white">
                {result.timedOut ? "Time's Up!" : passed ? "Congratulations!" : "Test Submitted"}
              </h1>
              <p className="text-[#8b949e] mt-1 text-sm">{test?.title}</p>
            </div>

            <div className="bg-[#161b22] p-6 space-y-6">
              {/* Score */}
              <div className="text-center">
                <div className={`text-8xl font-black ${passed ? "text-green-400" : result.score >= 50 ? "text-orange-400" : "text-red-400"}`}>
                  {result.score}<span className="text-3xl">%</span>
                </div>
                <div className={`inline-flex items-center gap-2 mt-2 px-4 py-1 rounded-full text-sm font-semibold ${passed ? "bg-green-900/40 text-green-400 border border-green-700" : "bg-orange-900/40 text-orange-400 border border-orange-700"}`}>
                  {passed ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {passed ? "Passed (≥70%)" : "Below passing threshold (70%)"}
                </div>
                {/* Score bar */}
                <div className="mt-4 h-3 bg-[#21262d] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-1000 ${passed ? "bg-gradient-to-r from-green-600 to-emerald-500" : "bg-gradient-to-r from-orange-600 to-red-500"}`}
                    style={{ width: `${result.score}%` }} />
                </div>
                {/* 70% marker */}
                <div className="relative mt-1">
                  <div className="absolute left-[70%] w-px h-3 bg-white/30 -translate-x-1/2" />
                  <div className="absolute left-[70%] -translate-x-1/2 text-[9px] text-[#8b949e] mt-3">70%</div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                {[
                  { icon: <BarChart3 className="h-5 w-5 text-purple-400 mx-auto mb-1" />, v: `${result.score}%`, l: "Final Score" },
                  { icon: <CheckCircle className="h-5 w-5 text-green-400 mx-auto mb-1" />, v: `${result.breakdown?.filter(b => b.passed).length ?? "?"}/${test?.questions.length ?? "?"}`, l: "Questions Correct" },
                  { icon: <Timer className="h-5 w-5 text-blue-400 mx-auto mb-1" />, v: `${test?.durationMinutes}min`, l: "Time Limit" },
                ].map((s, i) => (
                  <div key={i} className="bg-[#21262d] border border-[#30363d] rounded-xl p-3 text-center">
                    {s.icon}<p className="text-lg font-bold text-white">{s.v}</p>
                    <p className="text-[10px] text-[#8b949e]">{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Per-question breakdown */}
              {result.breakdown && result.breakdown.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Question Breakdown
                  </h3>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {result.breakdown.map((b, i) => {
                      const q = test?.questions.find(q => q._id === b.questionId)
                      return (
                        <div key={b.questionId} className={`flex items-center gap-3 p-2.5 rounded-lg border ${b.passed ? "bg-green-900/20 border-green-800/50" : "bg-red-900/20 border-red-800/50"}`}>
                          <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${b.passed ? "bg-green-600 text-white" : "bg-red-700 text-white"}`}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{q?.questionText?.slice(0, 50) || `Question ${i + 1}`}…</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {q?.difficulty && <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                q.difficulty === "Easy" ? "bg-emerald-900/50 text-emerald-400 border-emerald-700/50" :
                                q.difficulty === "Hard" ? "bg-rose-900/50 text-rose-400 border-rose-700/50" :
                                "bg-amber-900/50 text-amber-400 border-amber-700/50"
                              }`}>{q.difficulty}</span>}
                              <span className="text-[10px] text-[#8b949e]">{b.score}/{b.maxScore} pts</span>
                              {b.totalCases != null && b.totalCases > 0 && (
                                <span className="text-[10px] text-[#8b949e]">· {b.passedCases ?? 0}/{b.totalCases} test cases</span>
                              )}
                            </div>
                          </div>
                          {b.passed ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recruiter notification */}
              <div className={`rounded-xl p-4 border ${passed ? "bg-green-900/20 border-green-800/40" : "bg-orange-900/20 border-orange-800/40"}`}>
                <p className={`text-sm font-semibold ${passed ? "text-green-400" : "text-orange-400"}`}>
                  {passed ? "🎊 Recruiter has been notified of your results!" : "📋 Your submission has been recorded."}
                </p>
                <p className={`text-xs mt-1 ${passed ? "text-green-300/70" : "text-orange-300/70"}`}>
                  {passed ? "The recruiter will review your code submission and contact you for next steps." : "Keep practicing! There may be other opportunities matching your profile."}
                </p>
              </div>

              <p className="text-center text-sm text-[#8b949e]">
                Redirecting in <span className="font-bold text-purple-400">{countdown}s</span>…
              </p>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" className="border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#484f58] bg-transparent"
                  onClick={() => router.replace("/dashboard/job-seeker/applications")}>My Applications</Button>
                <Button className="bg-purple-600 hover:bg-purple-500"
                  onClick={() => router.replace("/dashboard/job-seeker/tests")}>Go to My Tests</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!app || !test) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
        <p className="text-[#8b949e]">Test details not found.</p>
      </div>
    )
  }

  if (!ACTIVE_TEST_STATUSES.has(app.status) && !COMPLETED_STATUSES.has(app.status)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center max-w-md space-y-4">
          <AlertCircle className="h-12 w-12 text-orange-400 mx-auto" />
          <h2 className="text-white font-bold text-lg">Test Not Available</h2>
          <p className="text-[#8b949e] text-sm">This test is not currently assigned or has already been completed.</p>
          <Badge variant="secondary">{app.status}</Badge>
          {app.testScore !== undefined && <p className="text-lg font-bold text-white">Your Score: {app.testScore}%</p>}
          <Button asChild className="w-full bg-purple-600 hover:bg-purple-500"><Link href="/dashboard/job-seeker/tests">Back to My Tests</Link></Button>
        </div>
      </div>
    )
  }

  if (!securityReady) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-6 py-5 border-b border-[#30363d] bg-gradient-to-r from-purple-900/40 to-[#161b22]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Secure Test Environment</h1>
                <p className="text-xs text-[#8b949e]">{test.title}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-4 space-y-3">
              <p className="text-sm text-[#c9d1d9] font-medium flex items-center gap-2">
                <Camera className="h-4 w-4 text-purple-400" /> Camera &amp; microphone check
              </p>
              <div className="aspect-video rounded-lg overflow-hidden bg-black border border-[#30363d] flex items-center justify-center">
                {cameraReady ? (
                  <video ref={preflightVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
                ) : (
                  <div className="text-center text-[#8b949e] text-sm px-4">
                    <Camera className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Enable your webcam to continue
                  </div>
                )}
              </div>
              {preflightError && <p className="text-xs text-red-400">{preflightError}</p>}
              <Button
                type="button"
                variant="outline"
                className="w-full border-[#30363d] text-white hover:bg-[#21262d]"
                onClick={enableCamera}
              >
                {cameraReady ? "Re-check camera" : "Enable camera & microphone"}
              </Button>
            </div>

            <ul className="text-xs text-[#8b949e] space-y-2">
              {CODING_SECURITY_LAYERS.map(layer => (
                <li key={layer.id} className="flex items-start gap-2">
                  <Shield className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                  <span><strong className="text-[#c9d1d9]">{layer.label}</strong> — {layer.description}</span>
                </li>
              ))}
            </ul>

            <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-[#30363d] p-3 hover:border-purple-700/50">
              <input
                type="checkbox"
                checked={agreedProctoring}
                onChange={e => setAgreedProctoring(e.target.checked)}
                className="mt-0.5 accent-purple-600"
              />
              <span className="text-xs text-[#c9d1d9] leading-relaxed">
                I agree to AI proctoring (webcam monitoring, tab-switch detection, and activity logging) for this coding test.
              </span>
            </label>

            <Button
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold"
              disabled={!cameraReady || !agreedProctoring}
              onClick={beginTest}
            >
              <Play className="h-4 w-4 mr-2" /> Begin Test
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main Test UI ──────────────────────────────────────────────────────────
  const q = test.questions[qIdx]
  const ans = answers.find(a => a.questionId === q._id)
  const isLast = qIdx === test.questions.length - 1
  const danger = timeLeft !== null && timeLeft <= 60
  const warn = timeLeft !== null && timeLeft <= 300
  const isCoding = q.type === "code_snippet"
  const qRuns = runResults[q._id] || []

  return (
    <div className="flex flex-col bg-[#0d1117] text-white" style={{ height: "100vh", overflow: "hidden" }}>
      {session?.user?.id && test && (
        <CodingTestProctor
          testId={test._id}
          applicationId={appId}
          candidateId={session.user.id}
          candidateName={session.user.name}
          settings={testSettings}
          onTerminate={handleSecurityTerminate}
          onActivity={handleSecurityActivity}
          onTabSwitch={count => { tabSwitches.current = count }}
        />
      )}

      {/* ══ TOP HEADER ══════════════════════════════════════════════════════ */}
      <div className="h-11 shrink-0 flex items-center justify-between px-3 bg-[#161b22] border-b border-[#30363d] z-50">
        {/* Left: Test title + question pills */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-5 h-5 bg-purple-600 rounded flex items-center justify-center">
              <Code2 className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs font-semibold text-white max-w-[160px] truncate hidden sm:block">{test.title}</span>
          </div>
          <div className="w-px h-4 bg-[#30363d] hidden sm:block" />
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {test.questions.map((question, i) => {
              const a = answers.find(x => x.questionId === question._id)
              const done = Array.isArray(a?.answer)
                ? (a!.answer as string[]).length > 0
                : String(a?.answer || "").trim() !== "" && a?.answer !== (question.starterCode || STARTERS[question.language || "python"] || "")
              return (
                <button key={question._id} onClick={() => setQIdx(i)}
                  title={`Q${i + 1}: ${question.type === "code_snippet" ? "Coding" : question.type === "multiple_choice" ? "MCQ" : "Short Answer"}`}
                  className={`min-w-[26px] h-[26px] rounded text-[11px] font-bold flex items-center justify-center transition-all shrink-0 ${
                    i === qIdx ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40" :
                    done ? "bg-green-800/60 text-green-300 border border-green-700/50" :
                    "bg-[#21262d] text-[#8b949e] border border-[#30363d] hover:border-[#484f58] hover:text-white"
                  }`}>
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>

        {/* Center: Progress */}
        <div className="hidden md:flex items-center gap-2 shrink-0 mx-3">
          <span className="text-xs text-[#8b949e]">{answered}/{test.questions.length}</span>
          <div className="w-24 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
            <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${(answered / test.questions.length) * 100}%` }} />
          </div>
        </div>

        {/* Right: Timer + Submit */}
        <div className="flex items-center gap-2 shrink-0">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-sm font-bold border transition-all ${
              danger ? "bg-red-900/50 border-red-600 text-red-300 animate-pulse" :
              warn ? "bg-orange-900/50 border-orange-700 text-orange-300" :
              "bg-[#21262d] border-[#30363d] text-white"
            }`}>
              <Clock className="h-3.5 w-3.5" />
              {fmt(timeLeft)}
            </div>
          )}
          {tabSwitches.current > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-900/30 border border-orange-700/50 rounded text-[10px] text-orange-400">
              <Shield className="h-3 w-3" />{tabSwitches.current}
            </div>
          )}
          <Button onClick={() => trySubmitTest()} disabled={submitting} size="sm"
            className="h-7 bg-green-700 hover:bg-green-600 text-white text-xs px-3 gap-1.5 font-semibold">
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </div>
      </div>

      {/* Progress line */}
      <div className="h-0.5 shrink-0 bg-[#21262d]">
        <div className="h-full bg-purple-600 transition-all" style={{ width: `${((qIdx + 1) / test.questions.length) * 100}%` }} />
      </div>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isCoding ? (
          /* ── HackerRank Split Panel ── */
          <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 48px)" }}>

            {/* LEFT: Problem Description */}
            <div className="w-[38%] min-w-[280px] max-w-[520px] border-r border-[#30363d] flex flex-col overflow-hidden bg-[#0d1117]">
              {/* Problem header */}
              <div className="shrink-0 px-4 py-2.5 border-b border-[#30363d] bg-[#161b22]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-[#8b949e]">Problem {qIdx + 1}</span>
                  {q.difficulty && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${
                      q.difficulty === "Easy" ? "bg-emerald-900/50 text-emerald-400 border-emerald-700/50" :
                      q.difficulty === "Hard" ? "bg-rose-900/50 text-rose-400 border-rose-700/50" :
                      "bg-amber-900/50 text-amber-400 border-amber-700/50"
                    }`}>{q.difficulty}</span>
                  )}
                  {q.points && <span className="text-[10px] px-1.5 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-[#8b949e]">{q.points} pts</span>}
                  {q.tags?.map(t => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-[#8b949e] flex items-center gap-0.5">
                      <Tag className="h-2 w-2" />{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
                <div className="text-[#e6edf3] leading-relaxed whitespace-pre-wrap">{q.questionText}</div>

                {q.constraints && (
                  <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-400 mb-1.5 flex items-center gap-1"><Info className="h-3 w-3" />Constraints</p>
                    <pre className="text-xs text-blue-300/80 font-mono whitespace-pre-wrap leading-relaxed">{q.constraints}</pre>
                  </div>
                )}

                {q.examples && q.examples.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Examples</p>
                    {q.examples.map((ex, i) => (
                      <div key={i} className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-2">
                        <p className="text-[10px] font-bold text-[#8b949e] uppercase">Example {i + 1}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-[#8b949e] mb-1">Input</p>
                            <pre className="text-xs text-green-400 font-mono bg-[#0d1117] rounded p-2 overflow-x-auto">{ex.input}</pre>
                          </div>
                          <div>
                            <p className="text-[10px] text-[#8b949e] mb-1">Output</p>
                            <pre className="text-xs text-blue-400 font-mono bg-[#0d1117] rounded p-2 overflow-x-auto">{ex.output}</pre>
                          </div>
                        </div>
                        {ex.explanation && <p className="text-[10px] text-[#8b949e] italic">{ex.explanation}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {(q.testCases || []).filter(tc => !tc.hidden).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider">Sample Test Cases</p>
                    {(q.testCases || []).filter(tc => !tc.hidden).map((tc, i) => {
                      const r = qRuns[i]
                      return (
                        <div key={i} className={`border rounded-lg p-3 font-mono text-xs transition-colors ${
                          r ? (r.passed ? "bg-green-950/30 border-green-800/50" : "bg-red-950/30 border-red-800/50") : "bg-[#161b22] border-[#30363d]"
                        }`}>
                          <div className="grid grid-cols-2 gap-2">
                            <div><span className="text-[#8b949e] text-[10px]">Input</span><pre className="text-[#e6edf3] mt-0.5 overflow-x-auto whitespace-pre-wrap">{tc.input}</pre></div>
                            <div><span className="text-[#8b949e] text-[10px]">Expected</span><pre className="text-[#e6edf3] mt-0.5 overflow-x-auto whitespace-pre-wrap">{tc.expectedOutput}</pre></div>
                          </div>
                          {r && (
                            <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-semibold pt-2 border-t ${r.passed ? "border-green-800/30 text-green-400" : "border-red-800/30 text-red-400"}`}>
                              {r.passed ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {r.passed ? "Passed" : `Failed — Got: ${r.error || r.actualOutput || "no output"}`}
                              {r.time && <span className="text-[#8b949e] font-normal ml-auto">{r.time}s</span>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {(q.hiddenTestCaseCount ?? 0) > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Hidden Test Cases
                    </p>
                    <p className="text-[10px] text-[#8b949e]">
                      {q.hiddenTestCaseCount} hidden case(s) — inputs are not shown. Run code to validate pass/fail.
                    </p>
                    {hiddenValidation[q._id] ? (
                      <div className="flex flex-wrap gap-1.5">
                        {hiddenValidation[q._id].hiddenResults.map((passed, i) => (
                          <span key={i} className={`text-[10px] px-2 py-1 rounded border font-bold ${passed ? "bg-green-900/30 text-green-400 border-green-700/50" : "bg-red-900/30 text-red-400 border-red-700/50"}`}>
                            Hidden {i + 1}: {passed ? "Pass" : "Fail"}
                          </span>
                        ))}
                        <span className="text-[10px] text-[#8b949e] self-center">
                          {hiddenValidation[q._id].hiddenPassed}/{hiddenValidation[q._id].hiddenTotal} passed
                        </span>
                      </div>
                    ) : validatingHidden === q._id ? (
                      <p className="text-[10px] text-purple-400 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Validating hidden cases…</p>
                    ) : (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] border-[#30363d]" onClick={() => validateHiddenCases(q)}>
                        Check hidden cases
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Nav */}
              <div className="shrink-0 border-t border-[#30363d] bg-[#161b22] px-3 py-2 flex items-center justify-between">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#8b949e] hover:text-white"
                  onClick={() => setQIdx(i => Math.max(0, i - 1))} disabled={qIdx === 0}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />Prev
                </Button>
                <span className="text-xs text-[#484f58]">{qIdx + 1} / {test.questions.length}</span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#8b949e] hover:text-white"
                  onClick={() => setQIdx(i => Math.min(test.questions.length - 1, i + 1))} disabled={isLast}>
                  Next<ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>

            {/* RIGHT: Editor + Console */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Editor toolbar */}
              <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-[#30363d] gap-2">
                <Select value={ans?.language || q.language || "python"}
                  onValueChange={lang => {
                    if (window.confirm(`Switch to ${LANGS.find(l => l.value === lang)?.label}? Current code will be replaced.`)) switchLang(q._id, lang)
                  }}>
                  <SelectTrigger className="w-36 h-7 text-xs bg-[#21262d] border-[#30363d] text-white hover:border-[#484f58] focus:border-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#161b22] border-[#30363d] text-white">
                    {LANGS.map(l => <SelectItem key={l.value} value={l.value} className="text-xs text-white focus:bg-purple-900">{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1">
                  <button className="w-6 h-6 flex items-center justify-center rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
                    onClick={() => setFontSize(s => Math.max(10, s - 1))} title="Smaller font"><ZoomOut className="h-3 w-3" /></button>
                  <span className="text-[10px] text-[#484f58] w-5 text-center">{fontSize}</span>
                  <button className="w-6 h-6 flex items-center justify-center rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
                    onClick={() => setFontSize(s => Math.min(22, s + 1))} title="Larger font"><ZoomIn className="h-3 w-3" /></button>
                  <button className="w-6 h-6 flex items-center justify-center rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors ml-1"
                    onClick={() => setTheme(t => t === "vs-dark" ? "vs-light" : "vs-dark")} title="Toggle theme">
                    {theme === "vs-dark" ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                  </button>
                  <button className="w-6 h-6 flex items-center justify-center rounded text-[#8b949e] hover:text-red-400 hover:bg-[#21262d] transition-colors"
                    onClick={() => { const lang = ans?.language || q.language || "python"; if (window.confirm("Reset to starter code?")) setAnswer(q._id, q.starterCode || STARTERS[lang] || "", lang) }}
                    title="Reset code"><RotateCcw className="h-3 w-3" /></button>
                  <div className="w-px h-4 bg-[#30363d] mx-1" />
                  <Button size="sm"
                    className="h-7 text-xs bg-green-800 hover:bg-green-700 text-white px-3 gap-1.5 font-semibold border-0"
                    onClick={() => runCode(q)} disabled={running === q._id}>
                    {running === q._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    {running === q._id ? "Running…" : "Run Code"}
                  </Button>
                </div>
              </div>

              {/* Code editor */}
              <div className="flex-1 min-h-[320px] overflow-hidden">
                <MonacoCodeEditor
                  value={(ans?.answer as string) || ""}
                  onChange={v => setAnswer(q._id, v, ans?.language || q.language)}
                  language={LANGS.find(l => l.value === (ans?.language || q.language))?.monaco || "python"}
                  theme={theme}
                  fontSize={fontSize}
                  className="h-full"
                />
              </div>

              {/* Console */}
              <div className="shrink-0 border-t border-[#30363d] bg-[#0d1117]" style={{ height: "180px" }}>
                <div className="flex items-center border-b border-[#30363d] bg-[#161b22]">
                  {[
                    { k: "cases", l: `Test Cases${qRuns.length ? ` · ${qRuns.filter(r => r.passed).length}/${qRuns.length} ✓` : ""}` },
                    { k: "custom", l: "Custom Input" },
                  ].map(t => (
                    <button key={t.k} onClick={() => setConsoleTab(t.k as any)}
                      className={`flex items-center gap-1.5 px-4 py-2 text-xs border-b-2 transition-colors ${consoleTab === t.k ? "border-purple-500 text-white font-medium" : "border-transparent text-[#8b949e] hover:text-[#c9d1d9]"}`}>
                      {t.k === "cases" ? <CheckCircle className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
                      {t.l}
                    </button>
                  ))}
                  {qRuns.length > 0 && (
                    <div className="ml-auto flex gap-1 px-3">
                      {qRuns.map((r, i) => (
                        <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${r.passed ? "bg-green-900/30 text-green-400 border-green-700/50" : "bg-red-900/30 text-red-400 border-red-700/50"}`}>
                          {i + 1}{r.time ? ` ${r.time}s` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="overflow-y-auto p-3" style={{ height: "136px" }}>
                  {consoleTab === "cases" && (
                    <div className="space-y-2">
                      {qRuns.length === 0
                        ? <p className="text-xs text-[#484f58] text-center py-4">Click <span className="text-green-400 font-semibold">Run Code</span> to test against sample cases.</p>
                        : qRuns.map((r, i) => (
                          <div key={i} className={`rounded-lg p-2 text-xs font-mono border ${r.passed ? "bg-green-950/20 border-green-800/40" : "bg-red-950/20 border-red-800/40"}`}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {r.passed ? <CheckCircle className="h-3 w-3 text-green-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                              <span className={`font-semibold ${r.passed ? "text-green-400" : "text-red-400"}`}>Case {i + 1}: {r.passed ? "Accepted" : "Wrong Answer"}</span>
                              {r.time && <span className="text-[#8b949e] ml-auto font-normal text-[10px]">{r.time}s</span>}
                            </div>
                            {!r.passed && (
                              <div className="grid grid-cols-3 gap-2 text-[10px] text-[#8b949e]">
                                <span>In: <span className="text-white">{r.input?.slice(0, 20) || "-"}</span></span>
                                <span>Expected: <span className="text-blue-400">{r.expectedOutput?.slice(0, 15)}</span></span>
                                <span>Got: <span className="text-red-400">{r.error ? "Error" : r.actualOutput?.slice(0, 15) || "—"}</span></span>
                              </div>
                            )}
                          </div>
                        ))
                      }
                    </div>
                  )}
                  {consoleTab === "custom" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <textarea value={customIn} onChange={e => setCustomIn(e.target.value)}
                          placeholder="Enter custom stdin here…"
                          className="flex-1 bg-[#21262d] border border-[#30363d] text-white text-xs font-mono rounded p-2 resize-none focus:border-purple-500 outline-none"
                          rows={2} />
                        <button onClick={() => runCustom(q)} disabled={customRunning}
                          className="flex items-center gap-1 px-3 py-1 bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#484f58] rounded text-xs transition-colors self-start">
                          {customRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Run
                        </button>
                      </div>
                      {customOut && <pre className="text-xs font-mono bg-[#21262d] border border-[#30363d] rounded p-2 text-[#e6edf3] whitespace-pre-wrap max-h-16 overflow-y-auto">{customOut}</pre>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── MCQ / Short Answer ── */
          <div className="flex-1 overflow-y-auto flex items-start justify-center p-8 bg-[#0d1117]">
            <div className="w-full max-w-2xl space-y-6">
              {/* Question card */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#30363d] flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-purple-400 bg-purple-900/30 border border-purple-700/40 px-2 py-0.5 rounded">Q{qIdx + 1}</span>
                      <span className="text-xs text-[#8b949e] capitalize">{q.type.replace("_", " ")}</span>
                      {q.points && <span className="text-xs text-yellow-400">{q.points} pts</span>}
                    </div>
                    <p className="text-base text-white leading-relaxed font-medium">{q.questionText}</p>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  {q.type === "multiple_choice" && q.options && (
                    <div className="space-y-2">
                      {q.options.map((opt, i) => (
                        <label key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                          ans?.answer === opt
                            ? "border-purple-500 bg-purple-900/30"
                            : "border-[#30363d] hover:border-[#484f58] hover:bg-[#21262d]"
                        }`} onClick={() => setAnswer(q._id, opt)}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${ans?.answer === opt ? "border-purple-500 bg-purple-600" : "border-[#484f58]"}`}>
                            {ans?.answer === opt && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <span className="text-sm text-[#e6edf3] flex-1">{opt}</span>
                          {ans?.answer === opt && <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type === "short_answer" && (
                    <Textarea placeholder="Type your answer here…"
                      value={(ans?.answer as string) || ""}
                      onChange={e => setAnswer(q._id, e.target.value)}
                      rows={6}
                      className="bg-[#21262d] border-[#30363d] text-white placeholder-[#484f58] focus:border-purple-500 resize-none text-sm" />
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="outline" className="border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#484f58] bg-transparent"
                  onClick={() => setQIdx(i => Math.max(0, i - 1))} disabled={qIdx === 0}>
                  <ChevronLeft className="mr-2 h-4 w-4" />Previous
                </Button>
                <div className="flex gap-3">
                  {!isLast && (
                    <Button variant="outline" className="border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#484f58] bg-transparent"
                      onClick={() => setQIdx(i => Math.min(test.questions.length - 1, i + 1))}>
                      Next<ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  <Button onClick={() => trySubmitTest()} disabled={submitting} className="bg-green-700 hover:bg-green-600 text-white font-semibold">
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {submitting ? "Submitting…" : "Submit Test"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
