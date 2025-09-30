"use client";

import { Label } from "@/components/ui/label";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy,
  Target,
  Clock,
  Shield,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Share2,
  BarChart3,
  Loader2,
} from "lucide-react";

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
  proctoringReport: any;
  questionResults: QuestionResult[];
  benchmarkData: BenchmarkData;
  candidateReview?: { rating: number; comment?: string; submittedAt: string } | null;
}

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

export default function AssessmentResultsPage() {
  const params = useParams();
  const assessmentId = params.id as string;
  const [results, setResults] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");

  useEffect(() => {
    fetchResults();
  }, [assessmentId]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/results`, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
      }
    } catch (error) {
      console.error("Failed to fetch results:", error);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!results) return;
    setSubmittingReview(true);
    try {
      const resp = await fetch(`/api/assessments/${assessmentId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      if (resp.ok) {
        // Refresh results to show saved review
        await fetchResults();
      }
    } catch (e) {
      console.error("Failed to submit review", e);
    } finally {
      setSubmittingReview(false);
    }
  };

  const downloadCertificate = async () => {
    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/certificate`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${results?.title}_Certificate.pdf`;
        a.click();
      }
    } catch (error) {
      console.error("Failed to download certificate:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading your results...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <CardContent className="py-8 text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Results Not Found</h3>
            <p className="text-muted-foreground">
              Unable to load assessment results.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Results Header */}
        <Card className="border-2 border-blue-200">
          <CardHeader
            className={`rounded-t-lg text-white ${
              results.passed
                ? "bg-gradient-to-r from-green-600 to-emerald-600"
                : "bg-gradient-to-r from-red-600 to-pink-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  {results.passed ? (
                    <Trophy className="h-8 w-8" />
                  ) : (
                    <Target className="h-8 w-8" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-3xl">{results.title}</CardTitle>
                  <CardDescription className="text-white/90 text-lg">
                    {results.passed
                      ? "Congratulations! You passed!"
                      : "Assessment completed"}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{results.percentage}%</div>
                <div className="text-white/90">
                  {results.score} / {results.maxScore} points
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Correct Answers</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {results.correctAnswers}/{results.totalQuestions}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-700">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">Time Taken</span>
                </div>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {Math.round(results.duration / 60)}m
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-medium">Percentile</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {results.benchmarkData.percentile}th
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-700">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Integrity Score</span>
                </div>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {results.proctoringScore}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="questions">Question Review</TabsTrigger>
            <TabsTrigger value="proctoring">Proctoring Report</TabsTrigger>
            <TabsTrigger value="benchmark">Benchmarks</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Overall Score</span>
                      <span className="text-sm text-muted-foreground">
                        {results.percentage}%
                      </span>
                    </div>
                    <Progress value={results.percentage} className="h-3" />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">
                        Passing Threshold
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {results.passingScore}%
                      </span>
                    </div>
                    <Progress
                      value={results.passingScore}
                      className="h-2 opacity-50"
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Result</span>
                      <Badge
                        variant={results.passed ? "default" : "destructive"}
                        className="text-sm"
                      >
                        {results.passed ? "PASSED" : "NOT PASSED"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Question Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["Easy", "Medium", "Hard"].map((difficulty) => {
                      const questionsOfDifficulty =
                        results.questionResults.filter(
                          (q) => q.difficulty === difficulty
                        );
                      const correctCount = questionsOfDifficulty.filter(
                        (q) => q.isCorrect
                      ).length;
                      const totalCount = questionsOfDifficulty.length;

                      if (totalCount === 0) return null;

                      return (
                        <div key={difficulty}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">
                              {difficulty}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {correctCount}/{totalCount}
                            </span>
                          </div>
                          <Progress
                            value={(correctCount / totalCount) * 100}
                            className="h-2"
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>
                  Download your results or share your achievement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  {results.passed && (
                    <Button
                      onClick={downloadCertificate}
                      className="bg-gradient-to-r from-green-600 to-emerald-600"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                  )}
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Results
                  </Button>
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Detailed Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Candidate Review */}
            <Card>
              <CardHeader>
                <CardTitle>Share Your Feedback</CardTitle>
                <CardDescription>
                  Help recruiters understand your experience. This will be visible to them along with your results.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.candidateReview ? (
                  <div className="text-sm text-muted-foreground">
                    <div className="mb-2">
                      <span className="font-medium text-foreground">Your Rating:</span>
                      <span className="ml-2">{results.candidateReview.rating} / 5</span>
                    </div>
                    {results.candidateReview.comment && (
                      <div>
                        <span className="font-medium text-foreground">Your Comment:</span>
                        <div className="mt-1 p-3 rounded-md border bg-muted">{results.candidateReview.comment}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Label htmlFor="rating">Rating</Label>
                      <select
                        id="rating"
                        value={reviewRating}
                        onChange={(e) => setReviewRating(parseInt(e.target.value))}
                        className="bg-background border rounded px-2 py-1"
                      >
                        {[5,4,3,2,1].map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <span className="text-xs text-muted-foreground">(5 = Excellent)</span>
                    </div>
                    <div>
                      <Label htmlFor="comment">Comment (optional)</Label>
                      <textarea
                        id="comment"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={3}
                        className="w-full mt-1 bg-background border rounded p-2"
                        placeholder="Share any feedback about the assessment"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={submitReview} disabled={submittingReview}>
                        {submittingReview ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                        Submit Review
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Question-by-Question Review</CardTitle>
                <CardDescription>
                  Review your answers and see the correct solutions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.questionResults.map((question, index) => (
                    <Card
                      key={question.questionId}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Q{index + 1}</Badge>
                            <Badge variant="secondary">
                              {question.difficulty}
                            </Badge>
                            <Badge
                              variant={
                                question.isCorrect ? "default" : "destructive"
                              }
                            >
                              {question.isCorrect ? "Correct" : "Incorrect"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {question.points}/{question.maxPoints} points
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <h4 className="font-medium mb-2">
                            {question.questionText}
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">
                              Your Answer
                            </Label>
                            <div
                              className={`p-3 rounded-lg border ${
                                question.isCorrect
                                  ? "bg-green-50 border-green-200"
                                  : "bg-red-50 border-red-200"
                              }`}
                            >
                              <p className="text-sm">
                                {question.userAnswer || "No answer provided"}
                              </p>
                            </div>
                          </div>

                          {!question.isCorrect && (
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground">
                                Correct Answer
                              </Label>
                              <div className="p-3 rounded-lg border bg-green-50 border-green-200">
                                <p className="text-sm">
                                  {question.correctAnswer}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Proctoring Tab */}
          <TabsContent value="proctoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Assessment Integrity Report
                </CardTitle>
                <CardDescription>
                  AI proctoring analysis and security monitoring results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">
                      {results.proctoringScore}%
                    </div>
                    <div className="text-sm text-green-700">
                      Integrity Score
                    </div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">
                      {results.proctoringReport.violations.alerts}
                    </div>
                    <div className="text-sm text-blue-700">Total Alerts</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">
                      {results.proctoringReport.violations.tabSwitches}
                    </div>
                    <div className="text-sm text-orange-700">Tab Switches</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Proctoring Timeline</h4>
                  <div className="space-y-2">
                    {results.proctoringReport.timeline.map(
                      (event: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                        >
                          <div className="flex-shrink-0">
                            {event.severity === "high" ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : event.severity === "medium" ? (
                              <AlertTriangle className="h-5 w-5 text-orange-500" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {event.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <Badge
                            variant={
                              event.severity === "high"
                                ? "destructive"
                                : event.severity === "medium"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {event.severity}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Overall Assessment</h4>
                  <p className="text-sm text-muted-foreground">
                    {results.proctoringReport.recommendation}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benchmark Tab */}
          <TabsContent value="benchmark" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Benchmarks</CardTitle>
                <CardDescription>
                  See how you performed compared to other candidates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Score Comparison</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">Your Score</span>
                          <span className="text-sm font-medium">
                            {results.percentage}%
                          </span>
                        </div>
                        <Progress value={results.percentage} className="h-3" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">Average Score</span>
                          <span className="text-sm font-medium">
                            {results.benchmarkData.averageScore}%
                          </span>
                        </div>
                        <Progress
                          value={results.benchmarkData.averageScore}
                          className="h-2 opacity-50"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">Industry Average</span>
                          <span className="text-sm font-medium">
                            {results.benchmarkData.industryAverage}%
                          </span>
                        </div>
                        <Progress
                          value={results.benchmarkData.industryAverage}
                          className="h-2 opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Percentile Ranking</h4>
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
                      <div className="text-4xl font-bold text-blue-600 mb-2">
                        {results.benchmarkData.percentile}th
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">
                        Percentile
                      </div>
                      <p className="text-sm">
                        You scored better than{" "}
                        {results.benchmarkData.percentile}% of all candidates
                        who took this assessment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {results.benchmarkData.topPercentile}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Top Performers
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.benchmarkData.averageScore}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Average Score
                    </div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {results.totalQuestions}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Questions
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
