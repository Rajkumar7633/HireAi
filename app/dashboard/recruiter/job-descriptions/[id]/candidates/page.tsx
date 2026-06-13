"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, FileText, TestTube, ExternalLink, Trophy } from "lucide-react";
import { ScoreRing, SkillBar } from "@/components/ui/charts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface RoundInfo {
  roundName?: string;
  stageKey?: string;
  status?: string;
  latestScore?: number;
  testId?: string;
}

interface Application {
  _id: string;
  jobSeekerId: {
    _id: string;
    name: string;
    email: string;
  };
  resumeId: {
    _id: string;
    filename: string;
    originalName: string;
  };
  testId?: {
    _id: string;
    title: string;
  };
  assessmentId?: string;
  status: string;
  applicationDate: string;
  testScore?: number | null;
  testCompletedAt?: string | null;
  score?: number | null;
  completedAt?: string | null;
  screeningAnswers?: { question: string; answer: string }[];
  applicationProfile?: {
    experienceLevel?: string;
    expectedSalary?: string;
    location?: string;
    skills?: string[];
  };
  aiMatchScore?: number | null;
  atsScore?: number | null;
  shortlisted?: boolean;
  skillsMatched?: string[];
  missingSkills?: string[];
  aiExplanation?: string;
  currentStage?: string;
  rounds?: RoundInfo[];
}

