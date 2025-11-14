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
import { Loader2, User, FileText, Calendar, TestTube } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { format } from "date-fns";

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
  status: string;
  applicationDate: string;
  testScore?: number;
  testCompletedAt?: string;
  screeningAnswers?: { question: string; answer: string }[];
  applicationProfile?: {
    experienceLevel?: string;
    expectedSalary?: string;
    location?: string;
    skills?: string[];
  };
  // AI fields (optional)
  aiMatchScore?: number | null;
  atsScore?: number | null;
  shortlisted?: boolean;
  skillsMatched?: string[];
  missingSkills?: string[];
  aiExplanation?: string;
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
  const [open, setOpen] = useState(false);
  const [openWhy, setOpenWhy] = useState(false);
  const [jobMode, setJobMode] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAnswers, setFilterAnswers] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"all" | "shortlisted">("all");
  const [shortlistedApps, setShortlistedApps] = useState<Application[]>([]);
  const [autoScreenRunning, setAutoScreenRunning] = useState(false);

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
        // Normalize potential variations in backend data shape
        const normalized: Application[] = (data.applications || []).map((a: any) => {
          const js = a.jobSeekerId;
          const jobSeekerObj = js && typeof js === "object"
            ? js
            : { _id: js || "", name: a.candidateName || "Candidate", email: a.candidateEmail || "" };
          const res = a.resumeId;
          const resumeObj = res && typeof res === "object"
            ? res
            : { _id: res || "", filename: a.resumeFilename || "", originalName: a.resumeOriginalName || "Resume" };
          return { ...a, jobSeekerId: jobSeekerObj, resumeId: resumeObj } as Application;
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
      console.error("Error fetching candidates:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to fetch candidates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const response = await fetch("/api/tests/my-tests");
      if (response.ok) {
        const data = await response.json();
        setTests(data);
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
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
    } catch (e) {
      console.error("Shortlisted fetch error", e);
    }
  };

  // Helpers
  const slaBreached = (app: Application) => {
    const days = (Date.now() - new Date(app.applicationDate).getTime()) / (1000 * 60 * 60 * 24);
    const s = (app.status || '').toLowerCase();
    const pendingish = ["pending", "under review", "shortlisted", "interview scheduled"].includes(s);
    return pendingish && days > 7;
  };

  const handleWhyMatched = (app: Application) => {
    setSelected(app);
    setOpenWhy(true);
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
        toast({
          title: "Auto-screen complete",
          description: `Processed ${data.processed}/${data.total}. Shortlisted ${data.shortlisted}.`,
        });
        await fetchCandidates();
        await fetchShortlisted();
      } else {
        const err = await res.json().catch(() => ({ message: "Failed to auto-screen" }));
        toast({ title: "Auto-screen failed", description: err.message, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Network error", description: "Could not run auto-screen.", variant: "destructive" });
    } finally {
      setAutoScreenRunning(false);
    }
  };

  const handleStatusUpdate = async (
    applicationId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: "Status Updated",
          description: "Application status has been updated successfully.",
        });
        fetchCandidates(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Update Failed",
          description: errorData.message || "Failed to update status.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Status update error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAssignTest = async (applicationId: string, testId: string) => {
    try {
      const response = await fetch("/api/tests/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ applicationId, testId }),
      });

      if (response.ok) {
        toast({
          title: "Test Assigned",
          description: "Test has been assigned to the candidate successfully.",
        });
        fetchCandidates(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Assignment Failed",
          description: errorData.message || "Failed to assign test.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Test assignment error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "secondary";
      case "Under Review":
        return "default";
      case "Shortlisted":
        return "default";
      case "Test Assigned":
        return "outline";
      case "Test Passed":
        return "default";
      case "Test Failed":
        return "destructive";
      case "Interview Scheduled":
        return "default";
      case "Hired":
        return "default";
      case "Rejected":
        return "destructive";
      default:
        return "secondary";
    }
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

  const exportJSON = () => {
    if (!selected) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `application_${selected._id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!selected) return;
    const rows: string[] = [];
    rows.push("Field,Value");
    rows.push(`Candidate,${selected.jobSeekerId?.name || ""}`);
    rows.push(`Email,${selected.jobSeekerId?.email || ""}`);
    if (selected.applicationProfile) {
      rows.push(`Experience Level,${selected.applicationProfile.experienceLevel || ""}`);
      rows.push(`Expected Salary,${selected.applicationProfile.expectedSalary || ""}`);
      rows.push(`Location,${selected.applicationProfile.location || ""}`);
      rows.push(`Skills,${(selected.applicationProfile.skills || []).join("; ")}`);
    }
    (selected.screeningAnswers || []).forEach((qa, i) => {
      const q = qa.question.replaceAll(",", " ");
      const v = (qa.answer || "").replaceAll(",", " ").replaceAll("\n", " ");
      rows.push(`Q${i + 1} ${q},${v}`);
    });
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `application_${selected._id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Running Auto-Screen...</span>
          ) : (
            "Run AI Auto-Screen"
          )}
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
        <div className="text-xs text-muted-foreground">Showing {filtered.length} of {(viewMode === "shortlisted" ? shortlistedApps.length : applications.length)}</div>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No applications received for this job yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((application) => (
            <Card key={application._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {application.jobSeekerId?.name || "Candidate"}
                    </CardTitle>
                    <CardDescription>{application.jobSeekerId?.email || "-"}</CardDescription>
                    <div className="mt-1 text-sm text-muted-foreground">Applied: {format(new Date(application.applicationDate), "MMM dd, yyyy")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(application.status)}>{application.status}</Badge>
                    {slaBreached(application) && <Badge variant="destructive">SLA</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(application.aiMatchScore != null || application.atsScore != null) && (
                  <div className="flex items-center gap-2">
                    {application.aiMatchScore != null && (<Badge variant="secondary">AI Match: {application.aiMatchScore}%</Badge>)}
                    {application.atsScore != null && (<Badge variant="outline">ATS: {application.atsScore}%</Badge>)}
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1"><FileText className="h-4 w-4" /> Resume: {application.resumeId?.originalName || "Resume"}</div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleWhyMatched(application)}>Why matched</Button>
                  <Button size="sm" onClick={() => { if (tests.length) handleAssignTest(application._id, tests[0]._id); }} disabled={!tests.length}>Assign Test</Button>
                  <Link href={`/dashboard/job-seeker/profile/${application.jobSeekerId?._id}`} className="text-sm">View Profile</Link>
                </div>
              </CardContent>
            </Card>
          ))}
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
              {(selected?.skillsMatched || []).map((s) => (<Badge key={s} variant="secondary">{s}</Badge>))}
            </div>
            {selected?.missingSkills && selected.missingSkills.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-1">Missing skills</div>
                <div className="flex flex-wrap gap-2">
                  {selected.missingSkills.map((s) => (<Badge key={s} variant="outline">{s}</Badge>))}
                </div>
              </div>
            )}
            <div className="flex gap-4 text-sm">
              {selected?.aiMatchScore != null && (<Badge variant="secondary">AI Match: {selected.aiMatchScore}%</Badge>)}
              {selected?.atsScore != null && (<Badge variant="outline">ATS: {selected.atsScore}%</Badge>)}
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
