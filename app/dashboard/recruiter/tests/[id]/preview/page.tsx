"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  ArrowLeft,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Code2,
  Eye,
  EyeOff,
  Tag,
  Info,
  Edit,
  Users,
  ListOrdered,
} from "lucide-react"
import { format } from "date-fns"


interface TestCase {
  input: string
  expectedOutput: string
  hidden?: boolean
  weight?: number
}

interface Example {
  input: string
  output: string
  explanation?: string
}

interface Question {
  _id?: string
  questionId?: string
  questionText: string
  type: "multiple_choice" | "short_answer" | "code_snippet" | "multiple-choice" | "true-false" | "short-answer"
  options?: string[]
  correctAnswer?: string
  points: number
  language?: string
  starterCode?: string
  difficulty?: "Easy" | "Medium" | "Hard"
  tags?: string[]
  constraints?: string
  examples?: Example[]
  testCases?: TestCase[]
  timeLimitMs?: number
  memoryLimitMb?: number
}

interface Test {
  _id: string
  title: string
  description?: string
  questions: Question[]
  durationMinutes: number
  createdAt: string
  recruiterId?: string
}

const DIFFICULTY_BADGE: Record<string, string> = {
  Easy: "bg-green-100 text-green-800 border-green-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Hard: "bg-red-100 text-red-800 border-red-200",
}

const LANG_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  cpp: "C++",
  c: "C",
  go: "Go",
  rust: "Rust",
  kotlin: "Kotlin",
  swift: "Swift",
}

