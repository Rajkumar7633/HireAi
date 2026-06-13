"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Search, Clock, CheckCircle2, XCircle, AlertCircle,
  MapPin, Briefcase, CalendarDays, Trophy, ClipboardList,
  ExternalLink, RefreshCw, ChevronRight, TrendingUp, Send,
  FileText, Video, Star, ArrowRight, X, SortAsc,
  Play, Bell, Award, Eye,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays, isPast } from "date-fns";
import {
  PIPELINE_STAGES,
  normalizeApplicationStatus,
  type CanonicalApplicationStatus,
} from "@/lib/application-status";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoundInfo {
  roundName?: string;
  stageKey?: string;
  status?: string;
  latestScore?: number;
}

interface Application {
  _id: string;
  jobSeekerId: string;
  jobDescriptionId: {
    _id: string;
    title: string;
    location: string;
    recruiterId: string;
    companyName?: string;
  };
  resumeId: { _id: string; filename: string };
  applicationDate: string;
  status: CanonicalApplicationStatus;
  rawStatus?: string;
  pipelineProgress?: number;
  testScore?: number;
  interviewDate?: string;
  currentStage?: string;
  rounds?: RoundInfo[];
  testId?: { _id: string; title: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Pending:             { label: "Pending",          color: "#d97706", bg: "#fffbeb", border: "#fde68a", icon: <Clock className="h-3.5 w-3.5" /> },
  Reviewed:            { label: "Reviewed",          color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: <Eye className="h-3.5 w-3.5" /> },
  "Interview Scheduled":{ label: "Interview",        color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: <Video className="h-3.5 w-3.5" /> },
  "Test Assigned":     { label: "Test Pending",      color: "#0e7490", bg: "#ecfeff", border: "#a5f3fc", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  "Assessment Assigned":{ label: "Assessment",       color: "#0e7490", bg: "#ecfeff", border: "#a5f3fc", icon: <ClipboardList className="h-3.5 w-3.5" /> },
  Offer:               { label: "Offer received",    color: "#059669", bg: "#ecfdf5", border: "#a7f3d0", icon: <FileText className="h-3.5 w-3.5" /> },
  Rejected:            { label: "Rejected",          color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: <XCircle className="h-3.5 w-3.5" /> },
  Hired:               { label: "Hired!",            color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: <Award className="h-3.5 w-3.5" /> },
};

const PIPELINE_STAGE_LABELS = PIPELINE_STAGES;

const STAGE_MAP: Record<string, string> = {
  application: "Application Submitted", hr_shortlist: "HR Shortlisting",
  coding_round: "Coding Test", mcq_round: "MCQ Test", advanced_round: "Advanced Test",
  tech_round_1: "Tech Round 1", tech_round_2: "Tech Round 2", tech_round_3: "Tech Round 3",
  hr_round: "HR Round", offer: "Final Offer", test_round: "Test Round",
};

type FilterTab = "all" | "active" | "tests" | "interviews" | "hired" | "rejected";

function getCompanyColor(name?: string): string {
  const colors = ["#7c3aed", "#2563eb", "#059669", "#dc2626", "#d97706", "#0e7490", "#be185d", "#1e293b"];
  if (!name) return colors[0];
  return colors[name.charCodeAt(0) % colors.length];
}

function CompanyAvatar({ name, size = 44 }: { name?: string; size?: number }) {
  const color = getCompanyColor(name);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: `${color}18`, border: `1.5px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.3, fontWeight: 700, color }}>{initials}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Pending"];
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function PipelineBar({
  progress,
  isRejected,
  isHired,
}: {
  progress: number;
  isRejected: boolean;
  isHired: boolean;
}) {
  if (isRejected) {
    return (
      <div className="flex items-center gap-1 mt-2">
        <div className="flex-1 h-1.5 rounded-full bg-red-200" />
        <span className="text-xs text-red-500 font-medium">Application closed</span>
      </div>
    );
  }

  const activeIdx = Math.max(0, Math.min(progress, PIPELINE_STAGE_LABELS.length - 1));

  return (
    <div className="flex items-center gap-1 mt-2">
      {PIPELINE_STAGE_LABELS.map((stage, i) => {
        const done = isHired || i < activeIdx;
        const active = !isHired && i === activeIdx;
        return (
          <div key={stage.key} className="flex items-center gap-1 flex-1">
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <div
                style={{
                  height: 4,
                  borderRadius: 10,
                  background: done
                    ? "#7c3aed"
                    : active
                      ? "linear-gradient(90deg, #7c3aed 60%, #e5e7eb 60%)"
                      : "#e5e7eb",
                  width: "100%",
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  color: active ? "#7c3aed" : done ? "#64748b" : "#94a3b8",
                  fontWeight: active || (isHired && i === stage.index) ? 700 : 400,
                }}
              >
                {stage.label}
              </span>
            </div>
            {i < PIPELINE_STAGE_LABELS.length - 1 && (
              <div
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: done || active ? "#7c3aed" : "#e5e7eb",
                  flexShrink: 0,
                  marginBottom: 10,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InterviewCountdown({ date }: { date: string }) {
  const d = new Date(date);
  const days = differenceInDays(d, new Date());
  const past = isPast(d);
  if (past) return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-200">
      <Video className="h-3.5 w-3.5" />
      Interview was {format(d, "MMM d 'at' h:mm a")}
    </div>
  );
  const urgent = days <= 2;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border ${urgent ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
      {urgent ? <Bell className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
      {days === 0 ? "Interview TODAY" : days === 1 ? "Interview TOMORROW" : `Interview in ${days} days`}
      <span className="opacity-70 ml-0.5">— {format(d, "MMM d, h:mm a")}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"date" | "status">("date");
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();

    const onVisible = () => {
      if (document.visibilityState === "visible") fetchApplications();
    };
    document.addEventListener("visibilitychange", onVisible);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") fetchApplications();
    }, 45000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);

  const fetchApplications = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch("/api/applications/my-applications", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        const list = (d.applications || []).map((a: Application) => ({
          ...a,
          status: normalizeApplicationStatus(a.status || a.rawStatus),
        }));
        setApplications(list);
      } else if (!silent) {
        toast({ title: "Error", description: "Failed to load applications.", variant: "destructive" });
      }
    } catch {
      if (!silent) {
        toast({ title: "Network error", description: "Could not load applications.", variant: "destructive" });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // ── Stats ──
  const stats = useMemo(() => {
    const total = applications.length;
    const active = applications.filter(a => !["Rejected", "Hired"].includes(a.status)).length;
    const tests = applications.filter(a => a.status === "Test Assigned").length;
    const interviews = applications.filter(a => a.status === "Interview Scheduled").length;
    const offers = applications.filter(a => a.status === "Offer").length;
    const hired = applications.filter(a => a.status === "Hired").length;
    const rejected = applications.filter(a => a.status === "Rejected").length;
    const reviewed = applications.filter(a => (a.pipelineProgress ?? 0) >= 1).length;
    const responseRate = total > 0 ? Math.round((reviewed / total) * 100) : 0;
    return { total, active, tests, interviews, offers, hired, rejected, reviewed, responseRate };
  }, [applications]);

  // ── Filter + Sort ──
  const filtered = useMemo(() => {
    let list = applications.filter(a => {
      const q = search.toLowerCase();
      if (q && !(
        a.jobDescriptionId?.title?.toLowerCase().includes(q) ||
        a.jobDescriptionId?.location?.toLowerCase().includes(q) ||
        a.jobDescriptionId?.companyName?.toLowerCase().includes(q)
      )) return false;

      if (activeTab === "active") return !["Rejected", "Hired"].includes(a.status);
      if (activeTab === "tests") return a.status === "Test Assigned";
      if (activeTab === "interviews") return a.status === "Interview Scheduled";
      if (activeTab === "hired") return a.status === "Hired";
      if (activeTab === "rejected") return a.status === "Rejected";
      return true;
    });

    if (sort === "date") list.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
    if (sort === "status") {
      const order: Record<string, number> = {
        "Interview Scheduled": 0,
        "Offer": 1,
        "Test Assigned": 2,
        "Reviewed": 3,
        "Pending": 4,
        "Hired": 5,
        "Rejected": 6,
      };
      list.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
    }
    return list;
  }, [applications, search, activeTab, sort]);

  const TABS: { id: FilterTab; label: string; count: number; color?: string }[] = [
    { id: "all",        label: "All",        count: stats.total },
    { id: "active",     label: "Active",     count: stats.active,     color: "#2563eb" },
    { id: "tests",      label: "Tests",      count: stats.tests,      color: "#0e7490" },
    { id: "interviews", label: "Interviews", count: stats.interviews,  color: "#7c3aed" },
    { id: "hired",      label: "Hired",      count: stats.hired,      color: "#16a34a" },
    { id: "rejected",   label: "Rejected",   count: stats.rejected,   color: "#dc2626" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-3 text-gray-500 font-medium">Loading applications…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
              <p className="text-sm text-gray-500 mt-0.5">Track your job search journey</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchApplications} className="h-8">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
              </Button>
              <Button size="sm" className="h-8 bg-purple-600 hover:bg-purple-700" asChild>
                <Link href="/dashboard/jobs"><Send className="h-3.5 w-3.5 mr-1.5" /> Browse Jobs</Link>
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: "Total",      val: stats.total,        color: "#64748b", bg: "#f8fafc" },
              { label: "Active",     val: stats.active,       color: "#2563eb", bg: "#eff6ff" },
              { label: "Tests Due",  val: stats.tests,        color: "#0e7490", bg: "#ecfeff" },
              { label: "Interviews", val: stats.interviews,   color: "#7c3aed", bg: "#f5f3ff" },
              { label: "Hired",      val: stats.hired,        color: "#16a34a", bg: "#f0fdf4" },
              { label: "Response %", val: `${stats.responseRate}%`, color: "#d97706", bg: "#fffbeb" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 12, border: `1px solid ${s.color}20`, padding: "10px 14px" }}>
                <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1.2, marginTop: 2 }}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Funnel bar if has data */}
          {stats.total > 0 && (
            <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap text-xs text-gray-600">
              <TrendingUp className="h-4 w-4 text-purple-600 flex-shrink-0" />
              <span className="font-medium text-gray-700">Application Funnel:</span>
              {[
                { label: "Applied",    n: stats.total,       color: "#64748b" },
                { label: "Reviewed",   n: stats.reviewed,    color: "#2563eb" },
                { label: "Interview",  n: stats.interviews,  color: "#7c3aed" },
                { label: "Offer",      n: stats.offers,      color: "#059669" },
                { label: "Hired",      n: stats.hired,       color: "#16a34a" },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300" />}
                  <span style={{ color: s.color, fontWeight: 700 }}>{s.n}</span>
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-4 py-4 space-y-4">

        {/* Filter + search bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-col sm:flex-row gap-2">
          <div className="flex gap-1 overflow-x-auto flex-wrap flex-1">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-purple-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold min-w-5 text-center ${
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs…" className="pl-8 h-8 text-sm" />
              {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="h-3 w-3 text-gray-400" /></button>}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value as any)}
              className="h-8 text-sm border border-gray-200 rounded-lg px-2 bg-white text-gray-600 cursor-pointer">
              <option value="date">Newest first</option>
              <option value="status">By status</option>
            </select>
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 py-20 text-center">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-purple-300" />
            </div>
            <h3 className="font-semibold text-gray-700 text-lg">
              {applications.length === 0 ? "No applications yet" : "No results"}
            </h3>
            <p className="text-gray-400 text-sm mt-1 mb-5">
              {applications.length === 0
                ? "Start applying to jobs to track your progress here"
                : "Try a different search or filter"}
            </p>
            {applications.length === 0 && (
              <Button className="bg-purple-600 hover:bg-purple-700" asChild>
                <Link href="/dashboard/jobs"><Send className="h-4 w-4 mr-2" /> Browse Jobs</Link>
              </Button>
            )}
          </div>
        )}

        {/* Application cards */}
        <div className="space-y-3">
          {filtered.map(app => {
            const isRejected = app.status === "Rejected";
            const isHired = app.status === "Hired";
            const isOffer = app.status === "Offer";
            const isTest = app.status === "Test Assigned";
            const isInterview = app.status === "Interview Scheduled";
            const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG["Pending"];
            const pipelineProgress =
              typeof app.pipelineProgress === "number"
                ? app.pipelineProgress
                : app.status === "Hired"
                  ? 5
                  : app.status === "Offer"
                    ? 4
                    : app.status === "Interview Scheduled"
                      ? 3
                      : app.status === "Test Assigned"
                        ? 2
                        : app.status === "Reviewed"
                          ? 1
                          : 0;
            const displayScore = app.testScore ?? (app as Application & { score?: number }).score;
            const jobTitle = app.jobDescriptionId?.title || "Untitled Role";
            const company = app.jobDescriptionId?.companyName || "";
            const location = app.jobDescriptionId?.location || "";
            const rounds = app.rounds || [];
            const passedRounds = rounds.filter(r => r.status === "passed").length;

            return (
              <div key={app._id}
                style={{ borderLeft: `4px solid ${cfg.color}`, background: isHired ? "#f0fdf4" : isRejected ? "#fef9f9" : "#fff" }}
                className="rounded-2xl border border-gray-200 p-4 hover:shadow-md transition-shadow">

                <div className="flex items-start gap-3">
                  <CompanyAvatar name={company || jobTitle} size={44} />

                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-base leading-tight">{jobTitle}</span>
                          <StatusBadge status={app.status} />
                          {isHired && <span className="text-sm">🎉</span>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
                          {company && <span className="font-medium text-gray-600">{company}</span>}
                          {location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{location}</span>}
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Applied {formatDistanceToNow(new Date(app.applicationDate), { addSuffix: true })}
                          </span>
                          {app.resumeId?.filename && (
                            <span className="flex items-center gap-1 text-gray-400">
                              <FileText className="h-3 w-3" /> {app.resumeId.filename}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Test score */}
                      {typeof displayScore === "number" && (
                        <div className={`flex items-center gap-1.5 text-sm font-bold px-2.5 py-1 rounded-xl ${
                          displayScore >= 70 ? "bg-green-100 text-green-700" : displayScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        }`}>
                          <Trophy className="h-3.5 w-3.5" /> {displayScore}%
                        </div>
                      )}
                    </div>

                    {/* Interview countdown */}
                    {isInterview && app.interviewDate && (
                      <div className="mt-2">
                        <InterviewCountdown date={app.interviewDate} />
                      </div>
                    )}

                    {/* Test alert */}
                    {isTest && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1.5 rounded-lg">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {app.testId?.title ? `Test assigned: "${app.testId.title}"` : "Assessment pending — complete it to advance"}
                      </div>
                    )}

                    {isOffer && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                        <FileText className="h-3.5 w-3.5" />
                        You have a job offer — view and respond in My Offers
                      </div>
                    )}

                    {/* Pipeline bar */}
                    <PipelineBar progress={pipelineProgress} isRejected={isRejected} isHired={isHired} />

                    {/* Rounds */}
                    {rounds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {rounds.map((r, i) => {
                          const passed = r.status === "passed";
                          const failed = r.status === "failed";
                          return (
                            <span key={r.stageKey || i}
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${
                                passed ? "bg-green-50 text-green-700 border-green-200" :
                                failed ? "bg-red-50 text-red-600 border-red-200" :
                                "bg-gray-50 text-gray-600 border-gray-200"
                              }`}>
                              {passed ? <CheckCircle2 className="h-3 w-3" /> : failed ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {r.roundName || STAGE_MAP[r.stageKey || ""] || r.stageKey}
                              {typeof r.latestScore === "number" && ` · ${r.latestScore}%`}
                            </span>
                          );
                        })}
                        {passedRounds > 0 && (
                          <span className="text-xs text-gray-400 self-center">{passedRounds}/{rounds.length} rounds passed</span>
                        )}
                      </div>
                    )}

                    {/* Current stage label */}
                    {app.currentStage && app.currentStage !== "application" && (
                      <div className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" />
                        Current stage: <span className="font-medium text-gray-600">{STAGE_MAP[app.currentStage] || app.currentStage}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {format(new Date(app.applicationDate), "MMM dd, yyyy")}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                      <Link href={`/dashboard/jobs/${app.jobDescriptionId._id}`}>
                        View Job <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                    {isTest && (
                      <Button size="sm" className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700" asChild>
                        <Link href={`/dashboard/job-seeker/tests/${app._id}`}>
                          <Play className="h-3 w-3 mr-1" /> Take Test
                        </Link>
                      </Button>
                    )}
                    {isInterview && (
                      <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700" asChild>
                        <Link href={`/dashboard/job-seeker/interviews/${app._id}`}>
                          <Video className="h-3 w-3 mr-1" /> View Interview
                        </Link>
                      </Button>
                    )}
                    {isOffer && (
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" asChild>
                        <Link href="/dashboard/job-seeker/offer-letters">
                          <FileText className="h-3 w-3 mr-1" /> View Offer
                        </Link>
                      </Button>
                    )}
                    {isHired && (
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" disabled>
                        <Star className="h-3 w-3 mr-1" /> Congratulations!
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Browse more CTA at bottom */}
        {applications.length > 0 && (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm mb-3">Keep applying to increase your chances</p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/jobs"><Send className="h-4 w-4 mr-2" /> Browse More Jobs</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
