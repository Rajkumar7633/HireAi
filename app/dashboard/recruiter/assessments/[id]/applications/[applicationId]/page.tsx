"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SkillBar } from "@/components/ui/charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Briefcase,
  Calendar,
  FileText,
  Camera,
  Activity,
  ThumbsUp,
  ThumbsDown,
  ChevronRight,
  Maximize2
} from "lucide-react";

interface Question {
  _id: string;
  questionId?: string;
  questionText: string;
  type: string;
  points: number;
  correctAnswer: string;
}

interface ApplicationDetails {
  _id: string;
  status: string;
  score?: number;
  completedAt?: string;
  timeSpent?: number;
  jobSeekerId: {
    _id: string;
    name: string;
    email: string;
  };
  jobDescriptionId: {
    _id: string;
    title: string;
    location?: string;
  };
  assessmentId?: {
    _id: string;
    title: string;
    questions?: Question[];
    durationMinutes: number;
    totalQuestions: number;
    totalPoints: number;
  };
  answers?: Array<{
    questionId: string;
    answer: string;
    isCorrect?: boolean;
    points?: number;
  }>;
  proctoringData?: {
    score?: number;
    tabSwitchCount?: number;
    screenShareStops?: number;
    screenshots?: string[];
    securityViolations?: Array<{
      type: string;
      message: string;
      timestamp: string;
    }>;
    report?: {
      overallScore?: number;
      recommendation?: string;
      violations?: {
        tabSwitches?: number;
        totalAlerts?: number;
        highSeverityAlerts?: number;
        mediumSeverityAlerts?: number;
        lowSeverityAlerts?: number;
      };
      timeline?: Array<{
        timestamp: string;
        type: string;
        severity: string;
        message: string;
      }>;
    };
  };
}

