"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { SkillBar as ProgressBar } from "@/components/ui/charts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Brain, Target, TrendingUp, AlertCircle, CheckCircle, XCircle,
  Zap, History, Users, BarChart3, Clipboard, Trash2, ChevronRight,
  Play, Settings, Download, Copy, RefreshCw, Plus, Minus,
  ThumbsUp, ThumbsDown, Minus as Minus2, Star, Award, Clock,
  FileText, ArrowUpRight, ChevronDown, ChevronUp, Sparkles, Filter,
  Upload, File, X, Briefcase as BriefcaseIcon,
} from "lucide-react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScreeningResult {
  score: number;
  atsScore?: number;
  strengths: string[];
  weaknesses: string[];
  skillsMatch: string[];
  missingSkills?: string[];
  experienceMatch: string;
  recommendations: string[];
}

interface Job {
  _id: string;
  title: string;
  applicationCount?: number;
  pendingCount?: number;
  isActive?: boolean;
}

interface BulkResult {
  jobId: string;
  total: number;
  processed: number;
  shortlisted: number;
  rejected: number;
  dryRun: boolean;
  preview: Array<{
    candidateName: string;
    aiMatchScore: number;
    atsScore: number;
    status: string;
    skillsMatched: string[];
  }>;
}

interface CompareSlot {
  id: string;
  label: string;
  resumeText: string;
  result: ScreeningResult | null;
  loading: boolean;
}

interface HistoryEntry {
  id: string;
  date: string;
  label: string;
  score: number;
  atsScore: number;
  verdict: string;
  skillsMatched: number;
  jobTitle: string;
}

type TabId = "quick" | "bulk" | "compare" | "history";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getVerdict(score: number): { label: string; color: string; bg: string; icon: React.ReactNode } {
  if (score >= 85) return { label: "Strong Hire", color: "text-emerald-700", bg: "bg-emerald-100", icon: <ThumbsUp className="h-4 w-4" /> };
  if (score >= 70) return { label: "Hire", color: "text-blue-700", bg: "bg-blue-100", icon: <CheckCircle className="h-4 w-4" /> };
  if (score >= 55) return { label: "Maybe", color: "text-amber-700", bg: "bg-amber-100", icon: <Minus2 className="h-4 w-4" /> };
  return { label: "Pass", color: "text-rose-700", bg: "bg-rose-100", icon: <ThumbsDown className="h-4 w-4" /> };
}

function getScoreGradient(score: number) {
  if (score >= 80) return "from-emerald-500 to-green-400";
  if (score >= 60) return "from-amber-500 to-yellow-400";
  return "from-rose-500 to-red-400";
}

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100);
  const dash = (pct / 100) * circ * 0.75;
  const gap = circ - dash;
  const rotate = -225;

  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#f43f5e";

  return (
    <svg width={size} height={size * 0.85} viewBox="0 0 100 85">
      <circle cx="50" cy="56" r={r} fill="none" stroke="#e5e7eb" strokeWidth="9"
        strokeDasharray={`${circ * 0.75} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${rotate} 50 56)`}
      />
      <circle cx="50" cy="56" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeDasharray={`${dash} ${gap + circ * 0.25}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${rotate} 50 56)`}
        style={{ transition: "stroke-dasharray 0.8s ease" }}
      />
      <text x="50" y="60" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{pct}</text>
      <text x="50" y="72" textAnchor="middle" fontSize="7" fill="#9ca3af">/ 100</text>
    </svg>
  );
}

