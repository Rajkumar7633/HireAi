"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, User, FileText, Calendar, Search, Users, CheckCircle, XCircle,
  Clock, TrendingUp, ChevronRight, Briefcase, Star, SlidersHorizontal,
  Download, RefreshCw, LayoutGrid, LayoutList, Filter, ArrowUpDown,
  Brain, Target, ThumbsUp, ThumbsDown, Minus, Award, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ScoreRing, SkillBar } from "@/components/ui/charts";

interface Application {
  _id: string;
  jobSeekerId: { _id: string; name: string; email: string };
  jobDescriptionId: { _id: string; title: string; location?: string };
  resumeId?: { _id: string; filename: string; originalName?: string };
  testId?: { _id: string; title: string };
  status: string;
  applicationDate: string;
  appliedAt?: string;
  testScore?: number;
  aiMatchScore?: number;
  atsScore?: number;
  shortlisted?: boolean;
  skillsMatched?: string[];
  currentStage?: string;
  rounds?: Array<{ roundName: string; stageKey: string; status: string }>;
}

interface Job {
  _id: string;
  title: string;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  Pending:               { color: "text-slate-600",   bg: "bg-slate-100",   label: "Pending",    dot: "bg-slate-400" },
  pending:               { color: "text-slate-600",   bg: "bg-slate-100",   label: "Pending",    dot: "bg-slate-400" },
  "Under Review":        { color: "text-blue-600",    bg: "bg-blue-100",    label: "Under Review", dot: "bg-blue-400" },
  reviewed:              { color: "text-blue-600",    bg: "bg-blue-100",    label: "Reviewed",   dot: "bg-blue-400" },
  Shortlisted:           { color: "text-violet-600",  bg: "bg-violet-100",  label: "Shortlisted", dot: "bg-violet-500" },
  "Test Assigned":       { color: "text-amber-600",   bg: "bg-amber-100",   label: "Test Assigned", dot: "bg-amber-400" },
  "Test Passed":         { color: "text-emerald-600", bg: "bg-emerald-100", label: "Test Passed", dot: "bg-emerald-400" },
  "Test Failed":         { color: "text-rose-600",    bg: "bg-rose-100",    label: "Test Failed", dot: "bg-rose-400" },
  "Interview Scheduled": { color: "text-indigo-600",  bg: "bg-indigo-100",  label: "Interview",  dot: "bg-indigo-400" },
  Hired:                 { color: "text-emerald-700", bg: "bg-emerald-100", label: "Hired",      dot: "bg-emerald-500" },
  Rejected:              { color: "text-rose-700",    bg: "bg-rose-100",    label: "Rejected",   dot: "bg-rose-500" },
};

const PIPELINE_STAGES = [
  { key: ["Pending", "pending"], label: "Applied",    color: "bg-slate-400" },
  { key: ["Under Review", "reviewed"], label: "Reviewing", color: "bg-blue-400" },
  { key: ["Shortlisted"],        label: "Shortlisted", color: "bg-violet-500" },
  { key: ["Test Assigned", "Test Passed", "Test Failed"], label: "Testing", color: "bg-amber-400" },
  { key: ["Interview Scheduled"], label: "Interview", color: "bg-indigo-400" },
  { key: ["Hired"],              label: "Hired",      color: "bg-emerald-500" },
];

type SortKey = "newest" | "oldest" | "ai_high" | "ai_low" | "name_az" | "name_za";

function getVerdict(score: number) {
  if (score >= 85) return { label: "Strong Hire", color: "text-emerald-700", bg: "bg-emerald-100", icon: <ThumbsUp className="h-3 w-3" /> };
  if (score >= 70) return { label: "Hire",        color: "text-blue-700",    bg: "bg-blue-100",    icon: <CheckCircle className="h-3 w-3" /> };
  if (score >= 55) return { label: "Maybe",       color: "text-amber-700",   bg: "bg-amber-100",   icon: <Minus className="h-3 w-3" /> };
  return              { label: "Pass",         color: "text-rose-700",    bg: "bg-rose-100",    icon: <ThumbsDown className="h-3 w-3" /> };
}

