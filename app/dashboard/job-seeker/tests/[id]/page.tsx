"use client"

import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useRef, useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Trophy,
} from "lucide-react"
import { useSession } from "@/hooks/use-session"
import dynamic from "next/dynamic"

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="h-64 bg-muted/30 rounded-md animate-pulse" /> }
)

interface Question {
  _id: string
  questionText: string
  type: "multiple_choice" | "short_answer" | "code_snippet"
  options?: string[]
  points?: number
  language?: string
  starterCode?: string
  testCases?: { input: string; expectedOutput: string }[]
}

interface TestDetails {
  _id: string
  title: string
  description?: string
  questions: Question[]
  durationMinutes: number
}

interface ApplicationDetails {
  _id: string
  jobDescriptionId: { _id: string; title: string }
  testId: string | { _id: string }
  testScore?: number
  status: string
}

interface SubmissionResult {
  score: number
  submissionId: string
  timedOut?: boolean
}

export default function TakeTestPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params.id as string
  const { toast } = useToast()
  const { session, isLoading: sessionLoading } = useSession()

  const [application, setApplication] = useState<ApplicationDetails | null>(null)
  const [test, setTest] = useState<TestDetails | null>(null)
  const [answers, setAnswers] = useState<{ questionId: string; answer: string | string[]; language?: string }[]>([])
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // Stable ref to avoid stale closure in timer
  const submittingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hasAutoSubmitted = useRef(false)

  // ✅ STABLE submit function using useCallback to avoid stale closures
  const handleSubmitTest = useCallback(
    async (timedOut = false, currentAnswers?: typeof answers) => {
      if (submittingRef.current || hasAutoSubmitted.current) return
      submittingRef.current = true
      hasAutoSubmitted.current = true

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      setSubmitting(true)

      try {
        const finalAnswers = currentAnswers ?? answers
        const response = await fetch(`/api/applications/${applicationId}/submit-test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: finalAnswers }),
        })

        if (response.ok) {
          const data = await response.json()
          setResult({ score: data.score, submissionId: data.submissionId, timedOut })
          setSubmitted(true)
          toast({
            title: timedOut ? "⏰ Time's Up! Auto-submitted." : "✅ Test Submitted!",
            description: `Your score: ${data.score}%`,
          })
        } else {
          const errorData = await response.json().catch(() => ({}))
          toast({
            title: "Submission Failed",
            description: (errorData as any).message || "An error occurred. Please try again.",
            variant: "destructive",
          })
          submittingRef.current = false
          hasAutoSubmitted.current = false
        }
      } catch (error) {
        console.error("Test submission error:", error)
        toast({
          title: "Network Error",
          description: "Could not submit test. Please check your connection.",
          variant: "destructive",
        })
        submittingRef.current = false
        hasAutoSubmitted.current = false
      } finally {
        setSubmitting(false)
      }
    },
    [applicationId, answers, toast]
  )

  // ✅ Timer — cleaned up properly, no stale closure
  useEffect(() => {
    if (timeLeft === null || submitted) return

    if (timeLeft <= 0) {
      if (!hasAutoSubmitted.current) {
        handleSubmitTest(true, answers)
      }
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [timeLeft, submitted, handleSubmitTest, answers])

  useEffect(() => {
    if (applicationId && session) {
      fetchApplicationDetails()
    }
    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, session])

  const fetchApplicationDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/applications/${applicationId}`, { cache: "no-store" })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Error",
          description: (errorData as any).message || "Failed to fetch application details.",
          variant: "destructive",
        })
        router.push("/dashboard/job-seeker/applications")
        return
      }

      const data = await response.json()
      const app: ApplicationDetails = data.application
      setApplication(app)

      const rawTestId = app.testId as any
      const testIdStr =
        typeof rawTestId === "string"
          ? rawTestId
          : rawTestId && typeof rawTestId === "object"
          ? rawTestId._id
          : null

      if (testIdStr) {
        await fetchTestDetails(testIdStr)
      } else {
        toast({
          title: "No Test Assigned",
          description: "No test has been assigned to this application yet.",
          variant: "destructive",
        })
        router.push("/dashboard/job-seeker/applications")
      }
    } catch (error) {
      console.error("Error fetching application details:", error)
      toast({ title: "Network Error", description: "Failed to load test.", variant: "destructive" })
      router.push("/dashboard/job-seeker/applications")
    } finally {
      setLoading(false)
    }
  }

  const fetchTestDetails = async (testId: string) => {
    try {
      const response = await fetch(`/api/tests/${testId}`, { cache: "no-store" })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast({
          title: "Error",
          description: (errorData as any).message || "Failed to load test.",
          variant: "destructive",
        })
        return
      }

      const data: TestDetails = await response.json()
      setTest(data)
      // Initialise answers array
      setAnswers(
        data.questions.map((q) => ({
          questionId: q._id,
          answer: q.type === "multiple_choice" ? [] : q.starterCode || "",
          language: q.language,
        }))
      )
      // Start the timer
      setTimeLeft(data.durationMinutes * 60)
    } catch (error) {
      console.error("Error fetching test details:", error)
      toast({ title: "Network Error", description: "Failed to load questions.", variant: "destructive" })
    }
  }

  const handleAnswerChange = (questionId: string, value: string | string[], lang?: string) => {
    setAnswers((prev) =>
      prev.map((ans) =>
        ans.questionId === questionId
          ? { ...ans, answer: value, ...(lang ? { language: lang } : {}) }
          : ans
      )
    )
  }

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const answeredCount = answers.filter((a) => {
    if (Array.isArray(a.answer)) return a.answer.length > 0
    return String(a.answer).trim() !== "" && a.answer !== (test?.questions.find(q => q._id === a.questionId)?.starterCode || "")
  }).length

  // ─── Loading / Auth states ─────────────────────────────────────────────────

  if (sessionLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Loading your test...</p>
      </div>
    )
  }

  if (!session || session.role !== "job_seeker") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle>Access Denied</CardTitle>
          <CardDescription className="mt-2">Only job seekers can take tests.</CardDescription>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // ─── Result Screen ─────────────────────────────────────────────────────────

  if (submitted && result) {
    const passed = result.score >= 70
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-2">
            {passed ? (
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-2" />
            ) : (
              <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-2" />
            )}
            <CardTitle className="text-2xl">
              {result.timedOut ? "Time's Up — Auto Submitted!" : "Test Submitted!"}
            </CardTitle>
            <CardDescription>
              {application?.jobDescriptionId?.title && (
                <span>Application for <strong>{application.jobDescriptionId.title}</strong></span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            {/* Score ring */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={`text-6xl font-bold ${
                  passed ? "text-green-600" : result.score >= 50 ? "text-orange-500" : "text-red-500"
                }`}
              >
                {result.score}%
              </div>
              <Badge
                className={passed ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
                variant="outline"
              >
                {passed ? "✅ Passed (≥70%)" : "❌ Below passing threshold (70%)"}
              </Badge>
              <Progress value={result.score} className="w-full h-3 mt-2" />
            </div>

            <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground">
              {passed
                ? "Great work! The recruiter has been notified and will review your results shortly."
                : "Your submission has been recorded. Keep practising and check other opportunities."}
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" asChild>
                <Link href="/dashboard/job-seeker/applications">My Applications</Link>
              </Button>
              <Button asChild className="bg-purple-600 hover:bg-purple-700">
                <Link href="/dashboard/job-seeker/status-portal">Track Status</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Pre-flight checks ─────────────────────────────────────────────────────

  if (!application || !test) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Test or application details not found.</p>
      </div>
    )
  }

  if (application.status !== "Test Assigned") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6 space-y-4">
          <CardTitle>Test Status</CardTitle>
          <CardDescription>
            This test is not currently assigned or has already been completed.
          </CardDescription>
          <Badge variant="secondary">{application.status}</Badge>
          {application.testScore !== undefined && (
            <p className="text-lg font-semibold">Your Score: {application.testScore}%</p>
          )}
          <Button asChild className="w-full">
            <Link href="/dashboard/job-seeker/applications">Back to Applications</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // ─── Main Test UI ──────────────────────────────────────────────────────────

  const currentQuestion = test.questions[currentQuestionIdx]
  const currentAnswer = answers.find((a) => a.questionId === currentQuestion._id)
  const isLast = currentQuestionIdx === test.questions.length - 1
  const isFirst = currentQuestionIdx === 0
  const timerDanger = timeLeft !== null && timeLeft <= 60
  const timerWarning = timeLeft !== null && timeLeft <= 300

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* ─── Header Bar ─── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{test.title}</h1>
          {test.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{test.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">
            {answeredCount}/{test.questions.length} answered
          </Badge>
          {timeLeft !== null && (
            <Badge
              variant={timerDanger ? "destructive" : timerWarning ? "secondary" : "outline"}
              className={`flex items-center gap-1 text-base px-3 py-1 font-mono ${
                timerDanger ? "animate-pulse" : ""
              }`}
            >
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </Badge>
          )}
        </div>
      </div>

      {/* ─── Progress bar ─── */}
      <Progress
        value={((currentQuestionIdx + 1) / test.questions.length) * 100}
        className="h-2"
      />

      {/* ─── Question Navigation pills ─── */}
      <div className="flex flex-wrap gap-2">
        {test.questions.map((q, idx) => {
          const ans = answers.find((a) => a.questionId === q._id)
          const hasAnswer = Array.isArray(ans?.answer)
            ? (ans!.answer as string[]).length > 0
            : String(ans?.answer || "").trim() !== "" && ans?.answer !== (q.starterCode || "")
          return (
            <button
              key={q._id}
              onClick={() => setCurrentQuestionIdx(idx)}
              className={`w-8 h-8 rounded-full text-sm font-semibold border transition-colors ${
                idx === currentQuestionIdx
                  ? "bg-purple-600 text-white border-purple-600"
                  : hasAnswer
                  ? "bg-green-100 text-green-800 border-green-300"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>

      {/* ─── Question Card ─── */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">
              Q{currentQuestionIdx + 1}. {currentQuestion.questionText}
            </CardTitle>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge variant="outline" className="text-xs capitalize">
                {currentQuestion.type.replace("_", " ")}
              </Badge>
              {currentQuestion.points && (
                <Badge variant="secondary" className="text-xs">
                  {currentQuestion.points} pts
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Multiple Choice */}
          {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
            <RadioGroup
              onValueChange={(value) => handleAnswerChange(currentQuestion._id, value)}
              value={(currentAnswer?.answer as string) || ""}
              className="space-y-2"
            >
              {currentQuestion.options.map((option, optIdx) => (
                <div
                  key={optIdx}
                  className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    currentAnswer?.answer === option
                      ? "border-purple-500 bg-purple-50"
                      : "border-border hover:border-purple-300 hover:bg-muted/30"
                  }`}
                  onClick={() => handleAnswerChange(currentQuestion._id, option)}
                >
                  <RadioGroupItem value={option} id={`q${currentQuestion._id}-opt${optIdx}`} />
                  <Label
                    htmlFor={`q${currentQuestion._id}-opt${optIdx}`}
                    className="cursor-pointer flex-1"
                  >
                    {option}
                  </Label>
                  {currentAnswer?.answer === option && (
                    <CheckCircle2 className="h-4 w-4 text-purple-600" />
                  )}
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Short Answer */}
          {currentQuestion.type === "short_answer" && (
            <Textarea
              placeholder="Type your answer here..."
              value={(currentAnswer?.answer as string) || ""}
              onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)}
              rows={5}
              className="resize-none"
            />
          )}

          {/* Code Snippet — Monaco editor */}
          {currentQuestion.type === "code_snippet" && (
            <div className="space-y-3">
              {/* Visible test cases */}
              {currentQuestion.testCases && currentQuestion.testCases.length > 0 && (
                <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                  <p className="font-semibold text-muted-foreground mb-2">Example test cases:</p>
                  {currentQuestion.testCases.map((tc, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 font-mono">
                      <div className="bg-background rounded p-2 border">
                        <span className="text-muted-foreground">Input:</span> {tc.input}
                      </div>
                      <div className="bg-background rounded p-2 border">
                        <span className="text-muted-foreground">Expected:</span> {tc.expectedOutput}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-md overflow-hidden border">
                <MonacoEditor
                  height="300px"
                  language={currentAnswer?.language || currentQuestion.language || "javascript"}
                  value={(currentAnswer?.answer as string) || ""}
                  onChange={(value) =>
                    handleAnswerChange(currentQuestion._id, value || "", currentAnswer?.language || currentQuestion.language)
                  }
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    tabSize: 2,
                  }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Navigation ─── */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIdx((i) => Math.max(0, i - 1))}
          disabled={isFirst}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Previous
        </Button>

        <div className="flex gap-3">
          {!isLast && (
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIdx((i) => Math.min(test.questions.length - 1, i + 1))}
            >
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          <Button
            onClick={() => {
              const unanswered = test.questions.length - answeredCount
              if (
                unanswered > 0 &&
                !window.confirm(
                  `You have ${unanswered} unanswered question(s). Submit anyway?`
                )
              ) {
                return
              }
              handleSubmitTest(false, answers)
            }}
            disabled={submitting}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {submitting ? "Submitting..." : "Submit Test"}
          </Button>
        </div>
      </div>
    </div>
  )
}
