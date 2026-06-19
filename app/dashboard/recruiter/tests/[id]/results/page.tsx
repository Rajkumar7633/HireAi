"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
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
import { SkillBar } from "@/components/ui/charts"
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
  BarChart3,
  Flag,
  ShieldCheck,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Code2,
} from "lucide-react"
import { extractCodeAnswers, extractSubmissionLanguage } from "@/lib/submission-utils"
import { TestLiveMonitor } from "@/components/recruiter/test-live-monitor"

interface SubmissionAnswer {
  questionId: string
  questionType?: string
  answer: string
  language?: string
  passedTestCases?: number
  totalTestCases?: number
  score?: number
}

interface Submission {
  _id: string
  candidateId: { _id: string; name: string; email: string } | null
  applicationId: { _id: string; status: string; testScore?: number } | null
  percentage: number
  totalScore: number
  language?: string
  answers?: SubmissionAnswer[]
  plagiarismScore: number
  plagiarismFlags: string[]
  integrityAudit?: {
    score?: number
    summary?: string
    flags?: string[]
    logs?: Array<{ type: string; message: string; at?: string }>
    tabSwitches?: number
  }
  tabSwitches?: number
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

function integrityScore(plagiarism: number, flags: string[]): number {
  const flagPenalty = Math.min(flags.length * 5, 30)
  return Math.max(0, 100 - plagiarism - flagPenalty)
}

function getSubmissionIntegrity(sub: Submission): number {
  if (sub.integrityAudit?.score != null) return sub.integrityAudit.score
  return integrityScore(sub.plagiarismScore, sub.plagiarismFlags)
}

function getSubmissionFlags(sub: Submission): string[] {
  if (sub.integrityAudit?.flags?.length) return sub.integrityAudit.flags
  return sub.plagiarismFlags || []
}

function integrityLabel(score: number) {
  if (score >= 80) return { label: "High", cls: "bg-green-100 text-green-800 border-green-200" }
  if (score >= 60) return { label: "Medium", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" }
  return { label: "Low", cls: "bg-red-100 text-red-800 border-red-200" }
}

export default function TestResultsPage() {
  const params = useParams()
  const testId = (params?.id as string) ?? ""
  const { toast } = useToast()

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"score" | "date" | "plagiarism" | "integrity">("score")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [detailSub, setDetailSub] = useState<Submission | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

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
      toast({ title: "Network Error", description: "Could not load results.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [testId, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCandidateStatus = async (sub: Submission, newStatus: "Shortlisted" | "Rejected") => {
    const appId = sub.applicationId?._id
    if (!appId) {
      toast({ title: "Cannot update", description: "No linked application found.", variant: "destructive" })
      return
    }
    setStatusUpdating(sub._id)
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast({ title: `Candidate ${newStatus}`, description: `${sub.candidateId?.name} has been ${newStatus.toLowerCase()}.` })
        fetchData()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: "Update Failed", description: (err as any).message || "Failed to update status.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network Error", description: "Could not update candidate status.", variant: "destructive" })
    } finally {
      setStatusUpdating(null)
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
    else if (sortBy === "integrity") {
      valA = getSubmissionIntegrity(a)
      valB = getSubmissionIntegrity(b)
    } else { valA = new Date(a.submittedAt).getTime(); valB = new Date(b.submittedAt).getTime() }
    return sortDir === "desc" ? valB - valA : valA - valB
  })

