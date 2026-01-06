"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, Download, Shield, BarChart3 } from "lucide-react";

interface QuestionResult {
  questionId: string;
  questionText: string;
  type: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  difficulty: string;
}

interface BenchmarkData {
  averageScore: number;
  percentile: number;
  topPercentile: number;
  industryAverage: number;
}

interface ProctoringReport {
  violations: {
    alerts: number;
    tabSwitches: number;
    screenshots?: number;
    externalHardware?: number;
  };
  timeline: { message: string; timestamp: string; severity: string }[];
  recommendation: string;
}

interface AssessmentResult {
  assessmentId: string;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  passingScore: number;
  passed: boolean;
  completedAt: string;
  duration: number;
  totalQuestions: number;
  correctAnswers: number;
  proctoringScore: number;
  proctoringReport: ProctoringReport;
  questionResults: QuestionResult[];
  benchmarkData: BenchmarkData;
}

export default function DetailedAssessmentReportPage() {
  const params = useParams() as { id: string };
  const router = useRouter();
  const assessmentId = params.id;

  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(`/api/assessments/${assessmentId}/results`, {
          cache: "no-store",
        });
        if (!resp.ok) return;
        const data = await resp.json();
        setResults(data.results as AssessmentResult);
      } finally {
        setLoading(false);
      }
    };
    if (assessmentId) load();
  }, [assessmentId]);

  const correctnessStats = useMemo(() => {
    if (!results) return { correct: 0, incorrect: 0, unanswered: 0 };
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    for (const q of results.questionResults) {
      if (!q.userAnswer) {
        unanswered++;
      } else if (q.isCorrect) {
        correct++;
      } else {
        incorrect++;
      }
    }
    return { correct, incorrect, unanswered };
  }, [results]);

  const downloadReportPdf = async () => {
    try {
      const resp = await fetch(
        `/api/assessments/${assessmentId}/report-pdf`
      );
      if (!resp.ok) return;
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${results?.title || "assessment"}-detailed-report.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download detailed report PDF", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Preparing detailed report…</span>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <p className="text-lg font-semibold">Report not available</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Results
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                Candidate Assessment Report
              </p>
              <h1 className="text-2xl font-bold">{results.title}</h1>
              <p className="text-sm text-muted-foreground">
                Assessment ID: {results.assessmentId}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right text-sm text-muted-foreground">
              <div>Total Score</div>
              <div className="text-xl font-semibold">
                {results.score}/{results.maxScore}
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <div>Total Time Taken</div>
              <div className="font-medium">
                {Math.round(results.duration / 60)} mins
              </div>
            </div>
          </div>
        </div>

        {/* Proctoring strip similar to reference */}
        <Card className="border-none shadow-sm bg-emerald-50">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Proctoring</div>
                <div className="text-muted-foreground text-xs">
                  Integrity score {results.proctoringScore}%
                </div>
              </div>
              <div>
                <div className="font-medium flex items-center gap-1">
                  <Shield className="h-4 w-4 text-emerald-600" /> Violations Made
                </div>
                <div className="text-xs text-muted-foreground">
                  {results.proctoringReport?.violations?.screenshots ?? 0} screenshots
                </div>
              </div>
              <div>
                <div className="font-medium">Tab / Window Switched</div>
                <div className="text-xs text-muted-foreground">
                  {results.proctoringReport?.violations?.tabSwitches ?? 0} times overall
                </div>
              </div>
              <div>
                <div className="font-medium">Background Apps</div>
                <div className="text-xs text-muted-foreground">Not detected</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="summary">Candidate Summary</TabsTrigger>
            <TabsTrigger value="insights">Data Insights</TabsTrigger>
          </TabsList>

          {/* Candidate Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Candidate Summary</CardTitle>
                <CardDescription>
                  Overall performance overview for this assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      SCORE
                    </div>
                    <div className="text-3xl font-bold">
                      {results.score}/{results.maxScore}
                    </div>
                    <Progress
                      value={results.percentage}
                      className="h-2 mt-3"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      CORRECT ANSWERS
                    </div>
                    <div className="text-3xl font-bold">
                      {results.correctAnswers}/{results.totalQuestions}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Passing threshold: {results.passingScore}%
                    </p>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      RESULT
                    </div>
                    <Badge
                      variant={results.passed ? "default" : "destructive"}
                      className="text-sm px-3 py-1"
                    >
                      {results.passed ? "PASSED" : "NOT PASSED"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Completed at {new Date(results.completedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Segment summary style table */}
                <div className="mt-4">
                  <div className="text-sm font-medium mb-2">Sections</div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left">Segment Name</th>
                          <th className="px-4 py-2 text-left">Total Questions</th>
                          <th className="px-4 py-2 text-left">Total Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-2">Data Insights</td>
                          <td className="px-4 py-2">{results.totalQuestions}</td>
                          <td className="px-4 py-2">{results.score}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Simple bar style visualization */}
            <Card>
              <CardHeader>
                <CardTitle>Question Breakdown</CardTitle>
                <CardDescription>
                  Correct vs incorrect vs unattempted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Correct</div>
                    <div className="text-2xl font-bold text-green-600">
                      {correctnessStats.correct}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Incorrect</div>
                    <div className="text-2xl font-bold text-red-600">
                      {correctnessStats.incorrect}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Unattempted</div>
                    <div className="text-2xl font-bold text-slate-600">
                      {correctnessStats.unanswered}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Data Insights</CardTitle>
                    <CardDescription>
                      Detailed performance metrics and benchmarks
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    Score: {results.score}/{results.maxScore}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      NO. OF QUESTIONS
                    </div>
                    <div className="text-xl font-semibold">
                      {results.totalQuestions}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      CORRECT
                    </div>
                    <div className="text-xl font-semibold">
                      {correctnessStats.correct}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      INCORRECT
                    </div>
                    <div className="text-xl font-semibold">
                      {correctnessStats.incorrect}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      UNATTEMPTED
                    </div>
                    <div className="text-xl font-semibold">
                      {correctnessStats.unanswered}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Benchmark Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span>Your Score</span>
                        <span className="font-medium">
                          {results.percentage}%
                        </span>
                      </div>
                      <Progress value={results.percentage} className="h-2" />
                      <div className="flex justify-between items-center pt-2">
                        <span>Average Score</span>
                        <span className="font-medium">
                          {results.benchmarkData.averageScore}%
                        </span>
                      </div>
                      <Progress
                        value={results.benchmarkData.averageScore}
                        className="h-2"
                      />
                      <div className="flex justify-between items-center pt-2">
                        <span>Industry Average</span>
                        <span className="font-medium">
                          {results.benchmarkData.industryAverage}%
                        </span>
                      </div>
                      <Progress
                        value={results.benchmarkData.industryAverage}
                        className="h-2"
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-dashed">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" /> Percentile & Top
                        Performers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-blue-600">
                          {results.benchmarkData.percentile}th
                        </span>
                        <span className="text-xs text-muted-foreground">
                          percentile
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You performed better than {results.benchmarkData.percentile}
                        % of candidates.
                      </p>
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          TOP PERFORMERS
                        </div>
                        <div className="text-lg font-semibold">
                          {results.benchmarkData.topPercentile}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={downloadReportPdf}>
                    <Download className="h-4 w-4 mr-2" /> Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Video Assessments</CardTitle>
                <CardDescription>
                  If this assessment included video responses, they will appear
                  here.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                No video available. The video is invalid or was not recorded.
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
