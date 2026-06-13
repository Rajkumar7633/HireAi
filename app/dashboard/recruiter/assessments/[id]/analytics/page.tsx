"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
import {
  ScoreRing,
  DonutChart,
  FunnelBar,
  TrendLine,
  SkillBar,
  StatRing,
} from "@/components/ui/charts";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  Cell,
} from "recharts";
import {
  Users,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  Clock,
  Loader2,
  Trophy,
  Brain,
  Activity,
  AlertCircle,
  Info,
  XCircle,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Filter,
  TrendingDown,
  ArrowLeft,
  Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Insight {
  type: string;
  title: string;
  description: string;
  severity: "info" | "success" | "warning" | "error";
}

interface SkillAnalyticsItem {
  skill: string;
  averageCorrectRate: number;
  questionCount: number;
  passingCount: number;
  attemptedCount: number;
  skillPassRate: number;
  questions: {
    questionId: string;
    questionText: string;
    correctRate: number;
    difficulty: string;
  }[];
}

interface ProctoringStats {
  averageIntegrityScore: number;
  violationsDetected: number;
  highRiskCandidates: number;
  flaggedCandidates: number;
  riskDistribution: { low: number; medium: number; high: number; critical: number };
  commonViolations: { type: string; count: number; percentage: number }[];
}

interface QuestionAnalytics {
  questionId: string;
  questionText: string;
  difficulty: string;
  correctRate: number;
  averageTime: number;
  tags: string[];
  respondentCount: number;
  commonWrongAnswers: string[];
}

interface TimeAnalytics {
  timeRange: string;
  candidateCount: number;
  averageScore: number;
}

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface CandidateResult {
  candidateId: string;
  name: string;
  email: string;
  score: number;
  completedAt: string;
  duration: number;
  timeUsedPct: number;
  proctoringScore: number;
  tabSwitches: number;
  violationsCount: number;
  violationTypes: string[];
  multiFaceCount: number;
  noFaceDuration: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  status: "passed" | "failed" | "flagged";
  scoreByDifficulty: { easy: number | null; medium: number | null; hard: number | null };
  percentileRank: number;
  performanceTier: string;
}

interface AssessmentAnalytics {
  assessmentId: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  passingScore: number;
  difficulty?: string;
  status?: string;
  totalCandidates: number;
  completedCandidates: number;
  inProgressCount: number;
  notStartedCount: number;
  completionRate: number;
  dropoffRate: number;
  averageScore: number;
  medianScore: number;
  stdDevScore: number;
  p25: number;
  p75: number;
  p90: number;
  passRate: number;
  averageTime: number;
  proctoringStats: ProctoringStats;
  scoreDistribution: ScoreDistribution[];
  questionAnalytics: QuestionAnalytics[];
  skillAnalytics: SkillAnalyticsItem[];
  timeAnalytics: TimeAnalytics[];
  candidateResults: CandidateResult[];
  topPerformers: CandidateResult[];
  insights: Insight[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#f97316"];
const AUTO_REFRESH_MS = 60_000;

const SEVERITY_CONFIG = {
  success: {
    Icon: CheckCircle,
    bg: "bg-emerald-50",
    border: "border-l-emerald-500",
    text: "text-emerald-700",
    heading: "text-emerald-900",
  },
  info: {
    Icon: Info,
    bg: "bg-blue-50",
    border: "border-l-blue-500",
    text: "text-blue-700",
    heading: "text-blue-900",
  },
  warning: {
    Icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-l-amber-500",
    text: "text-amber-700",
    heading: "text-amber-900",
  },
  error: {
    Icon: XCircle,
    bg: "bg-rose-50",
    border: "border-l-rose-500",
    text: "text-rose-700",
    heading: "text-rose-900",
  },
};

const DIFF_COLOR: Record<string, string> = {
  Easy: "bg-green-100 text-green-700 border-green-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Hard: "bg-red-100 text-red-700 border-red-200",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(s: number): string {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scoreCol(v: number): string {
  return v >= 70 ? "#10b981" : v >= 50 ? "#f59e0b" : "#ef4444";
}

function exportCSV(rows: CandidateResult[], title: string): void {
  const headers = ["Name", "Email", "Score(%)", "Status", "Duration(min)", "Integrity", "TabSwitches", "Violations", "CompletedAt"];
  const data = rows.map((c) => [
    c.name, c.email, c.score, c.status.toUpperCase(),
    Math.round(c.duration / 60), c.proctoringScore,
    c.tabSwitches, c.violationsCount,
    c.completedAt ? new Date(c.completedAt).toLocaleString() : "—",
  ]);
  const csv = [headers, ...data]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${title}_candidates.csv`;
  a.click();
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssessmentAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = (params?.id ?? "") as string;

  const [analytics, setAnalytics] = useState<AssessmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [sortField, setSortField] = useState<keyof CandidateResult>("score");
  const [sortAsc, setSortAsc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "passed" | "failed" | "flagged">("all");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalytics = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/analytics`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAnalytics(data.analytics);
      setLastRefreshed(new Date());
    } catch (e: any) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchAnalytics();
    timerRef.current = setInterval(() => fetchAnalytics(true), AUTO_REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchAnalytics]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto" />
          <p className="mt-2 text-muted-foreground text-sm">Loading analytics…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error || !analytics) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
          <p className="font-semibold text-lg">Analytics Unavailable</p>
          <p className="text-sm text-muted-foreground">{error || "Unable to load analytics data."}</p>
          <Button onClick={() => fetchAnalytics()} className="bg-violet-600 hover:bg-violet-700">
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Sorted candidates ──
  const filteredCandidates = analytics.candidateResults
    .filter((c) => statusFilter === "all" || c.status === statusFilter)
    .sort((a, b) => {
      const av = a[sortField] as any, bv = b[sortField] as any;
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });

  const toggleSort = (f: keyof CandidateResult) => {
    if (sortField === f) setSortAsc((v) => !v);
    else { setSortField(f); setSortAsc(false); }
  };

  const SortBtn = ({ field }: { field: keyof CandidateResult }) =>
    sortField === field
      ? sortAsc ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />
      : <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-40" />;

  const funnelSteps = [
    { label: "Assigned", value: analytics.totalCandidates, color: "#7c3aed" },
    { label: "Started", value: analytics.completedCandidates + analytics.inProgressCount, color: "#0ea5e9" },
    { label: "Completed", value: analytics.completedCandidates, color: "#10b981" },
    { label: "Passed", value: Math.round((analytics.passRate / 100) * analytics.completedCandidates), color: "#16a34a" },
  ];

  const passedCount = Math.round((analytics.passRate / 100) * analytics.completedCandidates);

  return (
    <div className="p-6 space-y-6">

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div className="relative rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 text-white overflow-hidden">
        {/* dot pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%224%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10 -ml-2 h-7 px-2"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
              </Button>
              <span className="text-white/40 text-xs">·</span>
              {analytics.status && (
                <Badge className="bg-white/20 text-white border-white/30 text-xs">
                  {analytics.status}
                </Badge>
              )}
              {analytics.difficulty && (
                <Badge className="bg-white/10 text-white border-white/20 text-xs">
                  {analytics.difficulty}
                </Badge>
              )}
              {analytics.durationMinutes && (
                <Badge className="bg-white/10 text-white border-white/20 text-xs">
                  <Clock className="h-2.5 w-2.5 mr-1" />{analytics.durationMinutes}m
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold">{analytics.title}</h1>
            <p className="text-white/70 text-sm mt-0.5">Assessment Analytics &amp; Insights</p>
            {lastRefreshed && (
              <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
                {refreshing ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Refreshing…</>
                ) : (
                  <><Activity className="h-3 w-3" /> Updated {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 60s</>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-white text-violet-700 hover:bg-white/90 font-semibold"
              onClick={() => exportCSV(analytics.candidateResults, analytics.title)}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Inline hero stats */}
        <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Assigned", value: analytics.totalCandidates },
            { label: "Completed", value: analytics.completedCandidates },
            { label: "Pass Rate", value: `${analytics.passRate}%` },
            { label: "Avg Score", value: `${analytics.averageScore}%` },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl px-4 py-3 border border-white/20">
              <p className="text-white/60 text-xs font-medium uppercase tracking-wide">{s.label}</p>
              <p className="text-white text-2xl font-bold mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI Row 1: gradient cards ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Completion</p>
                <p className="text-3xl font-bold text-emerald-700 mt-1">{analytics.completionRate}%</p>
                <p className="text-xs text-emerald-600/70 mt-1">{analytics.completedCandidates}/{analytics.totalCandidates} done</p>
                <TrendLine
                  values={[
                    analytics.notStartedCount,
                    analytics.inProgressCount,
                    analytics.completedCandidates,
                    passedCount,
                  ]}
                  color="#10b981"
                  width={70}
                  height={28}
                />
              </div>
              <ScoreRing value={analytics.completionRate} size={64} stroke={6} color="#10b981" sublabel="rate" />
            </div>
          </CardContent>
        </Card>

        {/* Avg Score */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Avg Score</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{analytics.averageScore}%</p>
                <p className="text-xs text-blue-600/70 mt-1">Median {analytics.medianScore}% · ±{analytics.stdDevScore}</p>
                <TrendLine
                  values={analytics.scoreDistribution.map((d) => d.count)}
                  color="#3b82f6"
                  width={70}
                  height={28}
                />
              </div>
              <ScoreRing value={analytics.averageScore} size={64} stroke={6} color="#3b82f6" sublabel="avg" />
            </div>
          </CardContent>
        </Card>

        {/* Pass Rate */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-purple-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-violet-600 uppercase tracking-wide">Pass Rate</p>
                <p className="text-3xl font-bold text-violet-700 mt-1">{analytics.passRate}%</p>
                <p className="text-xs text-violet-600/70 mt-1">Threshold {analytics.passingScore}%</p>
                <TrendLine
                  values={[analytics.p25, analytics.medianScore, analytics.averageScore, analytics.p75, analytics.p90]}
                  color="#7c3aed"
                  width={70}
                  height={28}
                />
              </div>
              <ScoreRing value={analytics.passRate} size={64} stroke={6} color="#7c3aed" sublabel="pass" />
            </div>
          </CardContent>
        </Card>

        {/* Integrity */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Integrity</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">{analytics.proctoringStats.averageIntegrityScore}%</p>
                <p className="text-xs text-orange-600/70 mt-1">{analytics.proctoringStats.flaggedCandidates} flagged</p>
                <TrendLine
                  values={analytics.candidateResults.slice(0, 8).map((c) => c.proctoringScore)}
                  color="#f59e0b"
                  width={70}
                  height={28}
                />
              </div>
              <ScoreRing value={analytics.proctoringStats.averageIntegrityScore} size={64} stroke={6} color="#f59e0b" sublabel="avg" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── KPI Row 2: percentile + time + violations ─────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Score Spread</p>
            <div className="space-y-1.5">
              {[
                { l: "P90", v: analytics.p90, c: "#10b981" },
                { l: "P75", v: analytics.p75, c: "#3b82f6" },
                { l: "Median", v: analytics.medianScore, c: "#7c3aed" },
                { l: "P25", v: analytics.p25, c: "#ef4444" },
              ].map(({ l, v, c }) => (
                <SkillBar key={l} label={l} value={v} color={c} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Avg Time</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{fmtDuration(analytics.averageTime)}</p>
                {analytics.durationMinutes && (
                  <p className="text-xs text-muted-foreground mt-1">Limit: {analytics.durationMinutes}m</p>
                )}
              </div>
              <StatRing
                value={fmtDuration(analytics.averageTime)}
                label="avg duration"
                color="#0ea5e9"
                size={72}
                pct={analytics.durationMinutes ? Math.min(100, (analytics.averageTime / 60 / analytics.durationMinutes) * 100) : 60}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Violations</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-rose-600">{analytics.proctoringStats.violationsDetected}</p>
                <p className="text-xs text-muted-foreground mt-1">{analytics.proctoringStats.highRiskCandidates} high-risk</p>
              </div>
              <DonutChart
                size={72}
                slices={[
                  { label: "Flagged", value: analytics.proctoringStats.flaggedCandidates, color: "#ef4444" },
                  { label: "At Risk", value: Math.max(0, analytics.proctoringStats.highRiskCandidates - analytics.proctoringStats.flaggedCandidates), color: "#f59e0b" },
                  { label: "Clean", value: Math.max(0, analytics.completedCandidates - analytics.proctoringStats.highRiskCandidates), color: "#10b981" },
                ].filter((s) => s.value > 0)}
                innerLabel={`${analytics.proctoringStats.flaggedCandidates}`}
                innerSub="flagged"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Funnel</p>
            <FunnelBar steps={funnelSteps} maxWidth={180} />
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="h-10 gap-1 bg-muted p-1 rounded-xl overflow-x-auto flex-wrap">
          {["overview", "questions", "candidates", "proctoring", "leaderboard", "skills", "insights"].map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-lg text-sm capitalize">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ══ Overview ══════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Distribution */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Score Distribution</CardTitle>
                <CardDescription>Candidate performance across score ranges</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analytics.scoreDistribution} barCategoryGap="30%">
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="url(#barGrad)" radius={[4, 4, 0, 0]} name="Candidates" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Time vs Score */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Time vs Score</CardTitle>
                <CardDescription>Average score by time taken to complete</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={analytics.timeAnalytics}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="timeRange" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="averageScore"
                      stroke="#7c3aed"
                      fill="url(#areaGrad)"
                      strokeWidth={2}
                      dot={{ fill: "#7c3aed", r: 4 }}
                      name="Avg Score (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Percentile Bands */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Activity className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                Score Percentile Bands
              </CardTitle>
              <CardDescription>Where candidates cluster relative to each other</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "90th Percentile", value: analytics.p90, color: "#10b981", sub: "Top 10%" },
                  { label: "75th Percentile", value: analytics.p75, color: "#7c3aed", sub: "Upper quartile" },
                  { label: "Average", value: analytics.averageScore, color: "#f59e0b", sub: `Median ${analytics.medianScore}%` },
                  { label: "25th Percentile", value: analytics.p25, color: "#ef4444", sub: "Lower quartile" },
                ].map((b) => (
                  <div key={b.label} className="flex flex-col items-center gap-2">
                    <ScoreRing value={b.value} size={80} stroke={7} color={b.color} label={b.label} sublabel={b.sub} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Questions ═════════════════════════════════════════════ */}
        <TabsContent value="questions" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Question Performance</CardTitle>
              <CardDescription>Sorted by correct rate ascending — hardest first</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...analytics.questionAnalytics]
                  .sort((a, b) => a.correctRate - b.correctRate)
                  .map((q, i) => (
                    <div
                      key={q.questionId}
                      className={`rounded-xl border p-4 ${
                        q.correctRate >= 70
                          ? "border-emerald-200 bg-emerald-50/50"
                          : q.correctRate >= 40
                          ? "border-yellow-200 bg-yellow-50/50"
                          : "border-red-200 bg-red-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-xs font-semibold text-slate-500 bg-white border rounded-md px-1.5 py-0.5">
                              Q{i + 1}
                            </span>
                            <Badge variant="outline" className={`text-xs ${DIFF_COLOR[q.difficulty] ?? ""}`}>
                              {q.difficulty}
                            </Badge>
                            {q.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm font-medium leading-relaxed text-slate-800 line-clamp-2">{q.questionText}</p>

                          <div className="mt-3 flex items-center gap-4">
                            <div className="flex-1">
                              <SkillBar
                                label="Correct Rate"
                                value={q.correctRate}
                                color={scoreCol(q.correctRate)}
                              />
                            </div>
                            {q.averageTime > 0 && (
                              <span className="text-xs text-slate-500 shrink-0">
                                ⏱ {fmtDuration(q.averageTime)}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 shrink-0">
                              {q.respondentCount} answered
                            </span>
                          </div>

                          {q.commonWrongAnswers.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide mr-1">Wrong:</span>
                              {q.commonWrongAnswers.map((ans, j) => (
                                <span key={j} className="text-xs bg-red-50 border border-red-100 text-red-600 rounded-md px-1.5 py-0.5">
                                  {ans}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0">
                          <ScoreRing value={q.correctRate} size={56} stroke={5} color={scoreCol(q.correctRate)} sublabel="rate" />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Candidates ════════════════════════════════════════════ */}
        <TabsContent value="candidates" className="space-y-4">
          {/* Filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {(["all", "passed", "failed", "flagged"] as const).map((s) => {
              const count = s === "all" ? analytics.candidateResults.length : analytics.candidateResults.filter((c) => c.status === s).length;
              return (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  className={statusFilter === s ? "bg-violet-600 hover:bg-violet-700" : ""}
                  onClick={() => setStatusFilter(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${statusFilter === s ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                    {count}
                  </span>
                </Button>
              );
            })}
          </div>

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Candidate Results</CardTitle>
              <CardDescription>{filteredCandidates.length} candidates · click column headers to sort</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {([
                      { key: "name", label: "Candidate" },
                      { key: "score", label: "Score" },
                      { key: "proctoringScore", label: "Integrity" },
                      { key: "duration", label: "Time" },
                      { key: "tabSwitches", label: "Tab Switches" },
                      { key: "violationsCount", label: "Violations" },
                      { key: "status", label: "Status" },
                      { key: "completedAt", label: "Completed" },
                    ] as { key: keyof CandidateResult; label: string }[]).map(({ key, label }) => (
                      <th
                        key={key}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800 select-none whitespace-nowrap"
                        onClick={() => toggleSort(key)}
                      >
                        {label}<SortBtn field={key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c) => (
                    <tr key={c.candidateId} className="border-b hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-base" style={{ color: scoreCol(c.score) }}>{c.score}%</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${c.proctoringScore < 70 ? "text-red-600" : "text-emerald-600"}`}>
                          {c.proctoringScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtDuration(c.duration)}</td>
                      <td className="px-4 py-3">
                        <span className={c.tabSwitches > 3 ? "text-amber-600 font-semibold" : "text-slate-500"}>
                          {c.tabSwitches}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={c.violationsCount > 0 ? "text-red-500 font-semibold" : "text-slate-400"}>
                          {c.violationsCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            c.status === "passed"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : c.status === "flagged"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-red-100 text-red-700 border-red-200"
                          }
                          variant="outline"
                        >
                          {c.status === "flagged" && "⚠ "}{c.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{fmtDate(c.completedAt)}</td>
                    </tr>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        No candidates match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ Proctoring ════════════════════════════════════════════ */}
        <TabsContent value="proctoring" className="space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Avg Integrity Score", value: `${analytics.proctoringStats.averageIntegrityScore}%`, bg: "from-emerald-50 to-green-50 border-emerald-200", text: "text-emerald-700", sub: `${analytics.completedCandidates} candidates` },
              { label: "High Risk", value: analytics.proctoringStats.highRiskCandidates, bg: "from-red-50 to-rose-50 border-red-200", text: "text-red-700", sub: "integrity < 70%" },
              { label: "Flagged", value: analytics.proctoringStats.flaggedCandidates, bg: "from-amber-50 to-yellow-50 border-amber-200", text: "text-amber-700", sub: "review required" },
              { label: "Total Violations", value: analytics.proctoringStats.violationsDetected, bg: "from-purple-50 to-violet-50 border-purple-200", text: "text-purple-700", sub: `${analytics.proctoringStats.commonViolations.length} types` },
            ].map((s) => (
              <Card key={s.label} className={`border shadow-sm bg-gradient-to-br ${s.bg}`}>
                <CardContent className="p-5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${s.text}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Risk distribution */}
          {analytics.proctoringStats.riskDistribution && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Shield className="h-3.5 w-3.5 text-orange-600" />
                  </div>
                  Risk Level Distribution
                </CardTitle>
                <CardDescription>Candidates segmented by integrity score risk level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {([
                    { key: "low" as const, label: "Low Risk", desc: "≥90% integrity", color: "border-emerald-200 bg-emerald-50 text-emerald-700", bar: "#10b981" },
                    { key: "medium" as const, label: "Medium Risk", desc: "70–89% integrity", color: "border-yellow-200 bg-yellow-50 text-yellow-700", bar: "#f59e0b" },
                    { key: "high" as const, label: "High Risk", desc: "50–69% integrity", color: "border-orange-200 bg-orange-50 text-orange-700", bar: "#f97316" },
                    { key: "critical" as const, label: "Critical Risk", desc: "<50% integrity", color: "border-red-200 bg-red-50 text-red-700", bar: "#ef4444" },
                  ] as const).map((r) => {
                    const count = analytics.proctoringStats.riskDistribution[r.key];
                    const pct = analytics.completedCandidates > 0 ? Math.round((count / analytics.completedCandidates) * 100) : 0;
                    return (
                      <div key={r.key} className={`rounded-xl border p-4 ${r.color}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{r.label}</p>
                        <p className="text-3xl font-bold mt-1">{count}</p>
                        <p className="text-[11px] opacity-60 mt-0.5">{r.desc}</p>
                        <div className="mt-3 h-1.5 rounded-full bg-current/10 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: r.bar }} />
                        </div>
                        <p className="text-[11px] mt-1 opacity-60">{pct}% of completed</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Violation types + flagged candidates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Violation Types Detected</CardTitle>
                <CardDescription>Unique candidates affected per violation type</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.proctoringStats.commonViolations.length > 0 ? (
                  <>
                    <DonutChart
                      size={140}
                      slices={analytics.proctoringStats.commonViolations.slice(0, 5).map((v, i) => ({
                        label: v.type,
                        value: v.count,
                        color: CHART_COLORS[i],
                      }))}
                      innerLabel={`${analytics.proctoringStats.violationsDetected}`}
                      innerSub="total"
                    />
                    <div className="mt-4 space-y-2">
                      {analytics.proctoringStats.commonViolations.map((v, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <SkillBar label={v.type} value={v.percentage} color={CHART_COLORS[i % CHART_COLORS.length]} />
                          <span className="text-xs font-semibold text-slate-600 shrink-0">{v.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
                    <CheckCircle className="h-10 w-10 text-emerald-400" />
                    <p className="text-sm">No violations detected — all clean!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  </div>
                  Flagged Candidates
                </CardTitle>
                <CardDescription>Integrity score &lt; 70 — review submissions before hiring decisions</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.candidateResults.filter((c) => c.status === "flagged").length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-400">
                    <CheckCircle className="h-8 w-8 text-emerald-400" />
                    <p className="text-sm">No flagged candidates — great integrity!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {analytics.candidateResults
                      .filter((c) => c.status === "flagged")
                      .sort((a, b) => a.proctoringScore - b.proctoringScore)
                      .map((c) => (
                        <div key={c.candidateId} className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-slate-800">{c.name}</p>
                              <p className="text-xs text-slate-400 truncate">{c.email}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs shrink-0">
                              <div className="text-center">
                                <p className="text-slate-400">Score</p>
                                <p className="font-semibold" style={{ color: scoreCol(c.score) }}>{c.score}%</p>
                              </div>
                              <div className="text-center">
                                <p className="text-slate-400">Integrity</p>
                                <p className="font-semibold text-red-600">{c.proctoringScore}%</p>
                              </div>
                              <div className="text-center">
                                <p className="text-slate-400">Tab Sw.</p>
                                <p className={`font-semibold ${c.tabSwitches > 0 ? "text-amber-600" : "text-slate-400"}`}>{c.tabSwitches}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-slate-400">Violations</p>
                                <p className="font-semibold text-red-500">{c.violationsCount}</p>
                              </div>
                            </div>
                          </div>
                          {/* violation type chips */}
                          {c.violationTypes && c.violationTypes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {c.violationTypes.map((vt, vi) => (
                                <span key={vi} className="text-[10px] bg-red-100 border border-red-200 text-red-600 rounded px-1.5 py-0.5 font-medium">
                                  {vt.replace(/_/g, " ")}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Full candidate integrity detail table */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Full Integrity Report — All Candidates</CardTitle>
              <CardDescription>Multi-face detections, no-face duration, violation types, time used, and risk level per candidate</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    {["Candidate", "Score", "Integrity", "Risk", "Tab Switches", "Multi-Face", "No-Face (s)", "Time Used", "Violations", "Types"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analytics.candidateResults
                    .slice()
                    .sort((a, b) => a.proctoringScore - b.proctoringScore)
                    .map((c) => {
                      const riskBadge =
                        c.riskLevel === "low" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        c.riskLevel === "medium" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                        c.riskLevel === "high" ? "bg-orange-100 text-orange-700 border-orange-200" :
                        "bg-red-100 text-red-700 border-red-200";
                      return (
                        <tr key={c.candidateId} className={`border-b transition-colors ${c.status === "flagged" ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-slate-50/70"}`}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold" style={{ color: scoreCol(c.score) }}>{c.score}%</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${c.proctoringScore < 70 ? "text-red-600" : c.proctoringScore < 90 ? "text-yellow-600" : "text-emerald-600"}`}>
                              {c.proctoringScore}%
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs capitalize ${riskBadge}`}>
                              {c.riskLevel}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className={c.tabSwitches > 3 ? "text-red-600 font-semibold" : c.tabSwitches > 0 ? "text-amber-600" : "text-slate-400"}>
                              {c.tabSwitches}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={c.multiFaceCount > 0 ? "text-red-600 font-semibold" : "text-slate-400"}>
                              {c.multiFaceCount}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={c.noFaceDuration > 30 ? "text-red-600 font-semibold" : c.noFaceDuration > 0 ? "text-amber-600" : "text-slate-400"}>
                              {c.noFaceDuration > 0 ? c.noFaceDuration : "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 rounded-full bg-slate-100 w-16 overflow-hidden">
                                <div className="h-full rounded-full bg-blue-400" style={{ width: `${c.timeUsedPct}%` }} />
                              </div>
                              <span className="text-xs text-slate-500">{c.timeUsedPct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={c.violationsCount > 0 ? "text-red-500 font-semibold" : "text-slate-400"}>
                              {c.violationsCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <div className="flex flex-wrap gap-1">
                              {c.violationTypes && c.violationTypes.length > 0 ? (
                                c.violationTypes.slice(0, 3).map((vt, vi) => (
                                  <span key={vi} className="text-[10px] bg-red-50 border border-red-100 text-red-500 rounded px-1 py-0.5 whitespace-nowrap">
                                    {vt.replace(/_/g, " ")}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[10px] text-slate-300">none</span>
                              )}
                              {c.violationTypes && c.violationTypes.length > 3 && (
                                <span className="text-[10px] text-slate-400">+{c.violationTypes.length - 3}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {analytics.candidateResults.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground text-sm">
                        No completed candidates yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Integrity bar chart */}
          {analytics.candidateResults.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Integrity Score Visual — All Candidates</CardTitle>
                <CardDescription>Green = low risk · Amber = medium · Red = high/critical</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 items-end">
                  {analytics.candidateResults
                    .slice()
                    .sort((a, b) => b.proctoringScore - a.proctoringScore)
                    .map((c) => (
                      <div key={c.candidateId} className="flex flex-col items-center gap-1" title={`${c.name}: ${c.proctoringScore}%`}>
                        <div
                          className="w-8 rounded-t transition-all"
                          style={{
                            height: `${Math.max(8, (c.proctoringScore / 100) * 80)}px`,
                            backgroundColor:
                              c.proctoringScore >= 90 ? "#10b981" :
                              c.proctoringScore >= 70 ? "#f59e0b" :
                              c.proctoringScore >= 50 ? "#f97316" :
                              "#ef4444",
                            opacity: 0.8,
                          }}
                        />
                        <span className="text-[9px] text-slate-400 truncate w-8 text-center">{c.proctoringScore}%</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══ Leaderboard ═══════════════════════════════════════════ */}
        <TabsContent value="leaderboard" className="space-y-6">
          {analytics.topPerformers.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="py-16 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="font-semibold text-lg">No qualified candidates yet</p>
                <p className="text-sm text-muted-foreground mt-1">Top performers appear here once candidates complete the assessment.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary band */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Top Score", value: `${analytics.topPerformers[0]?.score ?? 0}%`, color: "text-yellow-700", bg: "from-yellow-50 to-amber-50 border-yellow-200" },
                  { label: "Top Integrity", value: `${Math.max(...analytics.topPerformers.map((c) => c.proctoringScore))}%`, color: "text-emerald-700", bg: "from-emerald-50 to-green-50 border-emerald-200" },
                  { label: "Fastest Finish", value: fmtDuration(Math.min(...analytics.topPerformers.filter((c) => c.duration > 0).map((c) => c.duration))), color: "text-blue-700", bg: "from-blue-50 to-cyan-50 border-blue-200" },
                  { label: "Elite Tier", value: `${analytics.topPerformers.filter((c) => c.performanceTier === "Elite").length} candidate${analytics.topPerformers.filter((c) => c.performanceTier === "Elite").length !== 1 ? "s" : ""}`, color: "text-violet-700", bg: "from-violet-50 to-purple-50 border-violet-200" },
                ].map((s) => (
                  <Card key={s.label} className={`border shadow-sm bg-gradient-to-br ${s.bg}`}>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                      <p className={`text-xl font-bold mt-1 truncate ${s.color}`}>{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <div className="w-6 h-6 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Trophy className="h-3.5 w-3.5 text-yellow-600" />
                    </div>
                    Top Performers Leaderboard
                  </CardTitle>
                  <CardDescription>Ranked by score · non-flagged candidates only · includes difficulty breakdown &amp; percentile</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topPerformers.map((c, i) => {
                      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                      const tierColor =
                        c.performanceTier === "Elite" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                        c.performanceTier === "Strong" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                        c.performanceTier === "Good" ? "bg-blue-100 text-blue-700 border-blue-200" :
                        "bg-slate-100 text-slate-600 border-slate-200";
                      const riskColor =
                        c.riskLevel === "low" ? "text-emerald-600" :
                        c.riskLevel === "medium" ? "text-yellow-600" :
                        c.riskLevel === "high" ? "text-orange-600" : "text-red-600";
                      return (
                        <div
                          key={c.candidateId}
                          className={`rounded-xl border p-4 transition-colors ${
                            i === 0 ? "bg-yellow-50 border-yellow-200" :
                            i === 1 ? "bg-slate-50 border-slate-200" :
                            i === 2 ? "bg-amber-50 border-amber-200" :
                            "bg-white border-slate-100 hover:bg-slate-50"
                          }`}
                        >
                          {/* Top row */}
                          <div className="flex items-center gap-4">
                            <div className="w-10 text-center shrink-0">
                              {medal ? <span className="text-2xl">{medal}</span> : <span className="text-sm font-bold text-slate-400">#{i + 1}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-slate-800">{c.name}</p>
                                <Badge variant="outline" className={`text-xs ${tierColor}`}>{c.performanceTier}</Badge>
                              </div>
                              <p className="text-xs text-slate-400 truncate">{c.email}</p>
                              <p className="text-xs text-slate-400 mt-0.5">Completed {fmtDate(c.completedAt)}</p>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 shrink-0 text-center">
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Score</p>
                                <p className="text-xl font-bold" style={{ color: scoreCol(c.score) }}>{c.score}%</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Percentile</p>
                                <p className="font-semibold text-slate-700">{c.percentileRank}<span className="text-[10px]">th</span></p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Integrity</p>
                                <p className={`font-semibold ${riskColor}`}>{c.proctoringScore}%</p>
                              </div>
                              <div className="hidden sm:block">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Time</p>
                                <p className="font-medium text-slate-600 text-xs">{fmtDuration(c.duration)}</p>
                              </div>
                              <div className="hidden sm:block">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Time Used</p>
                                <p className="font-medium text-slate-600 text-xs">{c.timeUsedPct}%</p>
                              </div>
                              <div className="hidden sm:block">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Violations</p>
                                <p className={`font-medium text-xs ${c.violationsCount > 0 ? "text-red-500" : "text-emerald-500"}`}>
                                  {c.violationsCount === 0 ? "None" : c.violationsCount}
                                </p>
                              </div>
                            </div>
                            <ScoreRing value={c.score} size={52} stroke={5} color={scoreCol(c.score)} />
                          </div>

                          {/* Difficulty breakdown row */}
                          {(c.scoreByDifficulty.easy !== null || c.scoreByDifficulty.medium !== null || c.scoreByDifficulty.hard !== null) && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center gap-6 flex-wrap">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">Score by difficulty:</span>
                              {c.scoreByDifficulty.easy !== null && (
                                <span className="flex items-center gap-1 text-xs">
                                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                  <span className="text-slate-500">Easy:</span>
                                  <span className="font-semibold text-green-700">{c.scoreByDifficulty.easy}%</span>
                                </span>
                              )}
                              {c.scoreByDifficulty.medium !== null && (
                                <span className="flex items-center gap-1 text-xs">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                                  <span className="text-slate-500">Medium:</span>
                                  <span className="font-semibold text-yellow-700">{c.scoreByDifficulty.medium}%</span>
                                </span>
                              )}
                              {c.scoreByDifficulty.hard !== null && (
                                <span className="flex items-center gap-1 text-xs">
                                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                                  <span className="text-slate-500">Hard:</span>
                                  <span className="font-semibold text-red-700">{c.scoreByDifficulty.hard}%</span>
                                </span>
                              )}
                              {c.tabSwitches > 0 && (
                                <span className="flex items-center gap-1 text-xs ml-auto">
                                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                                  <span className="text-amber-600 font-medium">{c.tabSwitches} tab switch{c.tabSwitches !== 1 ? "es" : ""}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Performance tier breakdown */}
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Performance Tier Distribution</CardTitle>
                  <CardDescription>How top performers are distributed across tiers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {(["Elite", "Strong", "Good", "Average", "Below Average"] as const).map((tier) => {
                      const cnt = analytics.topPerformers.filter((c) => c.performanceTier === tier).length;
                      const pct = analytics.topPerformers.length > 0 ? Math.round((cnt / analytics.topPerformers.length) * 100) : 0;
                      const colors: Record<string, string> = {
                        Elite: "border-yellow-200 bg-yellow-50 text-yellow-700",
                        Strong: "border-emerald-200 bg-emerald-50 text-emerald-700",
                        Good: "border-blue-200 bg-blue-50 text-blue-700",
                        Average: "border-slate-200 bg-slate-50 text-slate-600",
                        "Below Average": "border-red-200 bg-red-50 text-red-600",
                      };
                      return (
                        <div key={tier} className={`rounded-xl border p-3 text-center ${colors[tier]}`}>
                          <p className="text-xs font-medium">{tier}</p>
                          <p className="text-2xl font-bold mt-1">{cnt}</p>
                          <p className="text-[11px] opacity-70">{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ══ Skills ════════════════════════════════════════════════ */}
        <TabsContent value="skills" className="space-y-6">
          {analytics.skillAnalytics.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="py-16 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                <p className="font-semibold text-lg mb-1">No skill tags found</p>
                <p className="text-sm text-muted-foreground">Add tags to questions in the assessment editor to see skill breakdown here.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary band */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Skills Covered", value: String(analytics.skillAnalytics.length), color: "text-violet-700", bg: "from-violet-50 to-purple-50 border-violet-200" },
                  { label: "Strongest Skill", value: analytics.skillAnalytics[0]?.skill ?? "—", color: "text-emerald-700", bg: "from-emerald-50 to-green-50 border-emerald-200" },
                  { label: "Weakest Skill", value: analytics.skillAnalytics[analytics.skillAnalytics.length - 1]?.skill ?? "—", color: "text-red-700", bg: "from-red-50 to-rose-50 border-red-200" },
                  {
                    label: "Avg Skill Pass Rate",
                    value: `${analytics.skillAnalytics.length > 0 ? Math.round(analytics.skillAnalytics.reduce((s, sk) => s + sk.skillPassRate, 0) / analytics.skillAnalytics.length) : 0}%`,
                    color: "text-blue-700",
                    bg: "from-blue-50 to-cyan-50 border-blue-200",
                  },
                ].map((s) => (
                  <Card key={s.label} className={`border shadow-sm bg-gradient-to-br ${s.bg}`}>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
                      <p className={`text-xl font-bold mt-1 truncate ${s.color}`}>{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Brain className="h-3.5 w-3.5 text-violet-600" />
                      </div>
                      Avg Correct Rate by Skill
                    </CardTitle>
                    <CardDescription>Sorted best → worst — how well candidates answered each skill area</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, analytics.skillAnalytics.length * 44)}>
                      <BarChart data={analytics.skillAnalytics} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <YAxis type="category" dataKey="skill" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="averageCorrectRate" radius={[0, 4, 4, 0]} name="Avg Correct Rate (%)">
                          {analytics.skillAnalytics.map((e, i) => (
                            <Cell key={i} fill={scoreCol(e.averageCorrectRate)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Candidate Pass Rate by Skill</CardTitle>
                    <CardDescription>% of candidates who scored ≥70% on each skill area</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={Math.max(200, analytics.skillAnalytics.length * 44)}>
                      <BarChart data={analytics.skillAnalytics} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <YAxis type="category" dataKey="skill" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="skillPassRate" radius={[0, 4, 4, 0]} name="Skill Pass Rate (%)">
                          {analytics.skillAnalytics.map((e, i) => (
                            <Cell key={i} fill={scoreCol(e.skillPassRate)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {analytics.skillAnalytics.length >= 3 && (
                  <Card className="border shadow-sm lg:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">Skill Radar — Correct Rate vs Pass Rate</CardTitle>
                      <CardDescription>Multi-dimensional skill coverage: purple = avg correct rate, green = candidate pass rate</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={analytics.skillAnalytics.slice(0, 8)}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                          <Radar name="Avg Correct Rate" dataKey="averageCorrectRate" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} />
                          <Radar name="Skill Pass Rate" dataKey="skillPassRate" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                          <Legend />
                          <Tooltip formatter={(v) => [`${v}%`]} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Detailed per-skill cards with question drilldown */}
              <div className="space-y-4">
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Detailed Skill Breakdown</p>
                {analytics.skillAnalytics.map((s, i) => {
                  const level = s.averageCorrectRate >= 70 ? "Strong" : s.averageCorrectRate >= 40 ? "Average" : "Weak";
                  const levelColor =
                    level === "Strong" ? "bg-green-100 text-green-700 border-green-200" :
                    level === "Average" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                    "bg-red-100 text-red-700 border-red-200";
                  return (
                    <Card key={i} className="border shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-base font-semibold">{s.skill}</CardTitle>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className={`text-xs ${levelColor}`}>{level}</Badge>
                            <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-200">
                              {s.questionCount} question{s.questionCount !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Stats row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                          <div className="text-center p-3 rounded-lg bg-slate-50 border">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Avg Correct Rate</p>
                            <p className="text-2xl font-bold mt-1" style={{ color: scoreCol(s.averageCorrectRate) }}>{s.averageCorrectRate}%</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-slate-50 border">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Skill Pass Rate</p>
                            <p className="text-2xl font-bold mt-1 text-blue-600">{s.skillPassRate}%</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">≥70% on this skill</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-slate-50 border">
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Passing / Attempted</p>
                            <p className="text-2xl font-bold mt-1 text-slate-700">
                              {s.passingCount}<span className="text-sm text-slate-400">/{s.attemptedCount}</span>
                            </p>
                          </div>
                          <div className="flex justify-center items-center p-3">
                            <ScoreRing value={s.averageCorrectRate} size={72} stroke={6} color={scoreCol(s.averageCorrectRate)} sublabel="avg" />
                          </div>
                        </div>

                        {/* Progress bar for pass rate */}
                        <div className="mb-5">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Candidate pass rate on this skill</span>
                            <span className="font-semibold">{s.skillPassRate}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${s.skillPassRate}%`, backgroundColor: scoreCol(s.skillPassRate) }}
                            />
                          </div>
                        </div>

                        {/* Question drilldown */}
                        {s.questions && s.questions.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Questions in this skill</p>
                            <div className="space-y-2">
                              {s.questions.map((q, qi) => (
                                <div
                                  key={qi}
                                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                                    q.correctRate >= 70 ? "bg-emerald-50/60 border-emerald-100" :
                                    q.correctRate >= 40 ? "bg-yellow-50/60 border-yellow-100" :
                                    "bg-red-50/60 border-red-100"
                                  }`}
                                >
                                  <span className="text-[10px] font-bold text-slate-400 shrink-0">Q{qi + 1}</span>
                                  <Badge variant="outline" className={`text-xs shrink-0 ${DIFF_COLOR[q.difficulty] ?? ""}`}>
                                    {q.difficulty}
                                  </Badge>
                                  <p className="text-xs text-slate-700 flex-1 line-clamp-2">{q.questionText}</p>
                                  <div className="shrink-0 text-right">
                                    <p className="text-[10px] text-slate-400">Correct</p>
                                    <p className="font-bold text-sm" style={{ color: scoreCol(q.correctRate) }}>{q.correctRate}%</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {/* ══ Insights ══════════════════════════════════════════════ */}
        <TabsContent value="insights" className="space-y-6">
          {analytics.insights.length === 0 ? (
            <Card className="border shadow-sm">
              <CardContent className="py-16 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                <p className="font-semibold text-lg mb-1">No insights yet</p>
                <p className="text-sm text-muted-foreground">Complete more assessments to generate data-driven insights.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {analytics.insights.map((ins, i) => {
                const cfg = SEVERITY_CONFIG[ins.severity];
                const Icon = cfg.Icon;
                return (
                  <div key={i} className={`p-4 rounded-xl border-l-4 ${cfg.bg} ${cfg.border}`}>
                    <div className="flex items-start gap-2.5">
                      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.text}`} />
                      <div>
                        <p className={`font-semibold text-sm ${cfg.heading}`}>{ins.title}</p>
                        <p className={`text-sm mt-1 leading-relaxed ${cfg.text}`}>{ins.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-violet-600" />
                </div>
                Recommendations
              </CardTitle>
              <CardDescription>Suggested improvements for future assessments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.passRate < 40 && (
                <div className="flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Review Passing Threshold</p>
                    <p className="text-sm text-muted-foreground">Only {analytics.passRate}% passed. Consider whether {analytics.passingScore}% is calibrated for your candidate pool.</p>
                  </div>
                </div>
              )}
              {analytics.completionRate < 60 && (
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Improve Candidate Engagement</p>
                    <p className="text-sm text-muted-foreground">{100 - analytics.completionRate}% of candidates did not complete. Send reminders or check for technical blockers.</p>
                  </div>
                </div>
              )}
              {analytics.proctoringStats.flaggedCandidates > 0 && (
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Review Flagged Submissions</p>
                    <p className="text-sm text-muted-foreground">{analytics.proctoringStats.flaggedCandidates} flagged submission{analytics.proctoringStats.flaggedCandidates > 1 ? "s" : ""} need manual review. See the Proctoring tab.</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Optimize Question Mix</p>
                  <p className="text-sm text-muted-foreground">Aim for ~20% easy, 60% medium, and 20% hard questions for a balanced difficulty curve.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Track Trends Across Runs</p>
                  <p className="text-sm text-muted-foreground">Compare pass rates and scores across multiple assessment instances to identify improvement trends.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