  const toggleSort = (col: "score" | "date" | "plagiarism" | "integrity") => {
    if (sortBy === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    else { setSortBy(col); setSortDir("desc") }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Loading test results...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
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
        </div>
      </div>

      <TestLiveMonitor testId={testId} />

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
            Click column headers to sort. Use Shortlist / Reject to update candidate status. Plagiarism ≥ 80% is flagged 🚩.
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Progress</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-700 select-none"
                      onClick={() => toggleSort("plagiarism")}
                    >
                      Plagiarism {sortBy === "plagiarism" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-700 select-none"
                      onClick={() => toggleSort("integrity")}
                    >
                      Integrity {sortBy === "integrity" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flags</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-purple-700 select-none"
                      onClick={() => toggleSort("date")}
                    >
                      Submitted {sortBy === "date" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedSubmissions.map((sub, idx) => {
                    const integrity = getSubmissionIntegrity(sub)
                    const flags = getSubmissionFlags(sub)
                    const { label: intLabel, cls: intCls } = integrityLabel(integrity)
                    const appStatus = sub.applicationId?.status || ""
                    const alreadyDecided = ["Shortlisted", "Rejected", "Hired"].includes(appStatus)

                    return (
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
                          <SkillBar label="" value={sub.percentage} color={sub.percentage >= 70 ? "#16a34a" : sub.percentage >= 50 ? "#f59e0b" : "#ef4444"} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {plagiarismBadge(sub.plagiarismScore, sub.plagiarismFlags)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge className={`${intCls} flex items-center gap-1 w-fit`}>
                            <ShieldCheck className="h-3 w-3" />{intLabel} {integrity}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {flags.length > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              {flags.map((flag, i) => (
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
                          {sub.status === "in_progress" ? (
                            <Badge className="bg-amber-100 text-amber-800 flex w-fit items-center gap-1">
                              In Progress
                            </Badge>
                          ) : sub.percentage >= 70 ? (
                            <Badge className="bg-green-100 text-green-800 flex w-fit items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Passed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50 flex w-fit items-center gap-1">
                              <XCircle className="h-3 w-3" /> Failed
                            </Badge>
                          )}
                          {appStatus && (
                            <span className="mt-1 block text-[10px] text-muted-foreground">{appStatus}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {format(new Date(sub.submittedAt), "MMM dd, yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {/* Detail dialog */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setDetailSub(sub)}
                            >
                              <Eye className="h-3 w-3 mr-1" /> Detail
                            </Button>
                            {/* Shortlist / Reject — only if not already decided */}
                            {!alreadyDecided && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs border-green-400 text-green-700 hover:bg-green-50"
                                  disabled={statusUpdating === sub._id}
                                  onClick={() => handleCandidateStatus(sub, "Shortlisted")}
                                >
                                  {statusUpdating === sub._id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <ThumbsUp className="h-3 w-3" />}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs border-red-400 text-red-600 hover:bg-red-50"
                                  disabled={statusUpdating === sub._id}
                                  onClick={() => handleCandidateStatus(sub, "Rejected")}
                                >
                                  {statusUpdating === sub._id
                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                    : <ThumbsDown className="h-3 w-3" />}
                                </Button>
                              </>
                            )}
                            {alreadyDecided && (
                              <Badge
                                variant={appStatus === "Shortlisted" ? "secondary" : "destructive"}
                                className="text-[10px]"
                              >
                                {appStatus}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plagiarism warning banner */}
      {submissions.some((s) => s.plagiarismScore >= 80) && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Plagiarism Detected</p>
              <p className="text-sm text-red-700">
                One or more submissions have similarity scores ≥ 80%. Review before shortlisting.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission detail dialog */}
      <Dialog open={!!detailSub} onOpenChange={(open) => { if (!open) setDetailSub(null) }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Detail</DialogTitle>
            <DialogDescription>
              {detailSub?.candidateId?.name} — {detailSub?.candidateId?.email}
            </DialogDescription>
          </DialogHeader>
          {detailSub && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Score</p>
                  <p className="text-2xl font-bold text-purple-700">{detailSub.percentage}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Raw Points</p>
                  <p className="text-2xl font-bold text-blue-700">{detailSub.totalScore}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Plagiarism</p>
                  <p className="text-2xl font-bold text-orange-600">{detailSub.plagiarismScore}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Integrity</p>
                  <p className="text-2xl font-bold text-green-700">
                    {getSubmissionIntegrity(detailSub)}%
                  </p>
                </div>
              </div>
              {detailSub.integrityAudit && (
                <div className="rounded-lg border bg-amber-50/50 p-3 space-y-2 text-sm">
                  <p className="text-xs font-semibold text-amber-900">Proctoring audit</p>
                  <p className="text-xs text-amber-800">{detailSub.integrityAudit.summary || "—"}</p>
                  {detailSub.integrityAudit.tabSwitches != null && (
                    <p className="text-xs text-amber-700">Tab switches: {detailSub.integrityAudit.tabSwitches}</p>
                  )}
                  {detailSub.integrityAudit.logs && detailSub.integrityAudit.logs.length > 0 && (
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {detailSub.integrityAudit.logs.slice(-8).map((log, i) => (
                        <p key={i} className="text-[10px] text-amber-900/80">{log.type}: {log.message}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Attempt:</span> #{detailSub.attemptNumber}</div>
                <div><span className="font-medium">Round:</span> {detailSub.roundStage || "—"}</div>
                <div><span className="font-medium">Language:</span>{" "}
                  <span className="capitalize">{extractSubmissionLanguage(detailSub) || "—"}</span>
                </div>
                <div><span className="font-medium">Submitted:</span> {format(new Date(detailSub.submittedAt), "MMM dd, yyyy HH:mm")}</div>
                <div><span className="font-medium">Application status:</span> {detailSub.applicationId?.status || "—"}</div>
              </div>

              {extractCodeAnswers(detailSub).length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Code2 className="h-4 w-4 text-purple-600" /> Submitted Code
                  </p>
                  {extractCodeAnswers(detailSub).map((sol, idx) => (
                    <div key={sol.questionId || idx} className="rounded-lg border overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b text-xs">
                        <span className="font-medium text-gray-700">
                          Problem {idx + 1}
                          {sol.totalTestCases > 0 && ` · ${sol.passedTestCases}/${sol.totalTestCases} cases`}
                        </span>
                        <Badge variant="outline" className="text-[10px] capitalize">{sol.language}</Badge>
                      </div>
                      <pre className="p-3 text-xs overflow-x-auto bg-[#0d1117] text-[#e6edf3] font-mono max-h-64">
                        {sol.code}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
              {getSubmissionFlags(detailSub).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Security flags</p>
                  <div className="flex flex-wrap gap-1">
                    {getSubmissionFlags(detailSub).map((f, i) => (
                      <Badge key={i} variant="outline" className="text-orange-700 border-orange-200 bg-orange-50 text-[11px]">
                        {f.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <SkillBar label={`Score: ${detailSub.percentage}%`} value={detailSub.percentage} color={detailSub.percentage >= 70 ? "#16a34a" : detailSub.percentage >= 50 ? "#f59e0b" : "#ef4444"} />
              {!["Shortlisted", "Rejected", "Hired"].includes(detailSub.applicationId?.status || "") && (
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="sm"
                    disabled={statusUpdating === detailSub._id}
                    onClick={() => { handleCandidateStatus(detailSub, "Shortlisted"); setDetailSub(null) }}
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" /> Shortlist
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    size="sm"
                    disabled={statusUpdating === detailSub._id}
                    onClick={() => { handleCandidateStatus(detailSub, "Rejected"); setDetailSub(null) }}
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