export default function CandidatesOverviewPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("recruiter:candidates:v2");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.searchTerm) setSearchTerm(s.searchTerm);
        if (s.statusFilter) setStatusFilter(s.statusFilter);
        if (s.sortKey) setSortKey(s.sortKey);
        if (s.viewMode) setViewMode(s.viewMode);
      }
    } catch {}
    fetchAll();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("recruiter:candidates:v2", JSON.stringify({ searchTerm, statusFilter, sortKey, viewMode }));
    } catch {}
  }, [searchTerm, statusFilter, sortKey, viewMode]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [appRes, jobRes] = await Promise.all([
        fetch("/api/applications/recruiter", { credentials: "include" }),
        fetch("/api/job-descriptions/my-jobs", { credentials: "include" }),
      ]);
      if (appRes.ok) {
        const data = await appRes.json();
        const normalized = (data.applications || []).map((a: any) => {
          const js = a.jobSeekerId;
          const jd = a.jobDescriptionId;
          return {
            ...a,
            jobSeekerId: js && typeof js === "object" ? js : { _id: js || "", name: a.candidateName || "Candidate", email: a.candidateEmail || "" },
            jobDescriptionId: jd && typeof jd === "object" ? jd : { _id: jd || "", title: a.jobTitle || "Job" },
          };
        });
        setApplications(normalized);
      }
      if (jobRes.ok) {
        const data = await jobRes.json();
        setJobs((data.jobDescriptions || []).map((j: any) => ({ _id: j._id, title: j.title })));
      }
    } catch {
      toast({ title: "Error", description: "Could not load candidates.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setApplications((prev) => prev.map((a) => a._id === applicationId ? { ...a, status: newStatus } : a));
        toast({ title: "Status updated" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Update failed", description: err.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkUpdating(true);
    let success = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/applications/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: bulkStatus }),
        });
        if (res.ok) { success++; setApplications((prev) => prev.map((a) => a._id === id ? { ...a, status: bulkStatus } : a)); }
      } catch {}
    }
    setBulkUpdating(false);
    setSelectedIds(new Set());
    setBulkStatus("");
    toast({ title: `Updated ${success} of ${selectedIds.size} applications` });
  };

  const exportCSV = () => {
    const rows = [
      ["Name", "Email", "Job", "Status", "AI Score", "ATS Score", "Applied Date"],
      ...filtered.map((a) => [
        a.jobSeekerId?.name || "",
        a.jobSeekerId?.email || "",
        a.jobDescriptionId?.title || "",
        a.status,
        a.aiMatchScore ?? "",
        a.atsScore ?? "",
        a.applicationDate ? format(new Date(a.applicationDate), "yyyy-MM-dd") : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "candidates.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${filtered.length} candidates exported` });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = [...applications];
    if (statusFilter !== "all") list = list.filter((a) => a.status === statusFilter || a.status?.toLowerCase() === statusFilter.toLowerCase());
    if (jobFilter !== "all") list = list.filter((a) => a.jobDescriptionId?._id === jobFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((a) =>
        (a.jobSeekerId?.name || "").toLowerCase().includes(q) ||
        (a.jobSeekerId?.email || "").toLowerCase().includes(q) ||
        (a.jobDescriptionId?.title || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortKey === "newest") return new Date(b.applicationDate || 0).getTime() - new Date(a.applicationDate || 0).getTime();
      if (sortKey === "oldest") return new Date(a.applicationDate || 0).getTime() - new Date(b.applicationDate || 0).getTime();
      if (sortKey === "ai_high") return (b.aiMatchScore ?? -1) - (a.aiMatchScore ?? -1);
      if (sortKey === "ai_low") return (a.aiMatchScore ?? 999) - (b.aiMatchScore ?? 999);
      if (sortKey === "name_az") return (a.jobSeekerId?.name || "").localeCompare(b.jobSeekerId?.name || "");
      if (sortKey === "name_za") return (b.jobSeekerId?.name || "").localeCompare(a.jobSeekerId?.name || "");
      return 0;
    });
    return list;
  }, [applications, statusFilter, jobFilter, searchTerm, sortKey]);

  const stats = useMemo(() => ({
    total: applications.length,
    pending: applications.filter((a) => ["Pending", "pending", "Under Review"].includes(a.status)).length,
    shortlisted: applications.filter((a) => a.status === "Shortlisted").length,
    interviews: applications.filter((a) => a.status === "Interview Scheduled").length,
    hired: applications.filter((a) => a.status === "Hired").length,
    rejected: applications.filter((a) => a.status === "Rejected").length,
  }), [applications]);

  const pipelineCounts = useMemo(() =>
    PIPELINE_STAGES.map((stage) => ({
      ...stage,
      count: applications.filter((a) => stage.key.includes(a.status)).length,
    })),
    [applications]
  );

  const uniqueJobs = useMemo(() => {
    const seen = new Set<string>();
    const list: Job[] = [];
    for (const a of applications) {
      const jd = a.jobDescriptionId;
      if (jd?._id && !seen.has(jd._id)) { seen.add(jd._id); list.push({ _id: jd._id, title: jd.title }); }
    }
    return list;
  }, [applications]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/dashboard/recruiter" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Candidates</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            Candidates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{applications.length} total applications across all your jobs</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchAll}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
          </Button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total",       value: stats.total,       color: "text-slate-700",   bg: "bg-slate-50",   icon: <Users className="h-4 w-4 text-slate-500" /> },
          { label: "Pending",     value: stats.pending,     color: "text-blue-700",    bg: "bg-blue-50",    icon: <Clock className="h-4 w-4 text-blue-500" /> },
          { label: "Shortlisted", value: stats.shortlisted, color: "text-violet-700",  bg: "bg-violet-50",  icon: <Star className="h-4 w-4 text-violet-500" /> },
          { label: "Interviews",  value: stats.interviews,  color: "text-indigo-700",  bg: "bg-indigo-50",  icon: <Calendar className="h-4 w-4 text-indigo-500" /> },
          { label: "Hired",       value: stats.hired,       color: "text-emerald-700", bg: "bg-emerald-50", icon: <Award className="h-4 w-4 text-emerald-500" /> },
          { label: "Rejected",    value: stats.rejected,    color: "text-rose-700",    bg: "bg-rose-50",    icon: <XCircle className="h-4 w-4 text-rose-500" /> },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>{s.icon}</div>
              <div>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Pipeline Funnel ── */}
      {applications.length > 0 && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pipeline Overview</p>
          <div className="flex items-end gap-2">
            {pipelineCounts.map((stage) => {
              const pct = stats.total > 0 ? Math.max((stage.count / stats.total) * 100, stage.count > 0 ? 4 : 0) : 0;
              return (
                <button
                  key={stage.label}
                  onClick={() => setStatusFilter(stage.key[0])}
                  className="flex-1 flex flex-col items-center gap-1.5 group"
                >
                  <span className={`text-xs font-bold transition-colors ${statusFilter === stage.key[0] ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                    {stage.count}
                  </span>
                  <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(pct * 0.5, stage.count > 0 ? 6 : 2)}px`, background: stage.count > 0 ? "" : "#e5e7eb" }}>
                    <div className={`w-full h-full rounded-t-sm ${stage.count > 0 ? stage.color : "bg-muted"} ${statusFilter === stage.key[0] ? "ring-2 ring-offset-1 ring-current" : ""}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{stage.label}</span>
                </button>
              );
            })}
          </div>
          {statusFilter !== "all" && (
            <button onClick={() => setStatusFilter("all")} className="mt-2 text-xs text-violet-600 hover:underline">
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search name, email or job..." className="pl-8 h-9 text-sm" />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).filter(([k]) => !["pending", "reviewed"].includes(k)).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <Briefcase className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {uniqueJobs.map((j) => (
              <SelectItem key={j._id} value={j._id}>{j.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="ai_high">AI Score: High → Low</SelectItem>
            <SelectItem value="ai_low">AI Score: Low → High</SelectItem>
            <SelectItem value="name_az">Name: A → Z</SelectItem>
            <SelectItem value="name_za">Name: Z → A</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
          <button onClick={() => setViewMode("list")} className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>
            <LayoutList className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
        </div>

        <span className="text-xs text-muted-foreground ml-1">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-violet-50 border border-violet-200 px-4 py-2.5">
          <span className="text-sm font-medium text-violet-800">{selectedIds.size} selected</span>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-44 h-8 text-xs bg-white">
              <SelectValue placeholder="Set status..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).filter(([k]) => !["pending", "reviewed"].includes(k)).map(([key, cfg]) => (
                <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700" onClick={handleBulkUpdate} disabled={!bulkStatus || bulkUpdating}>
            {bulkUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Apply to {selectedIds.size}
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-violet-600 hover:underline">Clear</button>
        </div>
      )}

      {/* ── Empty State ── */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 py-20 text-center">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">{applications.length === 0 ? "No applications yet" : "No candidates match your filters"}</p>
          <p className="text-sm text-muted-foreground/60 mt-1">{applications.length === 0 ? "Post a job to start receiving applications" : "Try adjusting your search or filters"}</p>
          {applications.length > 0 && <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setJobFilter("all"); }}>Clear Filters</Button>}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {filtered.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          {filtered.map((app) => {
            const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG["Pending"];
            const verdict = app.aiMatchScore != null ? getVerdict(app.aiMatchScore) : null;
            let appliedDate = "—";
            try { appliedDate = format(new Date(app.applicationDate || app.appliedAt || ""), "MMM d, yyyy"); } catch {}
            const isSelected = selectedIds.has(app._id);
            const isExpanded = expandedId === app._id;

            return (
              <Card key={app._id} className={`border shadow-sm transition-all ${isSelected ? "border-violet-300 bg-violet-50/30" : "hover:shadow-md"}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(app._id)}
                      className="h-4 w-4 rounded border-muted-foreground/30 accent-violet-600 shrink-0"
                    />

                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-100 to-indigo-200 flex items-center justify-center shrink-0 text-sm font-bold text-violet-700">
                      {(app.jobSeekerId?.name || "?").slice(0, 2).toUpperCase()}
                    </div>

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{app.jobSeekerId?.name || "Candidate"}</p>
                        {app.shortlisted && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" fill="currentColor" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{app.jobSeekerId?.email || "—"}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{app.jobDescriptionId?.title || "—"}</span>
                      </div>
                    </div>

                    {/* AI scores */}
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                      {app.aiMatchScore != null && (
                        <ScoreRing value={app.aiMatchScore} size={52} stroke={5} color="#8b5cf6" sublabel="AI" />
                      )}
                      {app.atsScore != null && (
                        <ScoreRing value={app.atsScore} size={52} stroke={5} color="#3b82f6" sublabel="ATS" />
                      )}
                      {app.testScore !== undefined && (
                        <ScoreRing value={app.testScore} size={52} stroke={5} sublabel="Test" />
                      )}
                    </div>

                    {/* Verdict */}
                    {verdict && (
                      <span className={`hidden lg:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${verdict.bg} ${verdict.color}`}>
                        {verdict.icon}{verdict.label}
                      </span>
                    )}

                    {/* Date */}
                    <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Calendar className="h-3 w-3" />
                      <span>{appliedDate}</span>
                    </div>

                    {/* Status */}
                    <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                    </span>

                    {/* Quick status change */}
                    <Select value={app.status} onValueChange={(v) => handleStatusUpdate(app._id, v)}>
                      <SelectTrigger className="hidden lg:flex w-36 h-7 text-xs shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).filter(([k]) => !["pending", "reviewed"].includes(k)).map(([key, cfg]) => (
                          <SelectItem key={key} value={key} className="text-xs">{cfg.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : app._id)}
                        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs px-2.5">
                        <Link href={`/dashboard/recruiter/candidates/${app.jobSeekerId?._id || app._id}`}>
                          View <ChevronRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Expanded row */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 bg-muted/20 space-y-3">
                      <div className="flex gap-4 flex-wrap">
                        {app.aiMatchScore != null && (
                          <ScoreRing value={app.aiMatchScore} size={64} stroke={6} color="#8b5cf6" label="AI Match" />
                        )}
                        {app.atsScore != null && (
                          <ScoreRing value={app.atsScore} size={64} stroke={6} color="#3b82f6" label="ATS Score" />
                        )}
                        {app.testScore !== undefined && (
                          <ScoreRing value={app.testScore} size={64} stroke={6} label="Test Score" />
                        )}
                      </div>
                      {(app.skillsMatched || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(app.skillsMatched || []).slice(0, 8).map((s, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs">
                              <CheckCircle className="h-2.5 w-2.5" />{s}
                            </span>
                          ))}
                        </div>
                      )}
                      {app.rounds && app.rounds.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {app.rounds.map((r, i) => (
                            <span key={i} className={`rounded-md px-2 py-0.5 text-xs font-medium ${r.status === "passed" ? "bg-emerald-100 text-emerald-700" : r.status === "failed" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                              {r.roundName} · {r.status}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {filtered.length > 0 && viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((app) => {
            const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG["Pending"];
            const verdict = app.aiMatchScore != null ? getVerdict(app.aiMatchScore) : null;
            let appliedDate = "—";
            try { appliedDate = format(new Date(app.applicationDate || app.appliedAt || ""), "MMM d"); } catch {}

            return (
              <Card key={app._id} className="border shadow-sm hover:shadow-md transition-all group">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-200 flex items-center justify-center shrink-0 text-sm font-bold text-violet-700">
                      {(app.jobSeekerId?.name || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm truncate">{app.jobSeekerId?.name || "Candidate"}</p>
                        {app.shortlisted && <Star className="h-3.5 w-3.5 text-amber-500 shrink-0" fill="currentColor" />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{app.jobSeekerId?.email || "—"}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${sc.bg} ${sc.color}`}>{sc.label}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3 shrink-0" />
                    <span className="truncate">{app.jobDescriptionId?.title || "—"}</span>
                  </div>

                  {(app.aiMatchScore != null || app.atsScore != null) && (
                    <div className="flex items-center gap-3 justify-center py-1">
                      {app.aiMatchScore != null && (
                        <ScoreRing value={app.aiMatchScore} size={60} stroke={6} color="#8b5cf6" label="AI Match" sublabel="score" />
                      )}
                      {app.atsScore != null && (
                        <ScoreRing value={app.atsScore} size={60} stroke={6} color="#3b82f6" label="ATS" sublabel="score" />
                      )}
                      {app.testScore !== undefined && (
                        <ScoreRing value={app.testScore} size={60} stroke={6} label="Test" sublabel="score" />
                      )}
                    </div>
                  )}

                  {verdict && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${verdict.bg} ${verdict.color}`}>
                      {verdict.icon}{verdict.label}
                    </span>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{appliedDate}
                    </span>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href={`/dashboard/recruiter/candidates/${app.jobSeekerId?._id || app._id}`}>
                        View Profile <ChevronRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
