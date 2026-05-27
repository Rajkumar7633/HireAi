"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  ArrowLeft,
  Users,
  TrendingUp,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  BarChart3,
  Flag,
} from "lucide-react"

interface Submission {
  _id: string
  candidateId: { _id: string; name: string; email: string } | null
  applicationId: { _id: string; status: string; testScore?: number } | null
  percentage: number
  totalScore: number
  plagiarismScore: number
  plagiarismFlags: string[]
  roundStage?: string
  attemptNumber: number
  submittedAt: string
  status: string
}

interface Analytics {
  testId: string
  title: string
  totalAttempts: number
  averageScore: number
  passRate: number
  avgPlagiarismScore: number
}

export default function TestResultsPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params.id as string
  const { toast } = useToast()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoSelecting, setAutoSelecting] = useState(false)
  const [sortBy, setSortBy] = useState<"score" | "date" | "plagiarism">("score")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [autoSelectOpen, setAutoSelectOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [subRes, analyticsRes] = await Promise.allSettled([
        fetch(`/api/tests/${testId}/submissions`, { cache: "no-store" }),
        fetch(`/api/tests/${testId}/analytics`, { cache: "no-store" }),
      ])

      if (subRes.status === "fulfilled" && subRes.value.ok) {
        const data: Submission[] = await subRes.value.json()
        setSubmissions(data)
      } else {
        const err = subRes.status === "fulfilled"
          ? await subRes.value.json().catch(() => ({}))
          : {}
        toast({
          title: "Error loading submissions",
          description: (err as any).message || "Could not fetch submissions.",
          variant: "destructive",
        })
      }

      if (analyticsRes.status === "fulfilled" && analyticsRes.value.ok) {
        const data: Analytics = await analyticsRes.value.json()
        setAnalytics(data)
      }
    } catch (err) {
      console.error("Error fetching test results:", err)
      toast({ title: "Network Error", description: "Could not load results.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [testId, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAutoSelect = async (minScore: number, topN: number) => {
    setAutoSelecting(true)
    try {
      const res = await fetch(`/api/tests/${testId}/auto-select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minScore, maxPlagiarism: 40, topN }),
      })
      if (res.ok) {
        const data = await res.json()
        toast({
          title: "Auto-select Complete",
          description: `${data.selectedCount} candidate(s) shortlisted and notified via email.`,
        })
        fetchData()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: "Auto-select Failed", description: (err as any).msg || "Unknown error.", variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Network Error", description: "Could not run auto-select.", variant: "destructive" })
    } finally {
      setAutoSelecting(false)
    }
  }

  const scoreBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-100 text-green-800 border-green-200">{score}% 🏆</Badge>
    if (score >= 70) return <Badge className="bg-blue-100 text-blue-800 border-blue-200">{score}% ✅</Badge>
    if (score >= 50) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{score}% ⚠️</Badge>
    return <Badge className="bg-red-100 text-red-800 border-red-200">{score}% ❌</Badge>
  }

  const plagiarismBadge = (score: number, flags: string[]) => {
    const highFlag = flags.includes("high_similarity_to_other_candidate")
    if (highFlag || score >= 80) return <Badge variant="destructive" className="flex items-center gap-1"><Flag className="h-3 w-3" />{score}%</Badge>
    if (score >= 40) return <Badge className="bg-orange-100 text-orange-800">{score}%</Badge>
    return <Badge variant="outline" className="text-green-700">{score}%</Badge>
  }

  const sortedSubmissions = [...submissions].sort((a, b) => {
    let valA: number, valB: number
    if (sortBy === "score") { valA = a.percentage; valB = b.percentage }
    else if (sortBy === "plagiarism") { valA = a.plagiarismScore; valB = b.plagiarismScore }
    else { valA = new Date(a.submittedAt).getTime(); valB = new Date(b.submittedAt).getTime() }
    return sortDir === "desc" ? valB - valA : valA - valB
  })

  const toggleSort = (col: "score" | "date" | "plagiarism") => {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    else { setSortBy(col); setSortDir("desc") }
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Loading test results...</p>
      </div>
    )
  }

  // ─── Main UI ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/recruiter/tests">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tests
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{analytics?.title || "Test Results"}</h1>
            <p className="text-sm text-muted-foreground">Submission analytics and candidate rankings</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          {/* Auto-select dialog */}
          <Dialog open={autoSelectOpen} onOpenChange={setAutoSelectOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
                disabled={autoSelecting || submissions.length === 0}
              >
                {autoSelecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="mr-2 h-4 w-4" />
                )}
                Auto-Select Top Candidates
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Auto-Select Top Candidates</DialogTitle>
                <DialogDescription>
                  This will shortlist the top 3 candidates with score ≥ 70% and plagiarism ≤ 40%, 
                  update their application status to <strong>Shortlisted</strong>, and 
                  send them a congratulations email automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setAutoSelectOpen(false)}>Cancel</Button>
                <Button
                  onClick={() => {
                    handleAutoSelect(70, 3);
                    setAutoSelectOpen(false);
                  }}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Confirm & Shortlist
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics cards */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
                <p className="text-3xl font-bold text-blue-700">{analytics.totalAttempts}</p>
              </div>
              <Users className="h-10 w-10 text-blue-400" />
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-3xl font-bold text-green-700">{analytics.averageScore}%</p>
              </div>
              <BarChart3 className="h-10 w-10 text-green-400" />
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate (≥70%)</p>
                <p className="text-3xl font-bold text-yellow-700">{analytics.passRate}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-yellow-400" />
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Plagiarism</p>
                <p className="text-3xl font-bold text-purple-700">{analytics.avgPlagiarismScore}%</p>
              </div>
              <Trophy className="h-10 w-10 text-purple-400" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submissions table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Candidate Submissions
            <Badge variant="secondary" className="ml-2">{submissions.length}</Badge>
          </CardTitle>
          <CardDescription>
            Click column headers to sort. Plagiarism ≥ 80% is flagged 🚩.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-3">
              <Users className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-lg font-medium">No submissions yet</p>
              <p className="text-sm">Candidates haven't completed this test yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-700 select-none"
                      onClick={() => toggleSort("score")}
                    >
                      Score {sortBy === "score" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-700 select-none"
                      onClick={() => toggleSort("plagiarism")}
                    >
                      Plagiarism {sortBy === "plagiarism" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flags</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-700 select-none"
                      onClick={() => toggleSort("date")}
                    >
                      Submitted {sortBy === "date" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempt</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedSubmissions.map((sub, idx) => (
                    <tr
                      key={sub._id}
                      className={sub.plagiarismScore >= 80 ? "bg-red-50" : sub.percentage >= 70 ? "bg-green-50/30" : ""}
                    >
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{idx + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="font-semibold text-gray-900">{sub.candidateId?.name || "Unknown"}</p>
                          <p className="text-xs text-gray-500">{sub.candidateId?.email || "—"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{scoreBadge(sub.percentage)}</td>
                      <td className="px-4 py-3 whitespace-nowrap w-32">
                        <Progress
                          value={sub.percentage}
                          className="h-2"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {plagiarismBadge(sub.plagiarismScore, sub.plagiarismFlags)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {sub.plagiarismFlags && sub.plagiarismFlags.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {sub.plagiarismFlags.map((flag, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] text-orange-700 border-orange-200 bg-orange-50 w-fit">
                                {flag.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {sub.percentage >= 70 ? (
                          <Badge className="bg-green-100 text-green-800 flex w-fit items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Passed
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50 flex w-fit items-center gap-1">
                            <XCircle className="h-3 w-3" /> Failed
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {format(new Date(sub.submittedAt), "MMM dd, yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <Badge variant="secondary">#{sub.attemptNumber}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plagiarism warning */}
      {submissions.some((s) => s.plagiarismScore >= 80) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Plagiarism Detected</p>
              <p className="text-sm text-red-700">
                One or more submissions have high similarity scores (≥80%). Please review these carefully before shortlisting.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
