"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillBar } from "@/components/ui/charts";
import {
  Loader2,
  Shield,
  Camera,
  Mic,
  Monitor,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  FileText,
  Brain,
  Target,
  RefreshCw,
  Code2,
  Terminal,
  Trophy,
  ChevronRight,
  Sparkles,
  XCircle,
  Timer,
  BookOpen,
  TrendingUp,
  ListFilter,
  Activity,
  Zap,
} from "lucide-react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Assessment {
  _id: string;
  type: "assessment" | "coding_test";
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  totalPoints: number;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "Available" | "In Progress" | "Completed" | "Expired";
  score?: number | null;
  completedAt?: string | null;
  jobTitle: string;
  companyName: string;
  requiresProctoring: boolean;
  securityFeatures: string[];
  applicationId?: string;
  assignedAt?: string;
  isCodingChallenge?: boolean;
  takeUrl: string;
}

type FilterTab = "all" | "available" | "completed" | "coding" | "assessment";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const DIFF_CFG: Record<string, { label: string; cls: string }> = {
  Easy:   { label: "Easy",   cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  Medium: { label: "Medium", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  Hard:   { label: "Hard",   cls: "text-rose-700 bg-rose-50 border-rose-200" },
};

const STATUS_CFG: Record<string, { dot: string; label: string; cls: string }> = {
  Available:   { dot: "bg-emerald-500", label: "Available",   cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  "In Progress":{ dot: "bg-blue-500 animate-pulse", label: "In Progress", cls: "text-blue-700 bg-blue-50 border-blue-200" },
  Completed:   { dot: "bg-slate-400",  label: "Completed",   cls: "text-slate-600 bg-slate-100 border-slate-200" },
  Expired:     { dot: "bg-rose-500",   label: "Expired",     cls: "text-rose-700 bg-rose-50 border-rose-200" },
};

function relativeTime(d?: string | null) {
  if (!d) return null;
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ScoreRing({ score }: { score: number }) {
  const passed = score >= 70;
  const size = 56;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={4}
          className="stroke-slate-100" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={4}
          fill="none"
          stroke={passed ? "#16a34a" : "#f97316"}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute text-sm font-bold ${passed ? "text-green-600" : "text-orange-500"}`}>
        {score}%
      </span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsSince, setSecondsSince] = useState(0);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchAssessments();
    const interval = setInterval(() => fetchAssessments(false), 30000);
    return () => {
      clearInterval(interval);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Live "last updated X sec ago" ticker
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    setSecondsSince(0);
    tickRef.current = setInterval(() => setSecondsSince(s => s + 1), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [lastUpdated]);

  const fetchAssessments = async (showRefreshing = true) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);
      const response = await fetch("/api/assessments/my-assessments");
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.assessments || []);
        setLastUpdated(new Date());
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch assessments");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch assessments");
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const available  = assessments.filter(a => a.status === "Available").length;
  const completed  = assessments.filter(a => a.status === "Completed");
  const avgScore   = completed.length
    ? Math.round(completed.reduce((s, a) => s + (a.score ?? 0), 0) / completed.length)
    : null;
  const passed     = completed.filter(a => (a.score ?? 0) >= 70).length;
  const coding     = assessments.filter(a => a.type === "coding_test");
  const proctored  = assessments.filter(a => a.type === "assessment");

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = assessments.filter(a => {
    if (filter === "available")  return a.status === "Available" || a.status === "In Progress";
    if (filter === "completed")  return a.status === "Completed" || a.status === "Expired";
    if (filter === "coding")     return a.type === "coding_test";
    if (filter === "assessment") return a.type === "assessment";
    return true;
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        </div>
        <p className="text-sm text-slate-500">Loading your assessments…</p>
      </div>
    );
  }

  const TABS: { id: FilterTab; label: string; count?: number }[] = [
    { id: "all",        label: "All",          count: assessments.length },
    { id: "available",  label: "To Do",         count: available + assessments.filter(a => a.status === "In Progress").length },
    { id: "completed",  label: "Completed",    count: completed.length },
    { id: "coding",     label: "Coding Tests", count: coding.length },
    { id: "assessment", label: "Assessments",  count: proctored.length },
  ];

  return (
    <div className="p-6 space-y-6">

        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Tests & Assessments</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Assigned by recruiters for your active applications
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Real-time indicator */}
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Updated {secondsSince < 5 ? "just now" : `${secondsSince}s ago`}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAssessments(true)}
              disabled={refreshing}
              className="h-8 text-xs gap-1.5 border-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" variant="outline" asChild className="h-8 text-xs border-slate-200">
              <Link href="/dashboard/job-seeker/applications">Applications</Link>
            </Button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button
              className="ml-auto text-xs underline"
              onClick={() => fetchAssessments(true)}
            >Retry</button>
          </div>
        )}

        {/* ── Stats row ── */}
        {assessments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={<Activity className="h-4 w-4 text-violet-600" />}
              bg="bg-violet-50"
              label="Total Assigned"
              value={assessments.length}
            />
            <StatCard
              icon={<Zap className="h-4 w-4 text-amber-600" />}
              bg="bg-amber-50"
              label="Ready to Start"
              value={available}
              highlight={available > 0}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              bg="bg-emerald-50"
              label="Avg Score"
              value={avgScore !== null ? `${avgScore}%` : "—"}
            />
            <StatCard
              icon={<Trophy className="h-4 w-4 text-sky-600" />}
              bg="bg-sky-50"
              label="Passed (≥70%)"
              value={`${passed}/${completed.length}`}
            />
          </div>
        )}

        {/* ── Proctoring notice ── */}
        {proctored.some(a => a.status === "Available") && (
          <div className="flex items-center gap-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <Shield className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-xs font-medium text-amber-700">Secure environment required for AI-proctored assessments:</span>
            <div className="flex items-center gap-3 text-xs text-amber-600 ml-auto">
              <span className="flex items-center gap-1"><Camera className="h-3 w-3" /> Webcam</span>
              <span className="flex items-center gap-1"><Mic className="h-3 w-3" /> Audio</span>
              <span className="flex items-center gap-1"><Monitor className="h-3 w-3" /> Screen</span>
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-slate-400" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-slate-700 mb-1">No tests assigned yet</h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Apply to jobs and recruiters will assign coding tests or MCQ assessments when they're ready to evaluate you.
              </p>
            </div>
            <Button asChild className="bg-violet-600 hover:bg-violet-700 h-9 text-sm mt-1">
              <Link href="/dashboard/jobs">Browse Jobs</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* ── Filter tabs ── */}
            <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-xl p-1 w-fit flex-wrap">
              <ListFilter className="h-3.5 w-3.5 text-slate-400 ml-1 mr-0.5" />
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === tab.id
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`text-[10px] px-1 rounded ${
                      filter === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Cards ── */}
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                No items match this filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(item =>
                  item.type === "coding_test" ? (
                    <CodingTestCard key={item._id} test={item} />
                  ) : (
                    <AssessmentCard key={item._id} assessment={item} />
                  )
                )}
              </div>
            )}
          </>
        )}
    </div>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon, bg, label, value, highlight,
}: {
  icon: React.ReactNode
  bg: string
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div className={`${bg} border border-white rounded-xl p-4 flex items-center gap-3`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className={`text-xl font-bold leading-none ${highlight ? "text-amber-700" : "text-slate-800"}`}>
          {value}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Coding Test Card ───────────────────────────────────────────────────────────

function CodingTestCard({ test }: { test: Assessment }) {
  const status = STATUS_CFG[test.status] ?? STATUS_CFG["Available"];
  const diff   = DIFF_CFG[test.difficulty] ?? DIFF_CFG["Medium"];
  const passed = (test.score ?? 0) >= 70;

  return (
    <div className={`bg-white rounded-2xl border transition-shadow hover:shadow-md ${
      test.status === "Available" ? "border-violet-100 ring-1 ring-violet-50" : "border-slate-100"
    }`}>
      {/* Left accent strip + main content */}
      <div className="flex">
        {/* Colored left strip */}
        <div className={`w-1 rounded-l-2xl shrink-0 ${
          test.status === "Available"   ? "bg-violet-500" :
          test.status === "In Progress" ? "bg-blue-400" :
          test.status === "Completed"   ? (passed ? "bg-emerald-400" : "bg-orange-400") :
          "bg-slate-300"
        }`} />

        <div className="flex-1 min-w-0 p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left: meta */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title row */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-violet-50 shrink-0">
                  <Terminal className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 truncate">{test.title}</h3>
                <Badge variant="outline" className={`text-[10px] h-4.5 px-1.5 ${diff.cls}`}>
                  {diff.label}
                </Badge>
              </div>

              {/* Job + company */}
              <p className="text-xs text-slate-500">
                {test.jobTitle}{test.companyName !== "HireAI" ? ` · ${test.companyName}` : ""}
              </p>

              {/* Stat pills */}
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />{test.durationMinutes} min
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />{test.totalQuestions} problem{test.totalQuestions !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />{test.totalPoints} pts
                </span>
                {test.isCodingChallenge ? (
                  <span className="flex items-center gap-1 text-violet-600">
                    <Code2 className="h-3 w-3" />Coding Challenge
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400">
                    <Sparkles className="h-3 w-3" />Mixed Test
                  </span>
                )}
              </div>

              {/* Assigned time */}
              {test.assignedAt && (
                <p className="text-[10px] text-slate-400">
                  Assigned {relativeTime(test.assignedAt)}
                </p>
              )}

              {/* "Ready to start" callout */}
              {test.status === "Available" && (
                <div className="flex items-center gap-2 mt-1 text-xs text-violet-700 bg-violet-50 border border-violet-100 rounded-lg px-3 py-1.5 w-fit">
                  <Zap className="h-3 w-3" />
                  Choose any language — code is auto-evaluated by Judge0
                </div>
              )}

              {/* Score progress */}
              {test.status === "Completed" && test.score != null && (
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 max-w-[180px]"><SkillBar label="" value={test.score} color={passed ? "#10b981" : "#f59e0b"} /></div>
                  <span className={`text-xs font-semibold ${passed ? "text-emerald-600" : "text-orange-500"}`}>
                    {passed ? "Passed" : "Below 70%"}
                  </span>
                </div>
              )}
            </div>

            {/* Right: score ring or CTA */}
            <div className="flex flex-col items-end gap-3 shrink-0">
              {test.score != null ? (
                <ScoreRing score={test.score} />
              ) : (
                <StatusDot status={test.status} />
              )}

              {/* Action button */}
              {test.status === "Available" && (
                <Button asChild size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700 gap-1.5">
                  <Link href={test.takeUrl}>
                    <Play className="h-3.5 w-3.5 fill-white" />
                    Start Test
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
              {test.status === "In Progress" && (
                <Button asChild size="sm" variant="outline" className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Link href={test.takeUrl}>Continue</Link>
                </Button>
              )}
              {test.status === "Completed" && (
                <Button asChild size="sm" variant="outline" className="h-8 text-xs border-slate-200">
                  <Link href={test.takeUrl}>View</Link>
                </Button>
              )}
              {test.status === "Expired" && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-rose-400" />Expired
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Assessment Card ─────────────────────────────────────────────────────────

function AssessmentCard({ assessment }: { assessment: Assessment }) {
  const status = STATUS_CFG[assessment.status] ?? STATUS_CFG["Available"];
  const diff   = DIFF_CFG[assessment.difficulty] ?? DIFF_CFG["Medium"];
  const passed = (assessment.score ?? 0) >= 70;

  return (
    <div className={`bg-white rounded-2xl border transition-shadow hover:shadow-md ${
      assessment.status === "Available" ? "border-blue-100 ring-1 ring-blue-50" : "border-slate-100"
    }`}>
      <div className="flex">
        <div className={`w-1 rounded-l-2xl shrink-0 ${
          assessment.status === "Available"   ? "bg-blue-500" :
          assessment.status === "In Progress" ? "bg-indigo-400" :
          assessment.status === "Completed"   ? (passed ? "bg-emerald-400" : "bg-orange-400") :
          "bg-slate-300"
        }`} />

        <div className="flex-1 min-w-0 p-5">
          <div className="flex items-start justify-between gap-4">
            {/* Left: meta */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-50 shrink-0">
                  <Brain className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 truncate">{assessment.title}</h3>
                <Badge variant="outline" className={`text-[10px] px-1.5 ${diff.cls}`}>{diff.label}</Badge>
                {assessment.requiresProctoring && (
                  <Badge variant="outline" className="text-[10px] px-1.5 text-blue-700 bg-blue-50 border-blue-200">
                    <Shield className="h-2.5 w-2.5 mr-0.5" />Proctored
                  </Badge>
                )}
              </div>

              <p className="text-xs text-slate-500">
                {assessment.jobTitle}
                {assessment.companyName && assessment.companyName !== "HireAI"
                  ? ` · ${assessment.companyName}` : ""}
              </p>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{assessment.durationMinutes} min</span>
                <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{assessment.totalQuestions} questions</span>
                <span className="flex items-center gap-1"><Target className="h-3 w-3" />{assessment.totalPoints} pts</span>
              </div>

              {assessment.description && (
                <p className="text-xs text-slate-400 line-clamp-1">{assessment.description}</p>
              )}

              {assessment.assignedAt && (
                <p className="text-[10px] text-slate-400">Assigned {relativeTime(assessment.assignedAt)}</p>
              )}

              {/* Security features */}
              {assessment.securityFeatures.length > 0 && assessment.status === "Available" && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {assessment.securityFeatures.slice(0, 4).map((f, i) => (
                    <span key={i} className="text-[10px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5">{f}</span>
                  ))}
                  {assessment.securityFeatures.length > 4 && (
                    <span className="text-[10px] text-slate-400">+{assessment.securityFeatures.length - 4} more</span>
                  )}
                </div>
              )}

              {/* Status message */}
              {assessment.status === "In Progress" && (
                <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 w-fit">
                  <Timer className="h-3 w-3" />Resume where you left off
                </div>
              )}

              {assessment.status === "Expired" && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-1.5 w-fit">
                  <AlertTriangle className="h-3 w-3" />Assessment window has closed
                </div>
              )}

              {/* Score progress */}
              {assessment.status === "Completed" && assessment.score != null && (
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex-1 max-w-[180px]"><SkillBar label="" value={assessment.score} color={passed ? "#10b981" : "#f59e0b"} /></div>
                  <span className={`text-xs font-semibold ${passed ? "text-emerald-600" : "text-orange-500"}`}>
                    {passed ? "Passed" : "Below 70%"}
                  </span>
                </div>
              )}

              {assessment.status === "Completed" && assessment.completedAt && (
                <p className="text-[10px] text-slate-400">
                  Completed {new Date(assessment.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>

            {/* Right */}
            <div className="flex flex-col items-end gap-3 shrink-0">
              {assessment.score != null ? (
                <ScoreRing score={assessment.score} />
              ) : (
                <StatusDot status={assessment.status} />
              )}

              {assessment.status === "Available" && (
                <Button asChild size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 gap-1.5">
                  <Link href={assessment.takeUrl}>
                    <Play className="h-3.5 w-3.5 fill-white" />
                    Start
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
              {assessment.status === "In Progress" && (
                <Button asChild size="sm" variant="outline" className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                  <Link href={assessment.takeUrl}>Continue</Link>
                </Button>
              )}
              {assessment.status === "Completed" && (
                <Button asChild size="sm" variant="outline" className="h-8 text-xs border-slate-200">
                  <Link
                    href={`/dashboard/job-seeker/assessments/${assessment.applicationId}/results`}
                  >
                    Results
                  </Link>
                </Button>
              )}
              {assessment.status === "Expired" && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-rose-400" />Expired
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status dot indicator ───────────────────────────────────────────────────────

function StatusDot({ status }: { status: Assessment["status"] }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG["Available"];
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
      <span className="text-xs text-slate-500">{cfg.label}</span>
    </div>
  );
}