export default function CandidatesPage() {
  const params = useParams() as any;
  const jobId = (params?.id as string) || "";
  const { toast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Application | null>(null);
  const [openWhy, setOpenWhy] = useState(false);
  const [jobMode, setJobMode] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAnswers, setFilterAnswers] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"all" | "shortlisted">("all");
  const [shortlistedApps, setShortlistedApps] = useState<Application[]>([]);
  const [autoScreenRunning, setAutoScreenRunning] = useState(false);
  const [roundSelections, setRoundSelections] = useState<Record<string, string>>({});
  const [testSelections, setTestSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (jobId) {
      fetchCandidates();
      fetchTests();
      fetchShortlisted();
    }
  }, [jobId]);

  const fetchCandidates = async () => {
    try {
      const response = await fetch(`/api/job-descriptions/${jobId}/candidates`);
      if (response.ok) {
        const data = await response.json();
        const normalized: Application[] = (data.applications || []).map((a: any) => {
          const js = a.jobSeekerId;
          const jobSeekerObj = js && typeof js === "object"
            ? js
            : { _id: js || "", name: a.candidateName || "Candidate", email: a.candidateEmail || "" };
          const res = a.resumeId;
          const resumeObj = res && typeof res === "object"
            ? res
            : { _id: res || "", filename: a.resumeFilename || "", originalName: a.resumeOriginalName || "Resume" };
          return {
            ...a,
            jobSeekerId: jobSeekerObj,
            resumeId: resumeObj,
            currentStage: (a as any).currentStage as string | undefined,
            rounds: ((a as any).rounds || []) as RoundInfo[],
          } as Application;
        });
        setApplications(normalized);
        setJobTitle(data.jobTitle);
        setJobMode(data.applicationMode || "");
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch candidates.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error. Failed to fetch candidates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async (applicationId: string, nextStage: string) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/stage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentStage: nextStage }),
      });
      if (response.ok) {
        toast({ title: "Stage Updated", description: "Application stage has been updated." });
        fetchCandidates();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast({ title: "Update Failed", description: (errorData as any).message || "Failed to update stage.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    }
  };

  const formatStageLabel = (stage?: string) => {
    if (!stage) return "-";
    const map: Record<string, string> = {
      application: "Application Submitted",
      hr_shortlist: "HR Shortlisting",
      coding_round: "Coding Test",
      mcq_round: "MCQ/CS Test",
      advanced_round: "Advanced Test",
      tech_round_1: "Tech Round 1",
      tech_round_2: "Tech Round 2",
      tech_round_3: "Tech Round 3",
      hr_round: "HR/Behaviour Round",
      offer: "Final Offer",
      test_round: "Test Round",
    };
    return map[stage] || stage;
  };

  const fetchTests = async () => {
    try {
      const response = await fetch("/api/tests/my-tests");
      if (response.ok) {
        const data = await response.json();
        setTests(data);
      }
    } catch {
      // silent
    }
  };

  const fetchShortlisted = async () => {
    try {
      const res = await fetch(`/api/job-descriptions/${jobId}/shortlisted`);
      if (res.ok) {
        const data = await res.json();
        const mapped: Application[] = (data.candidates || []).map((c: any) => ({
          _id: c.applicationId,
          jobSeekerId: {
            _id: c.jobSeeker?._id || "",
            name: c.jobSeeker?.name || "Candidate",
            email: c.jobSeeker?.email || "",
          },
          resumeId: {
            _id: c.resume?._id || "",
            filename: c.resume?.fileName || "",
            originalName: c.resume?.fileName || "Resume",
          },
          status: c.status || "Shortlisted",
          applicationDate: c.applicationDate || new Date().toISOString(),
          aiMatchScore: c.aiMatchScore ?? null,
          atsScore: c.atsScore ?? null,
          shortlisted: true,
          skillsMatched: c.skillsMatched || [],
          missingSkills: c.missingSkills || [],
          aiExplanation: c.aiExplanation || "",
        }));
        setShortlistedApps(mapped);
      }
    } catch {
      // silent
    }
  };

  const slaBreached = (app: Application) => {
    const days = (Date.now() - new Date(app.applicationDate).getTime()) / (1000 * 60 * 60 * 24);
    const s = (app.status || "").toLowerCase();
    return ["pending", "under review", "shortlisted", "interview scheduled"].includes(s) && days > 7;
  };

  const runAutoScreen = async () => {
    try {
      setAutoScreenRunning(true);
      const res = await fetch(`/api/job-descriptions/${jobId}/auto-screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 100, shortlistThreshold: 70, minAtsScore: 60 }),
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: "Auto-screen complete", description: `Processed ${data.processed}/${data.total}. Shortlisted ${data.shortlisted}.` });
        await fetchCandidates();
        await fetchShortlisted();
      } else {
        const err = await res.json().catch(() => ({ message: "Failed to auto-screen" }));
        toast({ title: "Auto-screen failed", description: err.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not run auto-screen.", variant: "destructive" });
    } finally {
      setAutoScreenRunning(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        toast({ title: "Status Updated", description: "Application status has been updated successfully." });
        fetchCandidates();
      } else {
        const errorData = await response.json();
        toast({ title: "Update Failed", description: errorData.message || "Failed to update status.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    }
  };

  const handleAssignTest = async (applicationId: string, testId: string) => {
    if (!testId) {
      toast({ title: "Select a test", description: "Please choose a test to assign.", variant: "destructive" });
      return;
    }
    try {
      const roundStage = roundSelections[applicationId] || "coding_round";
      const roundLabelMap: Record<string, string> = {
        coding_round: "Coding Test",
        mcq_round: "MCQ/CS Test",
        advanced_round: "Advanced Test",
        tech_round_1: "Tech Round 1",
        tech_round_2: "Tech Round 2",
        tech_round_3: "Tech Round 3",
        hr_round: "HR/Behaviour Round",
        test_round: "Test Round",
      };
      const roundName = roundLabelMap[roundStage] || "Test Round";

      const response = await fetch("/api/tests/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, testId, roundStage, roundName }),
      });

      if (response.ok) {
        toast({ title: "Test Assigned", description: "Test has been assigned to the candidate successfully." });
        fetchCandidates();
      } else {
        const errorData = await response.json();
        toast({ title: "Assignment Failed", description: errorData.message || "Failed to assign test.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Test Assigned": return "outline";
      case "Test Passed": return "default";
      case "Test Failed": return "destructive";
      case "Hired": return "default";
      case "Rejected": return "destructive";
      default: return "secondary";
    }
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading candidates...</p>
      </div>
    );
  }

  const source = viewMode === "shortlisted" ? shortlistedApps : applications;
  const filtered = source.filter((a) => {
    const statusOk = filterStatus === "all" || a.status === filterStatus;
    const answersOk =
      filterAnswers === "all" ||
      (filterAnswers === "with" && (a.screeningAnswers?.length || 0) > 0) ||
      (filterAnswers === "without" && (a.screeningAnswers?.length || 0) === 0);
    return statusOk && answersOk;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Candidates for: {jobTitle}</h1>
        <p className="text-muted-foreground mt-2">Manage applications and assign tests to candidates</p>
      </div>

      {/* Actions & Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button onClick={runAutoScreen} disabled={autoScreenRunning}>
          {autoScreenRunning ? (
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Running...</span>
          ) : "Run AI Auto-Screen"}
        </Button>
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="View" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">Mode: {jobMode || "-"}</div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Under Review">Under Review</SelectItem>
            <SelectItem value="Shortlisted">Shortlisted</SelectItem>
            <SelectItem value="Test Assigned">Test Assigned</SelectItem>
            <SelectItem value="Interview Scheduled">Interview Scheduled</SelectItem>
            <SelectItem value="Hired">Hired</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAnswers} onValueChange={setFilterAnswers}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Screening Answers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="with">With Answers</SelectItem>
            <SelectItem value="without">Without Answers</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          Showing {filtered.length} of {viewMode === "shortlisted" ? shortlistedApps.length : applications.length}
        </div>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No applications received for this job yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((application) => {
            const effectiveScore = application.testScore ?? application.score;
            const effectiveCompletedAt = application.testCompletedAt ?? application.completedAt;
            const assignedTestId = testSelections[application._id] || tests[0]?._id || "";

            return (
              <Card key={application._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {application.jobSeekerId?.name || "Candidate"}
                      </CardTitle>
                      <CardDescription>{application.jobSeekerId?.email || "-"}</CardDescription>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Applied: {format(new Date(application.applicationDate), "MMM dd, yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <Badge variant={getStatusColor(application.status) as any}>{application.status}</Badge>
                      {slaBreached(application) && <Badge variant="destructive">SLA</Badge>}
                      {/* Test score badge */}
                      {effectiveScore != null && (
                        <Badge className={getScoreBadgeClass(effectiveScore)}>
                          <Trophy className="h-3 w-3 mr-1" />
                          Score: {effectiveScore}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* AI scores */}
                  {(application.aiMatchScore != null || application.atsScore != null) && (
                    <div className="flex items-center gap-4 flex-wrap">
                      {application.aiMatchScore != null && (
                        <div className="flex items-center gap-2">
                          <ScoreRing value={application.aiMatchScore} size={52} stroke={5} sublabel="AI Match" />
                        </div>
                      )}
                      {application.atsScore != null && (
                        <div className="flex items-center gap-2">
                          <ScoreRing value={application.atsScore} size={52} stroke={5} sublabel="ATS" />
                        </div>
                      )}
                      {application.skillsMatched && application.skillsMatched.length > 0 && (
                        <div className="flex-1 min-w-[140px] max-w-[220px]">
                          <SkillBar label={`${application.skillsMatched.length} skills matched`} value={Math.min(100, application.skillsMatched.length * 10)} color="#7c3aed" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stage & rounds */}
                  <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Current stage:</span>{" "}
                      {formatStageLabel(application.currentStage)}
                    </div>
                    {application.rounds && application.rounds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {application.rounds.map((r, idx) => (
                          <Badge
                            key={r.stageKey || idx}
                            variant={
                              r.status === "passed" ? "secondary"
                              : r.status === "failed" ? "destructive"
                              : "outline"
                            }
                            className="text-[10px] uppercase tracking-wide"
                          >
                            {r.roundName || formatStageLabel(r.stageKey)}
                            {r.status ? ` • ${r.status}` : ""}
                            {typeof r.latestScore === "number" && ` • ${r.latestScore}%`}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {/* Test completion info */}
                    {effectiveCompletedAt && (
                      <div className="text-[11px] text-green-700 font-medium">
                        Test completed: {format(new Date(effectiveCompletedAt), "MMM dd, yyyy HH:mm")}
                      </div>
                    )}
                    <div className="text-[11px] text-muted-foreground/80">
                      Flow: Application → HR Shortlisting → Tests → Tech Rounds → HR → Offer.
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      Resume: {application.resumeId?.originalName || "Resume"}
                    </div>
                    {application.testId && (
                      <div className="flex items-center gap-1">
                        <TestTube className="h-4 w-4" />
                        Test: {application.testId.title}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {/* Pipeline stage selector */}
                    <Select
                      value={application.currentStage || "application"}
                      onValueChange={(value) => handleStageUpdate(application._id, value)}
                    >
                      <SelectTrigger className="w-40 text-xs">
                        <SelectValue placeholder="Move to stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="application">Application Submitted</SelectItem>
                        <SelectItem value="hr_shortlist">HR Shortlisting</SelectItem>
                        <SelectItem value="coding_round">Coding Test</SelectItem>
                        <SelectItem value="mcq_round">MCQ/CS Test</SelectItem>
                        <SelectItem value="advanced_round">Advanced Test</SelectItem>
                        <SelectItem value="tech_round_1">Tech Round 1</SelectItem>
                        <SelectItem value="tech_round_2">Tech Round 2</SelectItem>
                        <SelectItem value="tech_round_3">Tech Round 3</SelectItem>
                        <SelectItem value="hr_round">HR/Behaviour Round</SelectItem>
                        <SelectItem value="offer">Final Offer</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Round selector */}
                    <Select
                      value={roundSelections[application._id] || "coding_round"}
                      onValueChange={(value) =>
                        setRoundSelections((prev) => ({ ...prev, [application._id]: value }))
                      }
                    >
                      <SelectTrigger className="w-36 text-xs">
                        <SelectValue placeholder="Round" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coding_round">Coding Test</SelectItem>
                        <SelectItem value="mcq_round">MCQ/CS Test</SelectItem>
                        <SelectItem value="advanced_round">Advanced Test</SelectItem>
                        <SelectItem value="tech_round_1">Tech Round 1</SelectItem>
                        <SelectItem value="tech_round_2">Tech Round 2</SelectItem>
                        <SelectItem value="tech_round_3">Tech Round 3</SelectItem>
                        <SelectItem value="hr_round">HR Round</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Per-candidate test picker */}
                    {tests.length > 0 && (
                      <Select
                        value={testSelections[application._id] || tests[0]?._id || ""}
                        onValueChange={(value) =>
                          setTestSelections((prev) => ({ ...prev, [application._id]: value }))
                        }
                      >
                        <SelectTrigger className="w-44 text-xs">
                          <SelectValue placeholder="Select test" />
                        </SelectTrigger>
                        <SelectContent>
                          {tests.map((t: any) => (
                            <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    <Button
                      size="sm"
                      onClick={() => handleAssignTest(application._id, assignedTestId)}
                      disabled={!tests.length}
                    >
                      <TestTube className="h-4 w-4 mr-1" />
                      Assign Test
                    </Button>

                    {/* View test results if test was assigned */}
                    {application.testId?._id && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/recruiter/tests/${application.testId._id}/results`}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Results
                        </Link>
                      </Button>
                    )}

                    {/* Shortlist / Reject actions */}
                    {!["Hired", "Rejected", "Shortlisted"].includes(application.status) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-700 hover:bg-green-50"
                          onClick={() => handleStatusUpdate(application._id, "Shortlisted")}
                        >
                          Shortlist
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-400 text-red-600 hover:bg-red-50"
                          onClick={() => handleStatusUpdate(application._id, "Rejected")}
                        >
                          Reject
                        </Button>
                      </>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelected(application); setOpenWhy(true); }}
                    >
                      Why matched
                    </Button>

                    <Link
                      href={`/dashboard/job-seeker/profile/${application.jobSeekerId?._id}`}
                      className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
                    >
                      View Profile
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Why matched dialog */}
      <Dialog open={openWhy} onOpenChange={setOpenWhy}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why matched</DialogTitle>
            <DialogDescription>{selected?.jobSeekerId?.name} for this role</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(selected?.skillsMatched || []).map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
            {selected?.missingSkills && selected.missingSkills.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-1">Missing skills</div>
                <div className="flex flex-wrap gap-2">
                  {selected.missingSkills.map((s) => (
                    <Badge key={s} variant="outline">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-6 items-center">
              {selected?.aiMatchScore != null && (
                <ScoreRing value={selected.aiMatchScore} size={64} stroke={6} sublabel="AI Match" />
              )}
              {selected?.atsScore != null && (
                <ScoreRing value={selected.atsScore} size={64} stroke={6} sublabel="ATS Score" />
              )}
            </div>
            {selected?.aiExplanation && (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.aiExplanation}</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
