"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ArrowLeft,
  BarChart2,
  Users,
  Percent,
  AlertTriangle,
  ListChecks,
} from "lucide-react";

interface TestAnalytics {
  testId: string;
  title: string;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  avgPlagiarismScore: number;
}

interface TestQuestion {
  _id: string;
  questionText: string;
  type: "multiple_choice" | "short_answer" | "code_snippet";
  points: number;
}

interface RecruiterJobSummary {
  _id: string;
  title: string;
}

interface SubmissionAnswer {
  questionId: string;
  questionType: string;
  score: number;
  passedTestCases?: number;
  totalTestCases?: number;
}

interface Submission {
  _id: string;
  percentage?: number;
  plagiarismScore?: number;
  createdAt: string;
  candidateId?: {
    name?: string;
    email?: string;
  };
  applicationId?: {
    status?: string;
    testScore?: number;
  };
  answers?: SubmissionAnswer[];
}

export default function TestResultsPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params as any)?.id as string | undefined;
  const testId = rawId || "";

  const [analytics, setAnalytics] = useState<TestAnalytics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<RecruiterJobSummary[]>([]);
  const [assignJobId, setAssignJobId] = useState<string>("");
  const [assignEmail, setAssignEmail] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSuccess, setAssignSuccess] = useState<string | null>(null);
  const [autoMinScore, setAutoMinScore] = useState(70);
  const [autoMaxPlag, setAutoMaxPlag] = useState(40);
  const [autoTopN, setAutoTopN] = useState(3);
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);

  const loadResults = async () => {
    if (!testId) return;

      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, submissionsRes, testRes, jobsRes] = await Promise.all([
          fetch(`/api/tests/${testId}/analytics`),
          fetch(`/api/tests/${testId}/submissions`),
          fetch(`/api/tests/${testId}`),
          fetch("/api/job-descriptions/my-jobs"),
        ]);

        if (!analyticsRes.ok) {
          const e = await analyticsRes.json().catch(() => ({}));
          throw new Error(e.message || "Failed to load analytics");
        }
        if (!submissionsRes.ok) {
          const e = await submissionsRes.json().catch(() => ({}));
          throw new Error(e.message || "Failed to load submissions");
        }

        if (!testRes.ok) {
          const e = await testRes.json().catch(() => ({}));
          throw new Error(e.message || "Failed to load test definition");
        }

        if (!jobsRes.ok) {
          const e = await jobsRes.json().catch(() => ({}));
          throw new Error(e.message || "Failed to load jobs");
        }

        const analyticsData = (await analyticsRes.json()) as TestAnalytics;
        const submissionsData = (await submissionsRes.json()) as Submission[];
        const testData = (await testRes.json()) as { questions?: TestQuestion[] };
        const jobsData = (await jobsRes.json()) as { jobs?: RecruiterJobSummary[] };

        setAnalytics(analyticsData);
        setSubmissions(submissionsData);
        setQuestions((testData.questions as TestQuestion[]) || []);
        setJobs(jobsData.jobs || []);
      } catch (err: any) {
        console.error("Error loading test results", err);
        setError(err.message || "Something went wrong while loading results.");
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void loadResults();
  }, [testId]);

  // Lightweight polling so recruiters see near real-time updates
  useEffect(() => {
    if (!testId) return;

    const interval = setInterval(() => {
      void loadResults();
    }, 15000);

    return () => clearInterval(interval);
  }, [testId]);

  const bandForScore = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 50) return "Fair";
    return "Needs review";
  };

  const plagiarismBand = (value: number | undefined) => {
    if (value == null) return "Not checked";
    if (value >= 80) return "High";
    if (value >= 40) return "Medium";
    if (value > 0) return "Low";
    return "Clean";
  };

  const selectedSubmission =
    selectedSubmissionId && submissions.length > 0
      ? submissions.find((s) => s._id === selectedSubmissionId) || null
      : null;

  const findQuestion = (id: string) =>
    questions.find((q) => q._id === id) || null;

  const handleAssign = async () => {
    setAssignError(null);
    setAssignSuccess(null);

    if (!assignJobId || !assignEmail) {
      setAssignError("Select a job and enter candidate email.");
      return;
    }

    try {
      setAssignLoading(true);
      const res = await fetch("/api/tests/invite-by-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId: assignJobId, testId, email: assignEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setAssignError(data.message || "Failed to assign test.");
        return;
      }

      setAssignSuccess("Test assigned successfully.");
      setAssignEmail("");
    } catch (err: any) {
      setAssignError(err?.message || "Failed to assign test.");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleAutoSelect = async () => {
    setAutoMessage(null);
    try {
      setAutoLoading(true);
      const res = await fetch(`/api/tests/${testId}/auto-select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minScore: autoMinScore,
          maxPlagiarism: autoMaxPlag,
          topN: autoTopN,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAutoMessage(data.message || "Auto-select failed.");
        return;
      }

      const count = data.selectedCount ?? 0;
      setAutoMessage(`Auto-select completed. Shortlisted ${count} candidate${
        count === 1 ? "" : "s"
      }.`);

      // Refresh results after auto-select
      void loadResults();
    } catch (err: any) {
      setAutoMessage(err?.message || "Auto-select failed.");
    } finally {
      setAutoLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading test results...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/recruiter/tests")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to tests
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load results</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/recruiter/tests")}
            className="mb-2 pl-0"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to tests
          </Button>
          <h1 className="text-2xl font-bold">
            {analytics?.title || "Test Results"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of candidate performance, attempts, and plagiarism checks.
          </p>
        </div>
      </div>

      {/* Quick assign by email */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Assign this test</CardTitle>
          <CardDescription className="text-xs">
            Select a job and enter a candidate's email to assign this test.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Job
              </span>
              <Select
                value={assignJobId}
                onValueChange={(v) => setAssignJobId(v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
                    <SelectItem key={job._id} value={job._id}>
                      {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Candidate email
              </span>
              <Input
                type="email"
                placeholder="candidate@example.com"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 text-[11px] text-muted-foreground">
              {assignError && (
                <span className="text-destructive">{assignError}</span>
              )}
              {!assignError && assignSuccess && (
                <>
                  <span className="text-emerald-600">{assignSuccess}</span>
                  {assignJobId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() =>
                        router.push(`/dashboard/recruiter/jobs/${assignJobId}`)
                      }
                    >
                      View job
                    </Button>
                  )}
                </>
              )}
            </div>
            <Button
              size="sm"
              className="text-xs"
              onClick={handleAssign}
              disabled={assignLoading}
            >
              {assignLoading && (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              )}
              Assign test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards + auto-select controls */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Total Attempts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold">
              {analytics?.totalAttempts ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm">Average Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">
                {analytics?.averageScore ?? 0}%
              </p>
              {analytics && (
                <Badge variant="outline" className="text-xs">
                  {bandForScore(analytics.averageScore)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm">Pass Rate</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold">
                {analytics?.passRate ?? 0}%
              </p>
              {analytics && (
                <span className="text-xs text-muted-foreground">
                  Threshold  70%
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plagiarism summary */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-sm">Plagiarism Overview</CardTitle>
          </div>
          {analytics && (
            <Badge
              variant={
                analytics.avgPlagiarismScore >= 80
                  ? "destructive"
                  : analytics.avgPlagiarismScore >= 40
                  ? "secondary"
                  : "outline"
              }
            >
              Avg: {analytics.avgPlagiarismScore}% (
              {plagiarismBand(analytics.avgPlagiarismScore)})
            </Badge>
          )}
        </CardHeader>
        <CardContent className="pt-0 text-xs text-muted-foreground">
          <p>
            Scores are based on similarity between submissions. High values
            indicate potentially copied code and should be reviewed manually.
          </p>
        </CardContent>
      </Card>

      {/* Submissions table + breakdown */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
        <Card className="order-1 lg:order-none">
          <CardHeader>
            <CardTitle className="text-base">Submissions</CardTitle>
            <CardDescription>
              Click a row to see detailed question-level performance.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">
                No submissions yet. Once candidates complete this test, their
                results will appear here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-2 pr-4 text-left">Candidate</th>
                      <th className="py-2 px-4 text-left">Score</th>
                      <th className="py-2 px-4 text-left">Pass</th>
                      <th className="py-2 px-4 text-left">Status</th>
                      <th className="py-2 px-4 text-left">Plagiarism</th>
                      <th className="py-2 px-4 text-left">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => {
                      const score = s.percentage ?? s.applicationId?.testScore ?? 0;
                      const passed = score >= 70;
                      const status = s.applicationId?.status || "--";
                      const plagiarism = s.plagiarismScore ?? 0;
                      const isSelected = selectedSubmissionId === s._id;
                      return (
                        <tr
                          key={s._id}
                          className={`border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/40 ${
                            isSelected ? "bg-muted/60" : ""
                          }`}
                          onClick={() =>
                            setSelectedSubmissionId(
                              isSelected ? null : s._id,
                            )
                          }
                        >
                          <td className="py-2 pr-4 align-middle">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {s.candidateId?.name || s.candidateId?.email || "Unknown"}
                              </span>
                              {s.candidateId?.email && (
                                <span className="text-[11px] text-muted-foreground">
                                  {s.candidateId.email}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-4 align-middle">
                            <span className="font-medium">{score}%</span>
                          </td>
                          <td className="py-2 px-4 align-middle">
                            <Badge
                              variant={passed ? "secondary" : "outline"}
                              className="text-[11px]"
                            >
                              {passed ? "Pass" : "Review"}
                            </Badge>
                          </td>
                          <td className="py-2 px-4 align-middle">
                            {status === "Shortlisted" ? (
                              <Badge variant="secondary" className="text-[11px] bg-emerald-600 text-white">
                                Shortlisted
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                {status}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-4 align-middle">
                            <span className="flex items-center gap-2">
                              <span>{plagiarism}%</span>
                              <Badge
                                variant={
                                  plagiarism >= 80
                                    ? "destructive"
                                    : plagiarism >= 40
                                    ? "secondary"
                                    : "outline"
                                }
                                className="text-[11px]"
                              >
                                {plagiarismBand(plagiarism)}
                              </Badge>
                            </span>
                          </td>
                          <td className="py-2 px-4 align-middle text-xs text-muted-foreground">
                            {new Date(s.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="order-2 lg:order-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <ListChecks className="h-4 w-4 text-primary" />
              Question Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              See how this candidate performed on each question.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {!selectedSubmission ? (
              <p className="py-6 text-sm text-muted-foreground">
                Select a submission from the table to view per-question results.
              </p>
            ) : !selectedSubmission.answers ||
              selectedSubmission.answers.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">
                No detailed answers were recorded for this attempt.
              </p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                {selectedSubmission.answers.map((answer, idx) => {
                  const q = findQuestion(answer.questionId);
                  const score = answer.score ?? 0;
                  const band = bandForScore(
                    questions.length > 0 && q?.points
                      ? Math.round((score / q.points) * 100)
                      : score,
                  );
                  const isCode = answer.questionType === "code_snippet";
                  return (
                    <div
                      key={`${selectedSubmission._id}-${answer.questionId}-${idx}`}
                      className="rounded-md border p-3 text-xs space-y-1 bg-muted/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                              Q{idx + 1}
                            </span>
                            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {answer.questionType.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-[11px] font-medium">
                            {q?.questionText || "Question text not available"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold">
                            {score}
                            {q?.points != null ? ` / ${q.points}` : " pts"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {band}
                          </p>
                        </div>
                      </div>

                      {isCode && (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 text-[11px] text-muted-foreground">
                            {assignError && (
                              <span className="text-destructive">{assignError}</span>
                            )}
                            {!assignError && assignSuccess && (
                              <>
                                <span className="text-emerald-600">{assignSuccess}</span>
                                {assignJobId && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-[11px]"
                                    onClick={() =>
                                      router.push(`/dashboard/recruiter/jobs/${assignJobId}`)
                                    }
                                  >
                                    View job
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