export default function TestPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [test, setTest] = useState<Test | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeQ, setActiveQ] = useState(0)
  const [showHidden, setShowHidden] = useState(false)

  useEffect(() => {
    if (params.id) fetchTest()
  }, [params.id])

  const fetchTest = async () => {
    try {
      const res = await fetch(`/api/tests/${params.id}`)
      if (!res.ok) throw new Error("Failed to load test")
      setTest(await res.json())
    } catch {
      toast({ title: "Error", description: "Failed to fetch test.", variant: "destructive" })
      router.push("/dashboard/recruiter/tests")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Loading preview…</p>
      </div>
    )
  }

  if (!test) return null

  const totalPoints = test.questions.reduce((s, q) => s + (q.points || 0), 0)
  const codingCount = test.questions.filter(q => q.type === "code_snippet").length
  const mcqCount = test.questions.filter(q => q.type === "multiple_choice" || q.type === "multiple-choice" || q.type === "true-false").length
  const isCodingTest = codingCount > 0 && codingCount === test.questions.length
  const currentQ = test.questions[activeQ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="dashboard-subheader px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold leading-tight">{test.title}</h1>
              {isCodingTest && (
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                  <Code2 className="h-3 w-3 mr-1" /> Coding Challenge
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Recruiter preview — candidates see this exactly
              {test.createdAt && ` · Created ${format(new Date(test.createdAt), "MMM d, yyyy")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{test.questions.length} questions</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{test.durationMinutes} min</span>
            <span className="flex items-center gap-1 text-purple-600 font-medium">{totalPoints} pts</span>
          </div>
          <Button size="sm" asChild>
            <Link href={`/dashboard/recruiter/tests/${test._id}/edit`}>
              <Edit className="h-4 w-4 mr-1" /> Edit Test
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/recruiter/tests/${test._id}/results`}>
              <Users className="h-4 w-4 mr-1" /> View Results
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* ── Left: Question navigator ────────────────────────────── */}
        <div className="w-56 shrink-0 bg-white border-r flex flex-col">
          <div className="p-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Questions ({test.questions.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
            {test.questions.map((q, idx) => {
              const isCoding = q.type === "code_snippet"
              return (
                <button
                  key={idx}
                  onClick={() => setActiveQ(idx)}
                  className={`w-full text-left rounded-lg px-3 py-2 transition-all text-sm border ${
                    idx === activeQ
                      ? "bg-purple-50 border-purple-200 text-purple-900"
                      : "border-transparent hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      idx === activeQ ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-600"
                    }`}>{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs leading-tight">{q.questionText || `Problem ${idx + 1}`}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isCoding && <Code2 className="h-2.5 w-2.5 text-purple-500" />}
                        <span className="text-[10px] text-muted-foreground">{q.points} pts</span>
                        {q.difficulty && (
                          <span className={`text-[9px] px-1 rounded border font-medium ${DIFFICULTY_BADGE[q.difficulty] || ""}`}>
                            {q.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Stats panel */}
          <div className="p-3 border-t bg-gray-50 space-y-1 text-xs text-muted-foreground">
            {codingCount > 0 && <p><Code2 className="h-3 w-3 inline mr-1 text-purple-500" />{codingCount} coding problem{codingCount !== 1 ? "s" : ""}</p>}
            {mcqCount > 0 && <p><ListOrdered className="h-3 w-3 inline mr-1" />{mcqCount} MCQ</p>}
            <p className="font-medium text-gray-700">{totalPoints} pts total</p>
          </div>
        </div>

        {/* ── Right: Question preview ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {currentQ.type === "code_snippet" ? (
            <CodingQuestionPreview
              question={currentQ}
              index={activeQ}
              total={test.questions.length}
              showHidden={showHidden}
              onToggleHidden={() => setShowHidden(p => !p)}
            />
          ) : (
            <McqQuestionPreview
              question={currentQ}
              index={activeQ}
              total={test.questions.length}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Coding question preview ────────────────────────────────────────────────────

function CodingQuestionPreview({
  question, index, total, showHidden, onToggleHidden,
}: {
  question: Question
  index: number
  total: number
  showHidden: boolean
  onToggleHidden: () => void
}) {
  const visibleCases = (question.testCases || []).filter(tc => !tc.hidden)
  const hiddenCases = (question.testCases || []).filter(tc => tc.hidden)

  return (
    <div className="flex h-full">
      {/* Problem description */}
      <div className="w-[45%] shrink-0 border-r overflow-y-auto p-6 space-y-5 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">Q{index + 1}/{total}</Badge>
            {question.difficulty && (
              <Badge className={`text-xs ${DIFFICULTY_BADGE[question.difficulty]}`}>{question.difficulty}</Badge>
            )}
            <Badge variant="outline" className="text-xs text-purple-700 border-purple-200 bg-purple-50">
              <Code2 className="h-2.5 w-2.5 mr-1" />
              {LANG_LABEL[question.language || "python"] || question.language || "Any language"}
            </Badge>
            <Badge variant="secondary" className="text-xs">{question.points} pts</Badge>
          </div>
        </div>

        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {question.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs gap-1 font-normal">
                <Tag className="h-2.5 w-2.5" />{tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="prose prose-sm max-w-none">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800">{question.questionText}</p>
        </div>

        {question.constraints && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
              <Info className="h-3 w-3" /> Constraints
            </p>
            <pre className="text-xs text-blue-800 font-mono whitespace-pre-wrap">{question.constraints}</pre>
          </div>
        )}

        {question.examples && question.examples.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Examples</p>
            {question.examples.map((ex, i) => (
              <div key={i} className="bg-gray-50 border rounded-lg p-3 text-xs space-y-1.5">
                <p className="font-semibold text-gray-500">Example {i + 1}</p>
                <div className="font-mono space-y-0.5">
                  <p><span className="text-gray-500">Input:  </span><span className="text-gray-800">{ex.input}</span></p>
                  <p><span className="text-gray-500">Output: </span><span className="text-gray-800">{ex.output}</span></p>
                </div>
                {ex.explanation && <p className="text-gray-500 italic text-xs">{ex.explanation}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Test cases section (recruiter sees all) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Test Cases
            </p>
            {hiddenCases.length > 0 && (
              <button
                onClick={onToggleHidden}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showHidden ? "Hide hidden" : `Show ${hiddenCases.length} hidden`}
              </button>
            )}
          </div>

          {visibleCases.length === 0 && hiddenCases.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No test cases defined — scoring will use default 50%.</p>
          )}

          {visibleCases.map((tc, i) => (
            <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye className="h-3 w-3 text-blue-500" />
                <span className="font-semibold text-blue-700 non-font-mono font-sans text-[10px] uppercase">Sample Case {i + 1}</span>
                {tc.weight && tc.weight !== 1 && <span className="text-[10px] text-muted-foreground">×{tc.weight}</span>}
              </div>
              <p><span className="text-gray-500">In:  </span>{tc.input || <span className="italic text-gray-400">empty</span>}</p>
              <p><span className="text-gray-500">Out: </span>{tc.expectedOutput}</p>
            </div>
          ))}

          {showHidden && hiddenCases.map((tc, i) => (
            <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-2.5 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <EyeOff className="h-3 w-3 text-orange-500" />
                <span className="font-semibold text-orange-700 non-font-mono font-sans text-[10px] uppercase">Hidden Case {i + 1}</span>
                {tc.weight && tc.weight !== 1 && <span className="text-[10px] text-muted-foreground">×{tc.weight}</span>}
              </div>
              <p><span className="text-gray-500">In:  </span>{tc.input || <span className="italic text-gray-400">empty</span>}</p>
              <p><span className="text-gray-500">Out: </span>{tc.expectedOutput}</p>
            </div>
          ))}
        </div>

        {(question.timeLimitMs || question.memoryLimitMb) && (
          <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t">
            {question.timeLimitMs && <span>⏱ {question.timeLimitMs}ms time limit</span>}
            {question.memoryLimitMb && <span>💾 {question.memoryLimitMb}MB memory</span>}
          </div>
        )}
      </div>

      {/* Editor panel (read-only starter code) */}
      <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {LANG_LABEL[question.language || "python"] || "Python"} — starter code
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] border-gray-600 text-gray-400">
            Read-only preview
          </Badge>
        </div>

        {/* Code display — instant, no loading */}
        <div className="flex-1 overflow-auto">
          {question.starterCode ? (
            <pre className="h-full p-5 font-mono text-sm text-green-300 bg-gray-950 leading-relaxed whitespace-pre overflow-auto m-0">
              <code>{question.starterCode}</code>
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 space-y-3">
              <Code2 className="h-12 w-12 text-gray-700" />
              <p className="text-sm text-gray-500 font-medium">No starter code set</p>
              <p className="text-xs text-gray-600">
                Go to <span className="text-purple-400 font-mono">Edit Test → Starter Code</span> to add default code for candidates.
              </p>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="px-4 py-2.5 bg-gray-900 border-t border-gray-700 shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-500">Candidates can change language and edit freely during the test</p>
          <div className="flex gap-2">
            <span className="text-[10px] px-2 py-1 rounded border border-green-700 bg-green-900/40 text-green-400 font-medium">▶ Run Code</span>
            <span className="text-[10px] px-2 py-1 rounded border border-purple-700 bg-purple-900/40 text-purple-400 font-medium">↑ Submit</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MCQ / short-answer question preview ───────────────────────────────────────

function McqQuestionPreview({
  question, index, total,
}: {
  question: Question
  index: number
  total: number
}) {
  const isMcq = question.type === "multiple_choice" || question.type === "multiple-choice" || question.type === "true-false"
  const isShort = question.type === "short_answer" || question.type === "short-answer"
  const options = question.type === "true-false" ? ["True", "False"] : (question.options || [])

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b bg-gray-50/50 rounded-t-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">Q{index + 1} / {total}</Badge>
              <Badge variant="secondary" className="text-xs capitalize">
                {question.type.replace(/_|-/g, " ")}
              </Badge>
              <Badge variant="outline" className="text-xs">{question.points} pts</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <p className="text-base font-medium leading-relaxed text-gray-800">{question.questionText}</p>

          {isMcq && options.length > 0 && (
            <div className="space-y-2">
              {options.map((opt, i) => {
                const isCorrect = opt === question.correctAnswer
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isCorrect
                        ? "bg-green-50 border-green-300"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      isCorrect ? "bg-green-500" : "bg-gray-200"
                    }`}>
                      {isCorrect
                        ? <CheckCircle className="h-3.5 w-3.5 text-white" />
                        : <XCircle className="h-3.5 w-3.5 text-gray-400" />
                      }
                    </div>
                    <span className={`text-sm ${isCorrect ? "text-green-800 font-medium" : "text-gray-700"}`}>
                      {opt}
                    </span>
                    {isCorrect && (
                      <Badge className="ml-auto text-xs bg-green-100 text-green-700 border-green-200">
                        Correct Answer
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {isShort && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Expected Answer</p>
              <p className="text-sm text-blue-800">{question.correctAnswer || "Open-ended — manually graded"}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
