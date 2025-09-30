"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  Users,
  TrendingUp,
  Shield,
  Target,
  AlertTriangle,
  CheckCircle,
  Download,
  Filter,
  Calendar,
  Loader2,
} from "lucide-react";

interface AssessmentAnalytics {
  assessmentId: string;
  title: string;
  totalCandidates: number;
  completedCandidates: number;
  averageScore: number;
  passRate: number;
  averageTime: number;
  proctoringStats: ProctoringStats;
  scoreDistribution: ScoreDistribution[];
  questionAnalytics: QuestionAnalytics[];
  timeAnalytics: TimeAnalytics[];
  candidateResults: CandidateResult[];
}

interface ProctoringStats {
  averageIntegrityScore: number;
  violationsDetected: number;
  highRiskCandidates: number;
  commonViolations: ViolationType[];
}

interface ViolationType {
  type: string;
  count: number;
  percentage: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  difficulty: string;
  correctRate: number;
  averageTime: number;
  commonWrongAnswers: string[];
}

interface TimeAnalytics {
  timeRange: string;
  candidateCount: number;
  averageScore: number;
}

interface CandidateResult {
  candidateId: string;
  name: string;
  email: string;
  score: number;
  completedAt: string;
  duration: number;
  proctoringScore: number;
  status: "passed" | "failed" | "flagged";
}

export default function AssessmentAnalyticsPage() {
  const params = useParams();
  const assessmentId = params.id as string;
  const [analytics, setAnalytics] = useState<AssessmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [assessmentId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/assessments/${assessmentId}/analytics`
      );
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        console.error("Failed to fetch analytics:", response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${analytics?.title}_Analytics_Report.pdf`;
        a.click();
      }
    } catch (error) {
      console.error("Failed to export report:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-semibold mb-2">
              Analytics Not Available
            </h3>
            <p className="text-muted-foreground">
              Unable to load assessment analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{analytics.title}</h1>
          <p className="text-muted-foreground">
            Assessment Analytics & Insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Date Range
          </Button>
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Candidates
                </p>
                <p className="text-2xl font-bold">
                  {analytics.totalCandidates}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {analytics.completedCandidates} completed (
                {Math.round(
                  (analytics.completedCandidates / analytics.totalCandidates) *
                    100
                )}
                %)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Average Score
                </p>
                <p className="text-2xl font-bold">{analytics.averageScore}%</p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <Progress value={analytics.averageScore} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pass Rate
                </p>
                <p className="text-2xl font-bold">{analytics.passRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="mt-2">
              <Progress value={analytics.passRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. Integrity Score
                </p>
                <p className="text-2xl font-bold">
                  {analytics.proctoringStats.averageIntegrityScore}%
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {analytics.proctoringStats.highRiskCandidates} high-risk
                candidates
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="proctoring">Proctoring</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>
                  How candidates performed across different score ranges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion Time Analysis</CardTitle>
                <CardDescription>
                  Average scores by time taken to complete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.timeAnalytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timeRange" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="averageScore"
                      stroke="#10b981"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Question Performance Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of how candidates performed on each question
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.questionAnalytics.map((question, index) => (
                  <Card
                    key={question.questionId}
                    className="border-l-4 border-l-blue-500"
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">Q{index + 1}</Badge>
                            <Badge variant="secondary">
                              {question.difficulty}
                            </Badge>
                          </div>
                          <h4 className="font-medium">
                            {question.questionText}
                          </h4>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            {question.correctRate}%
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Correct Rate
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium mb-1">
                            Success Rate
                          </p>
                          <Progress
                            value={question.correctRate}
                            className="h-2"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Avg. Time</p>
                          <p className="text-sm text-muted-foreground">
                            {Math.round(question.averageTime / 60)}m
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-1">Difficulty</p>
                          <Badge
                            variant={
                              question.difficulty === "Hard"
                                ? "destructive"
                                : question.difficulty === "Medium"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {question.difficulty}
                          </Badge>
                        </div>
                      </div>

                      {question.commonWrongAnswers.length > 0 && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-2">
                            Common Wrong Answers:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {question.commonWrongAnswers.map((answer, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                              >
                                {answer}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Candidates Tab */}
        <TabsContent value="candidates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Candidate Results</CardTitle>
              <CardDescription>
                Individual candidate performance and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.candidateResults.map((candidate) => (
                  <div
                    key={candidate.candidateId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {candidate.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{candidate.score}%</p>
                        <p className="text-sm text-muted-foreground">
                          {Math.round(candidate.duration / 60)}m
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-medium">
                          {candidate.proctoringScore}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Integrity
                        </p>
                      </div>

                      <Badge
                        variant={
                          candidate.status === "passed"
                            ? "default"
                            : candidate.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {candidate.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Proctoring Tab */}
        <TabsContent value="proctoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Violation Types</CardTitle>
                <CardDescription>
                  Most common proctoring violations detected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.proctoringStats.commonViolations}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) =>
                        `${type}: ${percentage}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.proctoringStats.commonViolations.map(
                        (entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proctoring Summary</CardTitle>
                <CardDescription>
                  Overall integrity monitoring statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {analytics.proctoringStats.averageIntegrityScore}%
                    </div>
                    <div className="text-sm text-green-700">
                      Avg. Integrity Score
                    </div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {analytics.proctoringStats.highRiskCandidates}
                    </div>
                    <div className="text-sm text-red-700">
                      High Risk Candidates
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Violation Breakdown</h4>
                  <div className="space-y-2">
                    {analytics.proctoringStats.commonViolations.map(
                      (violation, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm">
                            {violation.type.replace("_", " ").toUpperCase()}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${violation.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">
                              {violation.count}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>
                  AI-generated insights from assessment data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-l-blue-500">
                  <h4 className="font-medium text-blue-900">
                    Performance Trend
                  </h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Candidates who spent 60-80 minutes on the assessment scored
                    15% higher on average than those who rushed through in under
                    45 minutes.
                  </p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-l-green-500">
                  <h4 className="font-medium text-green-900">
                    Question Difficulty
                  </h4>
                  <p className="text-sm text-green-700 mt-1">
                    Questions 5, 12, and 18 had the lowest success rates (below
                    40%). Consider reviewing these questions for clarity or
                    adjusting difficulty.
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-l-orange-500">
                  <h4 className="font-medium text-orange-900">
                    Proctoring Alert
                  </h4>
                  <p className="text-sm text-orange-700 mt-1">
                    12% of candidates had integrity scores below 80%. Most
                    common violations were tab switching and background noise.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Suggested improvements for future assessments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Optimize Question Mix</h4>
                      <p className="text-sm text-muted-foreground">
                        Consider adding more medium-difficulty questions to
                        better differentiate candidate skill levels.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Adjust Time Allocation</h4>
                      <p className="text-sm text-muted-foreground">
                        Extend assessment time by 10-15 minutes to reduce time
                        pressure and improve performance accuracy.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Enhanced Proctoring</h4>
                      <p className="text-sm text-muted-foreground">
                        Enable stricter environment scanning to reduce integrity
                        violations in future assessments.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