function SkillBar({ skill, matched }: { skill: string; matched: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
      matched ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-600 border border-rose-200"
    }`}>
      {matched ? <CheckCircle className="h-3 w-3 shrink-0" /> : <XCircle className="h-3 w-3 shrink-0" />}
      {skill}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIScreeningPage() {
  const [tab, setTab] = useState<TabId>("quick");
  const { toast } = useToast();

  // ── Quick Screen state
  const [resumeText, setResumeText] = useState("");
  const [jobRequirements, setJobRequirements] = useState("");
  const [skills, setSkills] = useState("");
  const [candidateLabel, setCandidateLabel] = useState("");
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [showFullReport, setShowFullReport] = useState(false);

  // ── Resume + JD input modes
  const [resumeInputMode, setResumeInputMode] = useState<"paste" | "upload">("paste");
  const [jdInputMode, setJdInputMode] = useState<"paste" | "select">("paste");
  const [resumeFileName, setResumeFileName] = useState("");
  const [uploadingResume, setUploadingResume] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedQuickJobId, setSelectedQuickJobId] = useState("");
  const resumeFileRef = useRef<HTMLInputElement>(null);

  // ── Bulk Screen state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [bulkThreshold, setBulkThreshold] = useState(70);
  const [bulkMinAts, setBulkMinAts] = useState(60);
  const [bulkDryRun, setBulkDryRun] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // ── Compare state
  const [compareJD, setCompareJD] = useState("");
  const [compareSkills, setCompareSkills] = useState("");
  const [compareJdMode, setCompareJdMode] = useState<"paste" | "select">("paste");
  const [compareSelectedJobId, setCompareSelectedJobId] = useState("");
  const [slots, setSlots] = useState<CompareSlot[]>([
    { id: "1", label: "Candidate A", resumeText: "", result: null, loading: false },
    { id: "2", label: "Candidate B", resumeText: "", result: null, loading: false },
  ]);
  const [compareRunning, setCompareRunning] = useState(false);

  // ── History state
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historySearch, setHistorySearch] = useState("");

  // ── Load jobs for bulk tab
  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await fetch("/api/job-descriptions/my-jobs", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setJobs((data.jobDescriptions || []).filter((j: Job) => j.isActive !== false));
      }
    } catch { /* ignore */ } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    const stored = localStorage.getItem("ai_screening_history");
    if (stored) {
      try { setHistory(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, [fetchJobs]);

  const saveToHistory = (entry: HistoryEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, 50);
      localStorage.setItem("ai_screening_history", JSON.stringify(next));
      return next;
    });
  };

  // ── Resume file upload (extracts text via API, no DB save)
  const handleResumeFile = useCallback(async (file: File) => {
    if (!file) return;
    setUploadingResume(true);
    setResumeFileName(file.name);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const res = await fetch("/api/ai/parse-resume", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not parse file");
      setResumeText(data.text);
      toast({ title: "Resume parsed", description: `${data.charCount.toLocaleString()} characters extracted from "${file.name}"` });
    } catch (e: any) {
      toast({ title: "Parse failed", description: e.message || "Could not extract text. Try pasting instead.", variant: "destructive" });
      setResumeFileName("");
    } finally {
      setUploadingResume(false);
    }
  }, [toast]);

  // ── Slot file upload for compare tab
  const handleSlotFile = useCallback(async (slotId: string, file: File) => {
    setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, loading: true } : s));
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const res = await fetch("/api/ai/parse-resume", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Could not parse file");
      setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, resumeText: data.text, label: file.name.replace(/\.[^.]+$/, ""), loading: false } : s));
      toast({ title: "Resume loaded", description: `"${file.name}" ready for comparison` });
    } catch (e: any) {
      toast({ title: "Parse failed", description: e.message, variant: "destructive" });
      setSlots((prev) => prev.map((s) => s.id === slotId ? { ...s, loading: false } : s));
    }
  }, [toast]);

  // ── Select job → populate JD text
  const handleSelectJobForJD = useCallback(async (jobId: string, setter: (t: string) => void, skillSetter?: (t: string) => void) => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/job-descriptions/${jobId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const job = data.job || data;
      const text = [
        job.title,
        job.description,
        job.requirements?.length ? `Requirements:\n${job.requirements.map((r: string) => `- ${r}`).join("\n")}` : "",
        job.responsibilities?.length ? `Responsibilities:\n${job.responsibilities.map((r: string) => `- ${r}`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n");
      setter(text);
      if (skillSetter && (job.skillsRequired || job.skills)?.length) {
        skillSetter((job.skillsRequired || job.skills || []).join(", "));
      }
    } catch {
      toast({ title: "Could not load job", variant: "destructive" });
    }
  }, [toast]);

  // ── Quick Screen
  const handleQuickScreen = async () => {
    if (!resumeText.trim() || !jobRequirements.trim()) {
      toast({ title: "Missing fields", description: "Please enter resume text and job requirements.", variant: "destructive" });
      return;
    }
    setLoadingQuick(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/resume-screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobRequirements,
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error();
      const data: ScreeningResult = await res.json();
      setResult(data);
      const verdict = getVerdict(data.score);
      saveToHistory({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        label: candidateLabel || "Unnamed Candidate",
        score: data.score,
        atsScore: data.atsScore || 0,
        verdict: verdict.label,
        skillsMatched: data.skillsMatch?.length || 0,
        jobTitle: jobRequirements.slice(0, 60) + "...",
      });
      toast({ title: "Analysis complete", description: `Score: ${data.score}% — ${verdict.label}` });
    } catch {
      toast({ title: "Analysis failed", description: "Could not analyze resume. Try again.", variant: "destructive" });
    } finally {
      setLoadingQuick(false);
    }
  };

  const copyReport = () => {
    if (!result) return;
    const verdict = getVerdict(result.score);
    const text = [
      `AI SCREENING REPORT — ${candidateLabel || "Candidate"}`,
      `Date: ${new Date().toLocaleDateString()}`,
      ``,
      `OVERALL SCORE: ${result.score}/100 (${verdict.label})`,
      `ATS SCORE: ${result.atsScore || "N/A"}/100`,
      `EXPERIENCE: ${result.experienceMatch}`,
      ``,
      `MATCHED SKILLS: ${result.skillsMatch.join(", ")}`,
      result.missingSkills?.length ? `MISSING SKILLS: ${result.missingSkills.join(", ")}` : "",
      ``,
      `STRENGTHS:`,
      ...result.strengths.map((s) => `  • ${s}`),
      ``,
      `AREAS OF CONCERN:`,
      ...result.weaknesses.map((w) => `  • ${w}`),
      ``,
      `RECOMMENDATIONS:`,
      ...result.recommendations.map((r) => `  • ${r}`),
    ].filter((l) => l !== undefined).join("\n");

    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Report copied", description: "Full report copied to clipboard." });
    });
  };

  // ── Bulk Screen
  const handleBulkScreen = async () => {
    if (!selectedJobId) {
      toast({ title: "Select a job", description: "Choose a job to run bulk screening.", variant: "destructive" });
      return;
    }
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch(`/api/job-descriptions/${selectedJobId}/auto-screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchSize: 100,
          shortlistThreshold: bulkThreshold,
          minAtsScore: bulkMinAts,
          dryRun: bulkDryRun,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Bulk screening failed");
      }
      const data: BulkResult = await res.json();
      setBulkResult(data);
      toast({
        title: bulkDryRun ? "Dry run complete" : "Bulk screening complete",
        description: `Processed ${data.processed} candidates — ${data.shortlisted} shortlisted, ${data.rejected} rejected.`,
      });
    } catch (e: any) {
      toast({ title: "Bulk screening failed", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Compare Resumes
  const addSlot = () => {
    if (slots.length >= 4) return;
    const labels = ["Candidate A", "Candidate B", "Candidate C", "Candidate D"];
    setSlots((prev) => [...prev, { id: Date.now().toString(), label: labels[prev.length] || `Candidate ${prev.length + 1}`, resumeText: "", result: null, loading: false }]);
  };

  const removeSlot = (id: string) => {
    if (slots.length <= 2) return;
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSlot = (id: string, field: "resumeText" | "label", value: string) => {
    setSlots((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleCompare = async () => {
    if (!compareJD.trim()) {
      toast({ title: "Missing job description", variant: "destructive" });
      return;
    }
    if (slots.every((s) => !s.resumeText.trim())) {
      toast({ title: "Add at least one resume", variant: "destructive" });
      return;
    }
    setCompareRunning(true);
    setSlots((prev) => prev.map((s) => ({ ...s, result: null, loading: !!s.resumeText.trim() })));

    const skillArr = compareSkills.split(",").map((s) => s.trim()).filter(Boolean);

    const results = await Promise.allSettled(
      slots.map(async (slot) => {
        if (!slot.resumeText.trim()) return { id: slot.id, result: null };
        const res = await fetch("/api/ai/resume-screening", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText: slot.resumeText, jobRequirements: compareJD, skills: skillArr }),
        });
        if (!res.ok) throw new Error();
        const data: ScreeningResult = await res.json();
        return { id: slot.id, result: data };
      })
    );

    setSlots((prev) => prev.map((slot) => {
      const match = results.find((r) => r.status === "fulfilled" && (r.value as any)?.id === slot.id);
      if (match && match.status === "fulfilled") {
        return { ...slot, result: (match.value as any).result, loading: false };
      }
      return { ...slot, loading: false };
    }));

    setCompareRunning(false);
    toast({ title: "Comparison complete", description: "All resumes have been analyzed and ranked." });
  };

  const sortedSlots = [...slots]
    .filter((s) => s.result !== null)
    .sort((a, b) => (b.result?.score || 0) - (a.result?.score || 0));

  // ── History
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("ai_screening_history");
    toast({ title: "History cleared" });
  };

  const deleteHistoryEntry = (id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      localStorage.setItem("ai_screening_history", JSON.stringify(next));
      return next;
    });
  };

  const filteredHistory = history.filter(
    (e) => !historySearch || e.label.toLowerCase().includes(historySearch.toLowerCase()) || e.verdict.toLowerCase().includes(historySearch.toLowerCase())
  );

  const historyStats = {
    total: history.length,
    avgScore: history.length ? Math.round(history.reduce((s, e) => s + e.score, 0) / history.length) : 0,
    hires: history.filter((e) => e.verdict === "Strong Hire" || e.verdict === "Hire").length,
  };

  // ─── Tab Nav ──────────────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "quick", label: "Quick Screen", icon: <Brain className="h-4 w-4" />, desc: "Single resume analysis" },
    { id: "bulk", label: "Bulk Screen", icon: <Zap className="h-4 w-4" />, desc: "Screen all applicants" },
    { id: "compare", label: "Compare", icon: <BarChart3 className="h-4 w-4" />, desc: "Rank multiple resumes" },
    { id: "history", label: "History", icon: <History className="h-4 w-4" />, desc: `${history.length} saved` },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/dashboard/recruiter" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">AI Screening</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Brain className="h-5 w-5 text-white" />
            </div>
            AI Resume Screening
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Screen, rank, and shortlist candidates with AI-powered analysis
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/dashboard/recruiter/job-descriptions">
            <Briefcase className="mr-2 h-3.5 w-3.5" />
            View Jobs
          </Link>
        </Button>
      </div>

      {/* ── Stats Banner ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Screened Today", value: history.filter((e) => new Date(e.date).toDateString() === new Date().toDateString()).length, icon: <Sparkles className="h-4 w-4 text-violet-500" />, color: "text-violet-700", bg: "bg-violet-50" },
          { label: "Total Screened", value: historyStats.total, icon: <FileText className="h-4 w-4 text-blue-500" />, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Avg Score", value: historyStats.avgScore ? `${historyStats.avgScore}%` : "—", icon: <Star className="h-4 w-4 text-amber-500" />, color: "text-amber-700", bg: "bg-amber-50" },
          { label: "Hire Decisions", value: historyStats.hires, icon: <Award className="h-4 w-4 text-emerald-500" />, color: "text-emerald-700", bg: "bg-emerald-50" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>{s.icon}</div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-full">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.id === "history" && history.length > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-medium ${tab === "history" ? "bg-violet-100 text-violet-700" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                {history.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          TAB 1 — QUICK SCREEN
      ════════════════════════════════════════════ */}
      {tab === "quick" && (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* LEFT: Input Form */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-500" />
                  Candidate Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Candidate name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Candidate Name / Label</Label>
                  <Input
                    value={candidateLabel}
                    onChange={(e) => setCandidateLabel(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="text-sm h-8"
                  />
                </div>

                {/* Resume — toggle paste / upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resume</Label>
                    <div className="flex gap-0.5 p-0.5 bg-muted rounded-md">
                      {(["paste", "upload"] as const).map((m) => (
                        <button key={m} type="button" onClick={() => setResumeInputMode(m)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all capitalize ${resumeInputMode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
                          {m === "upload" ? "Upload File" : "Paste Text"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {resumeInputMode === "paste" && (
                    <>
                      <Textarea
                        value={resumeText}
                        onChange={(e) => setResumeText(e.target.value)}
                        placeholder="Paste candidate's resume here..."
                        className="min-h-[140px] text-sm resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2"
                            onClick={() => setResumeText("Experienced Full-Stack Developer with 5+ years. Expert in React, TypeScript, Node.js, GraphQL, PostgreSQL, Redis, and AWS. Led team delivering payments platform handling 100k tx/day. Strong problem-solver with proven leadership.")}>
                            Load Example
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => { setResumeText(""); setResumeFileName(""); }}>Clear</Button>
                        </div>
                        {resumeText.length > 0 && <span className="text-xs text-muted-foreground">{resumeText.length} chars</span>}
                      </div>
                    </>
                  )}

                  {resumeInputMode === "upload" && (
                    <>
                      <input
                        ref={resumeFileRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleResumeFile(f); e.target.value = ""; }}
                      />
                      <div
                        onClick={() => !uploadingResume && resumeFileRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleResumeFile(f); }}
                        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all py-7 px-4 text-center
                          ${dragOver ? "border-violet-400 bg-violet-50" : "border-muted-foreground/25 hover:border-violet-300 hover:bg-violet-50/30"}
                          ${uploadingResume ? "pointer-events-none opacity-60" : ""}`}
                      >
                        {uploadingResume ? (
                          <><Loader2 className="h-7 w-7 text-violet-500 animate-spin" /><p className="text-sm font-medium">Extracting text...</p></>
                        ) : resumeFileName && resumeText ? (
                          <>
                            <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                            <p className="text-sm font-medium text-emerald-700">{resumeFileName}</p>
                            <p className="text-xs text-muted-foreground">{resumeText.length.toLocaleString()} chars extracted</p>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setResumeText(""); setResumeFileName(""); }}
                              className="absolute top-2 right-2 text-muted-foreground hover:text-rose-500">
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                              <Upload className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Drop resume here or click to browse</p>
                              <p className="text-xs text-muted-foreground mt-0.5">PDF, DOC, DOCX — max 5 MB</p>
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* JD — toggle paste / select */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Job Requirements</Label>
                    <div className="flex gap-0.5 p-0.5 bg-muted rounded-md">
                      {(["paste", "select"] as const).map((m) => (
                        <button key={m} type="button" onClick={() => setJdInputMode(m)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-all capitalize ${jdInputMode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
                          {m === "select" ? "From Job" : "Paste Text"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {jdInputMode === "paste" && (
                    <>
                      <Textarea
                        value={jobRequirements}
                        onChange={(e) => setJobRequirements(e.target.value)}
                        placeholder="Paste job description or requirements..."
                        className="min-h-[100px] text-sm resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setJobRequirements("Senior Full-Stack Engineer: React, TypeScript, Node.js, SQL, cloud infrastructure. 5+ years required. Strong communication and leadership. Experience with high-throughput systems a plus.")}>
                            Load Example
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setJobRequirements("")}>Clear</Button>
                        </div>
                        {jobRequirements.length > 0 && <span className="text-xs text-muted-foreground">{jobRequirements.length} chars</span>}
                      </div>
                    </>
                  )}

                  {jdInputMode === "select" && (
                    <div className="space-y-2">
                      {loadingJobs ? (
                        <div className="h-9 bg-muted animate-pulse rounded-md" />
                      ) : (
                        <Select
                          value={selectedQuickJobId}
                          onValueChange={(id) => {
                            setSelectedQuickJobId(id);
                            handleSelectJobForJD(id, setJobRequirements, setSkills);
                          }}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue placeholder="Pick a job to load its description..." />
                          </SelectTrigger>
                          <SelectContent>
                            {jobs.length === 0 && (
                              <SelectItem value="__none__" disabled>No active jobs found</SelectItem>
                            )}
                            {jobs.map((job) => (
                              <SelectItem key={job._id} value={job._id}>
                                <div className="flex items-center gap-2">
                                  <BriefcaseIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate">{job.title}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {jobRequirements && (
                        <div className="rounded-lg border bg-emerald-50 border-emerald-200 p-2.5 flex items-start gap-2">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-emerald-700">Job description loaded</p>
                            <p className="text-xs text-emerald-600 truncate mt-0.5">{jobRequirements.slice(0, 80)}…</p>
                          </div>
                          <button type="button" onClick={() => { setJobRequirements(""); setSelectedQuickJobId(""); setSkills(""); }}
                            className="text-emerald-400 hover:text-rose-500 ml-auto shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Skills */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Key Skills (comma-separated)</Label>
                  <Input
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="React, TypeScript, Node.js, AWS..."
                    className="text-sm h-8"
                  />
                </div>

                <Button
                  onClick={handleQuickScreen}
                  disabled={loadingQuick}
                  className="w-full bg-violet-600 hover:bg-violet-700"
                >
                  {loadingQuick ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</>
                  ) : (
                    <><Brain className="mr-2 h-4 w-4" />Analyze Resume</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Results */}
          <div className="lg:col-span-3 space-y-4">
            {!result && !loadingQuick && (
              <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                  <Brain className="h-8 w-8 text-violet-300" />
                </div>
                <p className="font-semibold text-muted-foreground">Ready to analyze</p>
                <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                  Paste a resume and job requirements, then click Analyze Resume to get AI-powered insights
                </p>
              </div>
            )}

            {loadingQuick && (
              <div className="rounded-2xl border border-muted flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4 animate-pulse">
                  <Brain className="h-8 w-8 text-violet-500" />
                </div>
                <p className="font-semibold">Analyzing resume...</p>
                <p className="text-sm text-muted-foreground mt-1">AI is evaluating skills, experience, and fit</p>
              </div>
            )}

            {result && !loadingQuick && (
              <>
                {/* Score Card */}
                <Card className="border shadow-sm overflow-hidden">
                  <div className={`h-1.5 w-full bg-gradient-to-r ${getScoreGradient(result.score)}`} />
                  <CardContent className="p-5">
                    <div className="flex items-center gap-6">
                      {/* Gauge */}
                      <div className="shrink-0">
                        <ScoreGauge score={result.score} size={110} />
                      </div>

                      {/* Score details */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-lg">{candidateLabel || "Candidate"}</p>
                          {(() => {
                            const v = getVerdict(result.score);
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${v.bg} ${v.color}`}>
                                {v.icon}{v.label}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-muted/50 p-2.5">
                            <p className="text-xs text-muted-foreground">AI Match Score</p>
                            <p className="text-xl font-bold text-violet-700">{result.score}<span className="text-sm font-normal">%</span></p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2.5">
                            <p className="text-xs text-muted-foreground">ATS Score</p>
                            <p className="text-xl font-bold text-blue-700">{result.atsScore ?? "—"}<span className="text-sm font-normal">{result.atsScore !== undefined ? "%" : ""}</span></p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-2.5 col-span-2">
                            <p className="text-xs text-muted-foreground">Experience Match</p>
                            <p className="text-sm font-medium mt-0.5">{result.experienceMatch}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Score bars */}
                    <div className="mt-4 space-y-2">
                      <ProgressBar label="AI Match" value={result.score} color={result.score >= 70 ? "#10b981" : result.score >= 50 ? "#f59e0b" : "#ef4444"} />
                      {result.atsScore !== undefined && (
                        <ProgressBar label="ATS Score" value={result.atsScore} color={result.atsScore >= 70 ? "#10b981" : result.atsScore >= 50 ? "#f59e0b" : "#ef4444"} />
                      )}
                    </div>

                    {/* Copy + Expand */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={copyReport}>
                        <Copy className="mr-1.5 h-3 w-3" />Copy Report
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setShowFullReport(!showFullReport)}>
                        {showFullReport ? <ChevronUp className="mr-1.5 h-3 w-3" /> : <ChevronDown className="mr-1.5 h-3 w-3" />}
                        {showFullReport ? "Collapse" : "Full Report"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setResult(null)} title="Clear results">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Skills breakdown */}
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4 text-violet-500" />
                      Skills Analysis
                      <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-0 text-xs">
                        {result.skillsMatch.length} matched
                      </Badge>
                      {(result.missingSkills?.length || 0) > 0 && (
                        <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">
                          {result.missingSkills!.length} missing
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.skillsMatch.map((s, i) => <SkillBar key={`m${i}`} skill={s} matched />)}
                      {result.missingSkills?.map((s, i) => <SkillBar key={`x${i}`} skill={s} matched={false} />)}
                      {result.skillsMatch.length === 0 && !result.missingSkills?.length && (
                        <p className="text-sm text-muted-foreground">No skills data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Full analysis (expandable) */}
                {showFullReport && (
                  <Card className="border shadow-sm">
                    <CardContent className="p-5 space-y-5">
                      {/* Strengths */}
                      {result.strengths.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-emerald-700 flex items-center gap-2 mb-2.5">
                            <CheckCircle className="h-4 w-4" />Strengths
                          </h4>
                          <ul className="space-y-1.5">
                            {result.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Weaknesses */}
                      {result.weaknesses.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-rose-600 flex items-center gap-2 mb-2.5">
                            <XCircle className="h-4 w-4" />Areas of Concern
                          </h4>
                          <ul className="space-y-1.5">
                            {result.weaknesses.map((w, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <div className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                                {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {result.recommendations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2 mb-2.5">
                            <AlertCircle className="h-4 w-4" />Recommendations
                          </h4>
                          <ul className="space-y-1.5">
                            {result.recommendations.map((r, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB 2 — BULK SCREEN
      ════════════════════════════════════════════ */}
      {tab === "bulk" && (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Config panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-violet-500" />
                  Bulk Screening Config
                </CardTitle>
                <CardDescription className="text-xs">Screen all pending applicants for a job at once</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Job selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select Job</Label>
                  {loadingJobs ? (
                    <div className="h-9 bg-muted animate-pulse rounded-md" />
                  ) : (
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Choose a job posting..." />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.length === 0 && (
                          <SelectItem value="__none__" disabled>No active jobs found</SelectItem>
                        )}
                        {jobs.map((job) => (
                          <SelectItem key={job._id} value={job._id}>
                            <div className="flex items-center gap-2">
                              <span className="truncate">{job.title}</span>
                              {(job.applicationCount || 0) > 0 && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  ({job.applicationCount} apps)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="ghost" size="sm" className="h-6 text-xs p-0 text-muted-foreground" onClick={fetchJobs}>
                    <RefreshCw className="mr-1 h-3 w-3" />Refresh jobs
                  </Button>
                </div>

                {/* Thresholds */}
                <div className="space-y-4 rounded-xl bg-violet-50/60 border border-violet-100 p-4">
                  <p className="text-xs font-semibold text-violet-800 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" />AI Thresholds
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-violet-700">Shortlist threshold</Label>
                      <span className="text-sm font-bold text-violet-700">{bulkThreshold}%</span>
                    </div>
                    <input
                      type="range" min={40} max={95} step={5}
                      value={bulkThreshold}
                      onChange={(e) => setBulkThreshold(Number(e.target.value))}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-xs text-violet-400">
                      <span>40% (broad)</span><span>95% (strict)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-violet-700">Min ATS score</Label>
                      <span className="text-sm font-bold text-violet-700">{bulkMinAts}%</span>
                    </div>
                    <input
                      type="range" min={30} max={90} step={5}
                      value={bulkMinAts}
                      onChange={(e) => setBulkMinAts(Number(e.target.value))}
                      className="w-full accent-violet-600"
                    />
                    <div className="flex justify-between text-xs text-violet-400">
                      <span>30% (inclusive)</span><span>90% (strict)</span>
                    </div>
                  </div>
                </div>

                {/* Dry run toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Dry Run Mode</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Preview results without updating application statuses</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBulkDryRun(!bulkDryRun)}
                    className={`relative h-5 w-9 rounded-full transition-colors ${bulkDryRun ? "bg-violet-600" : "bg-muted"}`}
                  >
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${bulkDryRun ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>

                <Button
                  onClick={handleBulkScreen}
                  disabled={bulkLoading || !selectedJobId}
                  className="w-full bg-violet-600 hover:bg-violet-700"
                >
                  {bulkLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Screening...</>
                  ) : (
                    <><Play className="mr-2 h-4 w-4" />{bulkDryRun ? "Run Dry Preview" : "Run Bulk Screen"}</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Info card */}
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-blue-800">How bulk screening works</p>
                {[
                  "Fetches all Pending/Under Review applications",
                  "AI analyzes each resume against job requirements",
                  "Candidates above threshold are auto-shortlisted",
                  "Results saved directly to each application",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-blue-700">
                    <span className="h-4 w-4 rounded-full bg-blue-200 text-blue-700 text-[10px] flex items-center justify-center shrink-0 font-bold">{i + 1}</span>
                    {t}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-4">
            {!bulkResult && !bulkLoading && (
              <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-violet-300" />
                </div>
                <p className="font-semibold text-muted-foreground">Select a job and run bulk screening</p>
                <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                  All pending applications will be analyzed and scored automatically
                </p>
              </div>
            )}

            {bulkLoading && (
              <div className="rounded-2xl border border-muted flex flex-col items-center justify-center py-24 text-center">
                <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                  <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                </div>
                <p className="font-semibold">Running bulk AI screening...</p>
                <p className="text-sm text-muted-foreground mt-1">This may take a moment for large batches</p>
              </div>
            )}

            {bulkResult && !bulkLoading && (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total", value: bulkResult.total, color: "text-slate-700", bg: "bg-slate-50" },
                    { label: "Processed", value: bulkResult.processed, color: "text-blue-700", bg: "bg-blue-50" },
                    { label: "Shortlisted", value: bulkResult.shortlisted, color: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "Rejected", value: bulkResult.rejected, color: "text-rose-700", bg: "bg-rose-50" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl ${s.bg} p-3 text-center`}>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Rate */}
                {bulkResult.processed > 0 && (
                  <Card className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Shortlist Rate</p>
                        <span className="text-sm font-bold text-violet-700">
                          {Math.round((bulkResult.shortlisted / bulkResult.processed) * 100)}%
                        </span>
                      </div>
                      <ProgressBar label="" value={(bulkResult.shortlisted / bulkResult.processed) * 100} color="#7c3aed" />
                      <p className="text-xs text-muted-foreground mt-2">
                        {bulkResult.dryRun && <span className="text-amber-600 font-medium">Dry run — no statuses changed. </span>}
                        {bulkResult.shortlisted} of {bulkResult.processed} candidates met the threshold.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Preview table */}
                {bulkResult.preview?.length > 0 && (
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Users className="h-4 w-4 text-violet-500" />
                          Candidate Preview
                          <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">{bulkResult.preview.length}</Badge>
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setShowPreview(!showPreview)}
                        >
                          {showPreview ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </CardHeader>
                    {showPreview && (
                      <CardContent className="p-0">
                        <div className="divide-y">
                          {bulkResult.preview.slice(0, 15).map((c, i) => {
                            const v = getVerdict(c.aiMatchScore);
                            return (
                              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{c.candidateName || `Candidate ${i + 1}`}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">ATS: {c.atsScore}%</span>
                                    {c.skillsMatched?.length > 0 && (
                                      <span className="text-xs text-muted-foreground">{c.skillsMatched.length} skills</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-sm font-bold text-violet-700">{c.aiMatchScore}%</span>
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${v.bg} ${v.color}`}>
                                    {v.label}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {bulkResult.preview.length > 15 && (
                          <div className="px-4 py-3 border-t text-xs text-center text-muted-foreground">
                            + {bulkResult.preview.length - 15} more candidates —{" "}
                            <Link href={`/dashboard/recruiter/job-descriptions/${bulkResult.jobId}/candidates`} className="text-violet-600 hover:underline">
                              View all in pipeline
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* View pipeline CTA */}
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/dashboard/recruiter/job-descriptions/${bulkResult.jobId}/candidates`}>
                    <Users className="mr-2 h-4 w-4" />
                    View Full Candidate Pipeline
                    <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB 3 — COMPARE
      ════════════════════════════════════════════ */}
      {tab === "compare" && (
        <div className="space-y-5">
          {/* JD + Skills shared input */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Job Requirements (shared for all)
                </Label>
                <div className="flex gap-0.5 p-0.5 bg-muted rounded-md">
                  {(["paste", "select"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setCompareJdMode(m)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${compareJdMode === m ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}>
                      {m === "select" ? "From Job" : "Paste"}
                    </button>
                  ))}
                </div>
              </div>

              {compareJdMode === "paste" && (
                <Textarea
                  value={compareJD}
                  onChange={(e) => setCompareJD(e.target.value)}
                  placeholder="Paste the job description or requirements..."
                  className="min-h-[100px] text-sm resize-none"
                />
              )}

              {compareJdMode === "select" && (
                <div className="space-y-2">
                  {loadingJobs ? (
                    <div className="h-9 bg-muted animate-pulse rounded-md" />
                  ) : (
                    <Select
                      value={compareSelectedJobId}
                      onValueChange={(id) => {
                        setCompareSelectedJobId(id);
                        handleSelectJobForJD(id, setCompareJD, setCompareSkills);
                      }}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Pick a job posting..." />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.length === 0 && (
                          <SelectItem value="__none__" disabled>No active jobs found</SelectItem>
                        )}
                        {jobs.map((job) => (
                          <SelectItem key={job._id} value={job._id}>
                            <div className="flex items-center gap-2">
                              <BriefcaseIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{job.title}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {compareJD && (
                    <div className="rounded-lg border bg-emerald-50 border-emerald-200 p-2.5 flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-emerald-700">Job loaded</p>
                        <p className="text-xs text-emerald-600 truncate mt-0.5">{compareJD.slice(0, 70)}…</p>
                      </div>
                      <button type="button" onClick={() => { setCompareJD(""); setCompareSelectedJobId(""); setCompareSkills(""); }}
                        className="text-emerald-400 hover:text-rose-500 shrink-0">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Key Skills to compare (comma-separated)
              </Label>
              <Textarea
                value={compareSkills}
                onChange={(e) => setCompareSkills(e.target.value)}
                placeholder="React, TypeScript, Node.js, SQL, AWS..."
                className="min-h-[100px] text-sm resize-none"
              />
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={addSlot}
                  disabled={slots.length >= 4}
                >
                  <Plus className="mr-1 h-3 w-3" />Add Candidate ({slots.length}/4)
                </Button>
                <Button
                  onClick={handleCompare}
                  disabled={compareRunning || !compareJD.trim()}
                  className="bg-violet-600 hover:bg-violet-700 h-7 text-xs"
                >
                  {compareRunning ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <BarChart3 className="mr-1.5 h-3 w-3" />}
                  Compare All
                </Button>
              </div>
            </div>
          </div>

          {/* Resume slots */}
          <div className="grid gap-4 md:grid-cols-2">
            {slots.map((slot, i) => (
              <Card key={slot.id} className="border shadow-sm overflow-hidden">
                {slot.result && (
                  <div className={`h-1.5 w-full bg-gradient-to-r ${getScoreGradient(slot.result.score)}`} />
                )}
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <Input
                      value={slot.label}
                      onChange={(e) => updateSlot(slot.id, "label", e.target.value)}
                      className="h-7 text-sm font-medium border-0 shadow-none px-1 focus-visible:ring-0"
                    />
                    {slots.length > 2 && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500 shrink-0" onClick={() => removeSlot(slot.id)}>
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      value={slot.resumeText}
                      onChange={(e) => updateSlot(slot.id, "resumeText", e.target.value)}
                      placeholder={`Paste ${slot.label}'s resume here...`}
                      className="min-h-[100px] text-sm resize-none"
                    />
                    <div className="flex items-center gap-2">
                      <label className={`flex items-center gap-1.5 text-xs rounded-md border px-2.5 py-1.5 cursor-pointer transition-colors
                        ${slot.loading ? "opacity-50 pointer-events-none" : "hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700 text-muted-foreground"}`}>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSlotFile(slot.id, f); e.target.value = ""; }}
                        />
                        {slot.loading ? (
                          <><Loader2 className="h-3 w-3 animate-spin" />Parsing...</>
                        ) : (
                          <><Upload className="h-3 w-3" />Upload PDF/DOC</>
                        )}
                      </label>
                      {slot.resumeText && (
                        <span className="text-xs text-muted-foreground">{slot.resumeText.length.toLocaleString()} chars</span>
                      )}
                    </div>
                  </div>

                  {slot.loading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                      Analyzing...
                    </div>
                  )}

                  {slot.result && !slot.loading && (
                    <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-bold text-violet-700">{slot.result.score}%</span>
                          {(() => {
                            const v = getVerdict(slot.result.score);
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${v.bg} ${v.color}`}>
                                {v.icon}{v.label}
                              </span>
                            );
                          })()}
                        </div>
                        {slot.result.atsScore !== undefined && (
                          <span className="text-xs text-muted-foreground">ATS: {slot.result.atsScore}%</span>
                        )}
                      </div>
                      <ProgressBar label="" value={slot.result.score} color={slot.result.score >= 70 ? "#10b981" : slot.result.score >= 50 ? "#f59e0b" : "#ef4444"} />
                      <div className="flex flex-wrap gap-1 pt-1">
                        {slot.result.skillsMatch.slice(0, 4).map((s, si) => (
                          <Badge key={si} className="bg-emerald-50 text-emerald-700 border-0 text-xs h-5">{s}</Badge>
                        ))}
                        {slot.result.skillsMatch.length > 4 && (
                          <Badge className="bg-muted text-muted-foreground border-0 text-xs h-5">+{slot.result.skillsMatch.length - 4}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Ranked comparison table */}
          {sortedSlots.length > 1 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  Ranking Results
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {sortedSlots.map((slot, i) => {
                    if (!slot.result) return null;
                    const v = getVerdict(slot.result.score);
                    const medals = ["🥇", "🥈", "🥉", ""];
                    return (
                      <div key={slot.id} className={`flex items-center gap-4 px-4 py-3 ${i === 0 ? "bg-amber-50/50" : ""}`}>
                        <span className="text-lg shrink-0">{medals[i] || `#${i + 1}`}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{slot.label}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-24"><ProgressBar label="" value={slot.result.score} color={slot.result.score >= 70 ? "#10b981" : slot.result.score >= 50 ? "#f59e0b" : "#ef4444"} /></div>
                            <span className="text-xs text-muted-foreground">{slot.result.skillsMatch.length} skills matched</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-lg font-bold text-violet-700">{slot.result.score}%</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${v.bg} ${v.color}`}>
                            {v.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB 4 — HISTORY
      ════════════════════════════════════════════ */}
      {tab === "history" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search by name or verdict..."
                className="pl-8 h-9 text-sm"
              />
            </div>
            {history.length > 0 && (
              <Button variant="outline" size="sm" className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:border-rose-200 shrink-0" onClick={clearHistory}>
                <Trash2 className="mr-1.5 h-3 w-3" />Clear All
              </Button>
            )}
          </div>

          {/* Stats row */}
          {history.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Screened", value: historyStats.total, color: "text-slate-700" },
                { label: "Average Score", value: `${historyStats.avgScore}%`, color: "text-violet-700" },
                { label: "Hire Decisions", value: historyStats.hires, color: "text-emerald-700" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border bg-muted/30 p-3 text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {history.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <History className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-muted-foreground">No screening history yet</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Run a Quick Screen to start building your history</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => setTab("quick")}>
                Go to Quick Screen
              </Button>
            </div>
          )}

          {/* History list */}
          {filteredHistory.length > 0 && (
            <div className="space-y-2">
              {filteredHistory.map((entry) => {
                const v = getVerdict(entry.score);
                return (
                  <Card key={entry.id} className="border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl ${v.bg} flex items-center justify-center shrink-0`}>
                          <span className={`text-lg font-bold ${v.color}`}>{entry.score}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{entry.label}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${v.bg} ${v.color}`}>
                              {v.icon}{v.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            <span>{entry.skillsMatched} skills matched</span>
                            {entry.atsScore > 0 && <span>ATS: {entry.atsScore}%</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">AI Score</p>
                            <p className="text-lg font-bold text-violet-700">{entry.score}%</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-500" onClick={() => deleteHistoryEntry(entry.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {filteredHistory.length === 0 && history.length > 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No entries match "{historySearch}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// missing import fix
function Briefcase(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
