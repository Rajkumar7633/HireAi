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
import {
  Loader2,
  ArrowLeft,
  BarChart2,
  Users,
  Percent,
  AlertTriangle,
} from "lucide-react";

interface TestAnalytics {
  testId: string;
  title: string;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  avgPlagiarismScore: number;
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
  const testId = params.id as string;

  const [analytics, setAnalytics] = useState<TestAnalytics | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!testId) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [analyticsRes, submissionsRes] = await Promise.all([
          fetch(`/api/tests/${testId}/analytics`),
          fetch(`/api/tests/${testId}/submissions`),
        ]);

        if (!analyticsRes.ok) {
          const e = await analyticsRes.json().catch(() => ({}));
          throw new Error(e.message || "Failed to load analytics");
        }
        if (!submissionsRes.ok) {
          const e = await submissionsRes.json().catch(() => ({}));
          throw new Error(e.message || "Failed to load submissions");
        }

        const analyticsData = (await analyticsRes.json()) as TestAnalytics;
        const submissionsData = (await submissionsRes.json()) as Submission[];

        setAnalytics(analyticsData);
        setSubmissions(submissionsData);
      } catch (err: any) {
        console.error("Error loading test results", err);
        setError(err.message || "Something went wrong while loading results.");
      } finally {
        setLoading(false);
      }
    };

    void load();
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

      {/* Summary cards */}
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

      {/* Submissions table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submissions</CardTitle>
          <CardDescription>
            Each row represents one candidate's completed attempt.
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
                    <th className="py-2 px-4 text-left">Plagiarism</th>
                    <th className="py-2 px-4 text-left">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => {
                    const score = s.percentage ?? s.applicationId?.testScore ?? 0;
                    const passed = score >= 70;
                    const plagiarism = s.plagiarismScore ?? 0;
                    return (
                      <tr key={s._id} className="border-b last:border-0">
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
    </div>
  );
}