export default function ApplicationProctoringDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;
  const applicationId = params.applicationId as string;
  const { toast } = useToast();

  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

  const fetchApplicationDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/applications/${applicationId}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.message || "Failed to load application details");
      setApplication(data.application);
    } catch (e: any) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        toast({
          title: `Status Updated`,
          description: `Candidate status is now ${newStatus}`,
        });
        fetchApplicationDetails();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update status");
      }
    } catch (e: any) {
      toast({
        title: "Error updating status",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-4" />
        <p className="text-muted-foreground font-medium">Loading candidate details & security logs...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="p-6 w-full">
        <Card className="border-red-200 bg-red-50 text-center py-12">
          <CardContent>
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Candidate Profile</h3>
            <p className="text-red-600 mb-6">{error || "Candidate application not found."}</p>
            <Button variant="outline" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate integrity score (default 100)
  const integrityScore = application.proctoringData?.score ?? 100;
  const getIntegrityColor = (score: number) => {
    if (score >= 80) return "bg-green-500 text-white";
    if (score >= 60) return "bg-amber-500 text-black";
    return "bg-red-500 text-white";
  };
  const getIntegrityBadge = (score: number) => {
    if (score >= 80) return <Badge className="bg-green-600 text-white">Trustworthy ({score}%)</Badge>;
    if (score >= 60) return <Badge className="bg-amber-500 text-black font-semibold">Suspicious ({score}%)</Badge>;
    return <Badge className="bg-red-600 text-white animate-pulse">High Risk ({score}%)</Badge>;
  };

  // Match questions to candidate answers
  const qaMap = new Map();
  application.answers?.forEach((ans) => {
    qaMap.set(ans.questionId, ans);
  });

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
      {/* Header breadcrumbs */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {application.jobSeekerId?.name || "Candidate Details"}
              <Badge variant="outline" className="ml-2 font-normal text-xs text-muted-foreground border-purple-500/30">
                Application Profile
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Security audit report for the assessment: <span className="font-semibold text-purple-400">{application.assessmentId?.title || "Assessment"}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-green-600 text-green-500 hover:bg-green-950/20"
            disabled={updatingStatus || application.status === "Shortlisted"}
            onClick={() => handleStatusChange("Shortlisted")}
          >
            <ThumbsUp className="h-4 w-4 mr-2" /> Shortlist
          </Button>
          <Button
            variant="outline"
            className="border-red-600 text-red-500 hover:bg-red-950/20"
            disabled={updatingStatus || application.status === "Rejected"}
            onClick={() => handleStatusChange("Rejected")}
          >
            <ThumbsDown className="h-4 w-4 mr-2" /> Reject
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Candidate Profile Details Card */}
        <Card className="bg-gray-900 border-gray-800 text-white lg:col-span-1 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-purple-400" />
              Candidate Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 bg-gray-950/40 p-2.5 rounded-lg border border-gray-800/60">
                <User className="h-5 w-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{application.jobSeekerId?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-950/40 p-2.5 rounded-lg border border-gray-800/60">
                <Mail className="h-5 w-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="font-medium truncate max-w-[200px]">{application.jobSeekerId?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-950/40 p-2.5 rounded-lg border border-gray-800/60">
                <Briefcase className="h-5 w-5 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Job Applied For</p>
                  <p className="font-medium text-purple-300">{application.jobDescriptionId?.title}</p>
                </div>
              </div>

              {application.completedAt && (
                <div className="flex items-center gap-3 bg-gray-950/40 p-2.5 rounded-lg border border-gray-800/60">
                  <Calendar className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted At</p>
                    <p className="font-medium">
                      {new Date(application.completedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-gray-800" />

            {/* Assessment Performance overview */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-300">Assessment Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800 text-center">
                  <span className="text-xs text-muted-foreground block">Final Score</span>
                  <span className="text-2xl font-extrabold text-green-400">
                    {application.score !== undefined ? `${application.score}%` : "—"}
                  </span>
                </div>

                <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800 text-center">
                  <span className="text-xs text-muted-foreground block">Time Spent</span>
                  <span className="text-2xl font-extrabold text-blue-400 flex items-center justify-center gap-1">
                    <Clock className="h-4 w-4" />
                    {application.timeSpent !== undefined
                      ? `${Math.round(application.timeSpent / 60)}m`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Proctoring Score dashboard */}
        <Card className="bg-gray-900 border-gray-800 text-white lg:col-span-2 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-400" />
                AI Proctoring Overview
              </CardTitle>
              <CardDescription className="text-gray-400">
                Detailed anti-cheat audit score & environment checks
              </CardDescription>
            </div>
            {getIntegrityBadge(integrityScore)}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Tab Switches</span>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-3xl font-extrabold text-amber-500">
                    {application.proctoringData?.tabSwitchCount ?? 0}
                  </span>
                  <Badge variant="outline" className="text-xs border-amber-600/30 text-amber-500 bg-amber-500/5">
                    Limit: 2
                  </Badge>
                </div>
              </div>

              <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Screen Share Stops</span>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-3xl font-extrabold text-red-500">
                    {application.proctoringData?.screenShareStops ?? 0}
                  </span>
                  <Badge variant="outline" className="text-xs border-red-600/30 text-red-500 bg-red-500/5">
                    Limit: 0
                  </Badge>
                </div>
              </div>

              <div className="bg-gray-950/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
                <span className="text-xs text-muted-foreground font-medium">Total Alerts</span>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-3xl font-extrabold text-purple-400">
                    {application.proctoringData?.report?.violations?.totalAlerts ??
                      application.proctoringData?.securityViolations?.length ??
                      0}
                  </span>
                  <Badge variant="outline" className="text-xs border-purple-600/30 text-purple-400 bg-purple-500/5">
                    Monitoring
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-gray-300 mb-2">
                <span>ENVIRONMENT INTEGRITY SCORE</span>
                <span>{integrityScore}%</span>
              </div>
              <SkillBar label="" value={integrityScore} color={integrityScore >= 70 ? "#16a34a" : integrityScore >= 50 ? "#f59e0b" : "#ef4444"} />
            </div>

            {application.proctoringData?.report?.recommendation && (
              <div className="p-3.5 bg-gray-950/80 rounded-lg border border-gray-800 flex items-start gap-3">
                <Activity className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">AI Assessment Recommendation</p>
                  <p className="text-sm font-medium mt-1">{application.proctoringData.report.recommendation}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs list: violations, screenshots, test details */}
      <Tabs defaultValue="proctoring" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-900 border border-gray-800 p-1 rounded-xl">
          <TabsTrigger value="proctoring" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Shield className="h-4 w-4 mr-2" /> Proctoring & Activity Timeline
          </TabsTrigger>
          <TabsTrigger value="screenshots" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <Camera className="h-4 w-4 mr-2" /> Captured Screenshots ({application.proctoringData?.screenshots?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="questions" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" /> Test Responses
          </TabsTrigger>
        </TabsList>

        {/* Proctoring Timeline Tab */}
        <TabsContent value="proctoring" className="mt-4">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Security Activity Timeline</CardTitle>
              <CardDescription>
                Sequence of all security logs, focus loss events, and proctoring incidents detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!application.proctoringData?.securityViolations ||
                application.proctoringData.securityViolations.length === 0) &&
              (!application.proctoringData?.report?.timeline ||
                application.proctoringData.report.timeline.length === 0) ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-white text-lg">No Violations Found</p>
                  <p className="text-sm">Candidate complied with all active assessment guidelines.</p>
                </div>
              ) : (
                <div className="relative border-l border-gray-800 pl-6 ml-4 space-y-6">
                  {/* Normalize timeline events from both arrays */}
                  {(() => {
                    const rawViolations = application.proctoringData?.securityViolations || [];
                    const reportTimeline = application.proctoringData?.report?.timeline || [];

                    const events = [
                      ...rawViolations.map((v) => ({
                        timestamp: v.timestamp ? new Date(v.timestamp) : new Date(),
                        type: v.type,
                        message: v.message,
                        severity: v.type === "tab_switch" || v.type === "dev_tools_open" ? "medium" : "high",
                      })),
                      ...reportTimeline.map((t) => ({
                        timestamp: t.timestamp ? new Date(t.timestamp) : new Date(),
                        type: t.type,
                        message: t.message,
                        severity: t.severity || "medium",
                      })),
                    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                    return events.map((event, index) => (
                      <div key={index} className="relative">
                        <div className={`absolute -left-[31px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-gray-900 ${
                          event.severity === "high" ? "bg-red-500 animate-pulse" : "bg-amber-500"
                        }`} />
                        <div className="bg-gray-950/40 p-4 rounded-xl border border-gray-800/80 hover:border-purple-900/30 transition-all">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <Badge className={`uppercase text-[10px] tracking-wider mb-2 font-bold ${
                                event.severity === "high" ? "bg-red-950/80 text-red-400 border-red-800/30" : "bg-amber-950/80 text-amber-400 border-amber-800/30"
                              }`}>
                                {event.type.replace(/_/g, " ")}
                              </Badge>
                              <p className="text-sm text-gray-200">{event.message}</p>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 font-medium">
                              {event.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Captured Screenshots Gallery Tab */}
        <TabsContent value="screenshots" className="mt-4">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Candidate Webcam Snapshots</CardTitle>
              <CardDescription>
                Automated background webcam snapshots taken randomly throughout the test duration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!application.proctoringData?.screenshots ||
              application.proctoringData.screenshots.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Camera className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="font-semibold text-white text-lg">No Webcam Snapshots</p>
                  <p className="text-sm">Webcam monitoring was disabled or no frames were captured yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {application.proctoringData.screenshots.map((src, idx) => (
                    <div
                      key={idx}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-800 bg-gray-950 hover:border-purple-500/50 transition-all duration-300"
                      onClick={() => setSelectedScreenshot(src)}
                    >
                      <img
                        src={src}
                        alt={`Snapshot ${idx + 1}`}
                        className="w-full aspect-video object-cover group-hover:scale-105 transition-all duration-300"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                        <Maximize2 className="h-6 w-6 text-white" />
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[10px] font-medium text-white">
                        Snapshot #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Answers Details Tab */}
        <TabsContent value="questions" className="mt-4">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Responses Breakdown</CardTitle>
              <CardDescription>
                Detailed audit of all assessment questions, candidate answers, and scoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!application.assessmentId?.questions ||
              application.assessmentId.questions.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">No questions found in this assessment.</p>
              ) : (
                application.assessmentId.questions.map((q, idx) => {
                  const candidateAnswer = qaMap.get(q._id) || qaMap.get(q.questionId);
                  const isCorrect = candidateAnswer?.isCorrect ?? false;
                  const earnedPoints = candidateAnswer?.points ?? 0;

                  return (
                    <div
                      key={q._id}
                      className="bg-gray-950/40 border border-gray-800 rounded-xl p-5 hover:border-gray-700/60 transition-all duration-200"
                    >
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex-1">
                          <span className="text-xs text-purple-400 font-semibold tracking-wider uppercase block mb-1">
                            Question {idx + 1} ({q.type.replace(/_/g, " ")})
                          </span>
                          <h4 className="text-base font-semibold text-white leading-relaxed">{q.questionText}</h4>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge className={isCorrect ? "bg-green-950/80 text-green-400 border-green-800/30" : "bg-red-950/80 text-red-400 border-red-800/30"}>
                            {isCorrect ? "CORRECT" : "INCORRECT"}
                          </Badge>
                          <span className="text-xs text-muted-foreground block mt-1">
                            {earnedPoints} / {q.points} Points
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3 pt-3 border-t border-gray-800/50">
                        <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-800/60">
                          <span className="text-xs text-muted-foreground uppercase font-bold block mb-1">Candidate Answer</span>
                          <p className="font-medium text-gray-200 whitespace-pre-wrap">{candidateAnswer?.answer || "—"}</p>
                        </div>

                        <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-800/60">
                          <span className="text-xs text-muted-foreground uppercase font-bold block mb-1">Correct Answer</span>
                          <p className="font-medium text-green-400 whitespace-pre-wrap">{q.correctAnswer || "—"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Screenshot lightbox modal */}
      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 transition-all duration-300"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
            <img src={selectedScreenshot} alt="Snapshot lightbox view" className="max-w-full max-h-[85vh] object-contain" />
            <button
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/90 text-white rounded-full p-2.5 transition-colors border border-gray-800"
              onClick={() => setSelectedScreenshot(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
