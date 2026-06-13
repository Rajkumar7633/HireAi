"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Users, RefreshCw, Clock, DollarSign, Target,
  Filter, Download, BarChart3, Brain, ChevronRight,
  ArrowUpRight, ArrowDownRight, CheckCircle, XCircle,
  AlertTriangle, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
  AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
  LabelList,
} from "recharts";
import { SkillBar } from "@/components/ui/charts";

interface AnalyticsData {
  totalJobDescriptions: number;
  totalApplications: number;
  applicationsByStatus: { _id: string; count: number }[];
  topSkills: { _id: string; count: number }[];
  averageMatchScore: number;
}

interface AdvancedMetrics {
  hiringFunnel: { applied: number; screened: number; interviewed: number; offered: number; hired: number };
  sourcePerformance: Array<{ source: string; applications: number; hires: number; conversionRate: number }>;
  timeToHire: { average: number; byPosition: Array<{ position: string; days: number }> };
  costPerHire: { total: number; breakdown: { jobBoards: number; recruiting: number; interviews: number; onboarding: number } };
  monthlyTrends: Array<{ month: string; applications: number; hires: number; interviews: number }>;
  candidateQuality: { averageScore: number; scoreDistribution: Array<{ range: string; count: number }> };
}

const COLORS = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#f97316"];
const FUNNEL_COLORS = ["#7c3aed", "#818cf8", "#38bdf8", "#34d399", "#6ee7b7"];

const STAGE_TARGETS: Record<string, number> = { Screened: 80, Interviewed: 60, Offered: 30, Hired: 20 };

function DeltaBadge({ value, inverse = false, unit = "%" }: { value: number; inverse?: boolean; unit?: string }) {
  const isPositive = inverse ? value < 0 : value > 0;
  if (value === 0) return <span className="text-xs text-slate-400">No change</span>;
  return (
    <span className={`inline-flex items-center text-xs font-medium ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(1)}{unit} vs last
    </span>
  );
}

const EmptyChart = ({ label, cta, href }: { label: string; cta?: string; href?: string }) => (
  <div className="flex flex-col items-center justify-center h-[260px] gap-3">
    <BarChart3 className="h-10 w-10 text-muted-foreground/30" />
    <p className="text-sm text-muted-foreground">{label}</p>
    {cta && href && (
      <a href={href} className="text-xs px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 transition-colors">
        {cta}
      </a>
    )}
  </div>
);

export default function RecruiterAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [advancedMetrics, setAdvancedMetrics] = useState<AdvancedMetrics | null>(null);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingAdvanced, setLoadingAdvanced] = useState(true);
  const loading = loadingBase || loadingAdvanced;
  const [timeRange, setTimeRange] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("recruiter:analytics:range") || "6months" : "6months"
  );
  const [normalizeFunnel, setNormalizeFunnel] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("recruiter:analytics:norm") !== "0" : true
  );
  const [compare, setCompare] = useState(false);
  const [drill, setDrill] = useState<{ title: string; items: Array<{ label: string; value: number; query?: Record<string, string> }> } | null>(null);
  const [views, setViews] = useState<Array<{ name: string; payload: { timeRange: string; normalizeFunnel: boolean } }>>(() => {
    try { return JSON.parse(localStorage.getItem("recruiter:analytics:savedViews") || "[]"); } catch { return []; }
  });
  const [newViewName, setNewViewName] = useState("");
  const { toast } = useToast();

  const loadView = (v: { name: string; payload: { timeRange: string; normalizeFunnel: boolean } }) => {
    setTimeRange(v.payload.timeRange);
    setNormalizeFunnel(v.payload.normalizeFunnel);
  };

  const deleteView = (name: string) => {
    const updated = views.filter((v) => v.name !== name);
    setViews(updated);
    try { localStorage.setItem("recruiter:analytics:savedViews", JSON.stringify(updated)); } catch {}
  };

  const saveCurrentView = () => {
    const name = newViewName.trim();
    if (!name) return;
    const updated = [...views.filter((v) => v.name !== name), { name, payload: { timeRange, normalizeFunnel } }];
    setViews(updated);
    try { localStorage.setItem("recruiter:analytics:savedViews", JSON.stringify(updated)); } catch {}
    setNewViewName("");
    toast({ title: "View saved", description: `"${name}" saved successfully.` });
  };

  useEffect(() => {
    fetchAnalytics();
    fetchAdvancedMetrics();
  }, [timeRange]);

  useEffect(() => {
    try {
      localStorage.setItem("recruiter:analytics:range", timeRange);
      localStorage.setItem("recruiter:analytics:norm", normalizeFunnel ? "1" : "0");
    } catch {}
  }, [timeRange, normalizeFunnel]);

  const fetchWithTimeout = async (url: string, ms = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(url, { credentials: "include", signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingBase(true);
    try {
      const res = await fetchWithTimeout("/api/analytics/recruiter-dashboard");
      if (res.ok) setAnalyticsData(await res.json());
    } catch {}
    finally { setLoadingBase(false); }
  };

  const fetchAdvancedMetrics = async () => {
    setLoadingAdvanced(true);
    try {
      const res = await fetchWithTimeout(`/api/analytics/advanced-metrics?timeRange=${timeRange}`);
      if (res.ok) setAdvancedMetrics(await res.json());
    } catch {}
    finally { setLoadingAdvanced(false); }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const rawFunnel = advancedMetrics
    ? [
        { name: "Applied",     value: advancedMetrics.hiringFunnel.applied,     fill: FUNNEL_COLORS[0] },
        { name: "Screened",    value: advancedMetrics.hiringFunnel.screened,     fill: FUNNEL_COLORS[1] },
        { name: "Interviewed", value: advancedMetrics.hiringFunnel.interviewed,  fill: FUNNEL_COLORS[2] },
        { name: "Offered",     value: advancedMetrics.hiringFunnel.offered,      fill: FUNNEL_COLORS[3] },
        { name: "Hired",       value: advancedMetrics.hiringFunnel.hired,        fill: FUNNEL_COLORS[4] },
      ]
    : [];

  const funnelData = useMemo(() => {
    if (!normalizeFunnel) return rawFunnel;
    return rawFunnel.reduce((acc: typeof rawFunnel, stage) => {
      const prev = acc.length ? acc[acc.length - 1].value : stage.value;
      acc.push({ ...stage, value: Math.min(stage.value, prev) });
      return acc;
    }, []);
  }, [rawFunnel, normalizeFunnel]);

  const trends = advancedMetrics?.monthlyTrends || [];
  const lastTrend = trends.length > 0 ? trends[trends.length - 1] : null;
  const prevTrend = trends.length > 1 ? trends[trends.length - 2] : null;
  const pct = (a: number, b: number) => (!b ? 0 : ((a - b) / b) * 100);
  const appsDelta = lastTrend && prevTrend ? pct(lastTrend.applications, prevTrend.applications) : 0;
  const convNow = lastTrend?.applications ? (lastTrend.hires / lastTrend.applications) * 100 : 0;
  const convPrev = prevTrend?.applications ? (prevTrend.hires / prevTrend.applications) * 100 : 0;
  const convDelta = pct(convNow, convPrev || 0.0001);
  const timeAvg = advancedMetrics?.timeToHire.average || 0;
  const cph = advancedMetrics?.costPerHire.total || 0;
  const convRate = advancedMetrics
    ? advancedMetrics.hiringFunnel.applied > 0
      ? ((advancedMetrics.hiringFunnel.hired / advancedMetrics.hiringFunnel.applied) * 100).toFixed(1)
      : "0.0"
    : "0.0";

  const costBreakdownData = advancedMetrics
    ? [
        { name: "Job Boards", value: advancedMetrics.costPerHire.breakdown.jobBoards, fill: COLORS[0] },
        { name: "Recruiting", value: advancedMetrics.costPerHire.breakdown.recruiting, fill: COLORS[1] },
        { name: "Interviews", value: advancedMetrics.costPerHire.breakdown.interviews, fill: COLORS[2] },
        { name: "Onboarding", value: advancedMetrics.costPerHire.breakdown.onboarding, fill: COLORS[3] },
      ]
    : [];

  // AI Insight signals
  const aiInsights = useMemo(() => {
    const insights: { type: "good" | "warn" | "bad"; text: string }[] = [];
    if (!advancedMetrics) return insights;
    const f = advancedMetrics.hiringFunnel;
    const screenRate = f.applied ? (f.screened / f.applied) * 100 : 0;
    const interviewRate = f.screened ? (f.interviewed / f.screened) * 100 : 0;
    const offerRate = f.interviewed ? (f.offered / f.interviewed) * 100 : 0;
    const acceptRate = f.offered ? (f.hired / f.offered) * 100 : 0;

    if (screenRate > 75) insights.push({ type: "good", text: `Strong screening rate — ${screenRate.toFixed(0)}% of applicants pass screening.` });
    else if (screenRate < 40 && f.applied > 0) insights.push({ type: "warn", text: `Low screening rate (${screenRate.toFixed(0)}%) — consider revising job description keywords to attract better-fit candidates.` });

    if (offerRate > 50) insights.push({ type: "good", text: `High interview-to-offer rate (${offerRate.toFixed(0)}%) — your interview process converts well.` });
    else if (offerRate < 20 && f.interviewed > 5) insights.push({ type: "bad", text: `Low offer rate (${offerRate.toFixed(0)}%) — many interviews not leading to offers; review interview criteria or candidate quality.` });

    if (acceptRate < 70 && f.offered > 3) insights.push({ type: "warn", text: `${(100 - acceptRate).toFixed(0)}% of offers are declined — consider improving compensation benchmarking or offer timing.` });

    if (advancedMetrics.timeToHire.average > 30) insights.push({ type: "warn", text: `Avg. time-to-hire is ${advancedMetrics.timeToHire.average} days — streamline interview rounds to reduce drop-off.` });
    else if (advancedMetrics.timeToHire.average > 0 && advancedMetrics.timeToHire.average <= 18) insights.push({ type: "good", text: `Excellent time-to-hire (${advancedMetrics.timeToHire.average} days) — well below the 25-day industry average.` });

    if (insights.length === 0 && f.applied > 0) insights.push({ type: "good", text: "Your hiring funnel metrics look healthy! Keep monitoring as more applications come in." });
    if (f.applied === 0) insights.push({ type: "warn", text: "No applications yet. Post a job and invite candidates to start seeing analytics." });

    return insights.slice(0, 4);
  }, [advancedMetrics]);

  // Radar data for candidate quality profile
  const radarData = useMemo(() => {
    if (!analyticsData) return [];
    const total = analyticsData.totalApplications || 1;
    const byStatus = analyticsData.applicationsByStatus || [];
    const get = (s: string) => byStatus.find((x) => x._id === s)?.count || 0;
    return [
      { subject: "Applied", A: Math.min(100, (total / Math.max(total, 1)) * 100) },
      { subject: "Reviewed", A: Math.min(100, ((get("Under Review") + get("Shortlisted")) / total) * 100) },
      { subject: "Tested", A: Math.min(100, ((get("Test Passed") + get("Test Failed")) / total) * 100) },
      { subject: "Interviewed", A: Math.min(100, (get("Interview Scheduled") / total) * 100) },
      { subject: "Hired", A: Math.min(100, (get("Hired") / total) * 100) },
    ];
  }, [analyticsData]);

  // Drop-off per funnel stage
  const dropOffs = useMemo(() => {
    if (funnelData.length < 2) return [];
    return funnelData.slice(1).map((stage, i) => {
      const prev = funnelData[i].value;
      const dropPct = prev > 0 ? ((prev - stage.value) / prev) * 100 : 0;
      return { stage: stage.name, dropped: prev - stage.value, dropPct };
    });
  }, [funnelData]);

  const downloadCsv = () => {
    const rows = [
      ["Stage", "Count", "Drop %", "vs Target"],
      ...funnelData.map((s, i) => {
        const drop = dropOffs[i - 1];
        const target = STAGE_TARGETS[s.name];
        return [s.name, String(s.value), drop ? drop.dropPct.toFixed(1) + "%" : "-", target ? `${target}%` : "-"];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600 mx-auto" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── Hero Header ── */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" /> Advanced Analytics
            </h1>
            <p className="text-white/70 text-sm mt-1">Real-time recruitment intelligence & hiring insights</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Time range */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-38 bg-white/15 border-white/30 text-white [&>svg]:text-white h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>

            {/* Save view */}
            <div className="flex items-center gap-1.5">
              <input
                className="border border-white/30 bg-white/10 text-white placeholder:text-white/50 rounded-lg px-2.5 py-1.5 text-xs w-28"
                placeholder="Save view…"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveCurrentView()}
              />
              {views.length > 0 && (
                <select
                  className="border border-white/30 bg-white/10 text-white rounded-lg px-2 py-1.5 text-xs"
                  onChange={(e) => { const v = views.find((x) => x.name === e.target.value); if (v) loadView(v); }}
                >
                  <option value="">Load view</option>
                  {views.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
                </select>
              )}
            </div>

            <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-9" onClick={() => { fetchAnalytics(); fetchAdvancedMetrics(); }}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
            <Button size="sm" className="bg-white text-violet-700 hover:bg-white/90 h-9 font-semibold" onClick={downloadCsv}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export
            </Button>
          </div>
        </div>

        {/* Toggle row */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/20 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
            <Switch checked={normalizeFunnel} onCheckedChange={setNormalizeFunnel} />
            Normalize Funnel
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
            <Switch checked={compare} onCheckedChange={setCompare} />
            Compare Periods
          </label>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Applications",
            value: analyticsData?.totalApplications || 0,
            icon: Users,
            delta: <DeltaBadge value={appsDelta} />,
            sub: `${analyticsData?.totalJobDescriptions || 0} active jobs`,
            gradient: "from-violet-50 to-purple-50",
            iconBg: "bg-violet-100",
            color: "text-violet-700",
            sparkData: trends.map((t) => ({ v: t.applications })),
            sparkKey: "v",
            sparkColor: "#7c3aed",
          },
          {
            label: "Conversion Rate",
            value: `${convRate}%`,
            icon: Target,
            delta: <DeltaBadge value={convDelta} />,
            sub: "Applicant → Hired",
            gradient: "from-emerald-50 to-green-50",
            iconBg: "bg-emerald-100",
            color: "text-emerald-700",
            sparkData: trends.map((t) => ({ v: t.applications > 0 ? (t.hires / t.applications) * 100 : 0 })),
            sparkKey: "v",
            sparkColor: "#10b981",
          },
          {
            label: "Avg Time to Hire",
            value: `${timeAvg}d`,
            icon: Clock,
            delta: <DeltaBadge value={-3} inverse />,
            sub: "Days end-to-end",
            gradient: "from-blue-50 to-cyan-50",
            iconBg: "bg-blue-100",
            color: "text-blue-700",
            sparkData: advancedMetrics?.timeToHire.byPosition.slice(0, 6).map((p) => ({ v: p.days })) || [],
            sparkKey: "v",
            sparkColor: "#0ea5e9",
          },
          {
            label: "Cost per Hire",
            value: `$${cph.toLocaleString()}`,
            icon: DollarSign,
            delta: <DeltaBadge value={-8} inverse />,
            sub: "Total hiring cost",
            gradient: "from-amber-50 to-yellow-50",
            iconBg: "bg-amber-100",
            color: "text-amber-700",
            sparkData: costBreakdownData.map((d) => ({ v: d.value })),
            sparkKey: "v",
            sparkColor: "#f59e0b",
          },
        ].map(({ label, value, icon: Icon, delta, sub, gradient, iconBg, color, sparkData, sparkKey, sparkColor }) => (
          <Card key={label} className={`border-0 shadow-sm bg-gradient-to-br ${gradient}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center`}>
                  <Icon className={`h-4.5 w-4.5 ${color}`} />
                </div>
                {delta}
              </div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
              {sparkData.length > 1 && (
                <div className="mt-2 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkData}>
                      <Line type="monotone" dataKey={sparkKey} stroke={sparkColor} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── AI Insights ── */}
      {aiInsights.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-5 w-5 text-violet-600" />
              AI Insights
              <Badge className="bg-violet-100 text-violet-700 border-0 text-xs">Auto-generated</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid sm:grid-cols-2 gap-3">
              {aiInsights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
                  ins.type === "good" ? "bg-emerald-50 text-emerald-800" :
                  ins.type === "warn" ? "bg-amber-50 text-amber-800" :
                  "bg-rose-50 text-rose-800"
                }`}>
                  {ins.type === "good" ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> :
                   ins.type === "warn" ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> :
                   <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <p>{ins.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-10 gap-1 bg-muted p-1 rounded-xl">
          {[
            { value: "overview",  label: "Overview" },
            { value: "funnel",    label: "Hiring Funnel" },
            { value: "trends",    label: "Trends" },
            { value: "sources",   label: "Sources" },
            { value: "timing",    label: "Time & Cost" },
            { value: "quality",   label: "Quality" },
          ].map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-sm rounded-lg">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Status Pie */}
            <Card className="lg:col-span-2 border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Applications by Status</CardTitle>
                <CardDescription className="text-xs">Click a segment to drill down</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData?.applicationsByStatus?.length ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={240}>
                      <PieChart>
                        <Pie
                          data={analyticsData.applicationsByStatus.map((item, i) => ({
                            name: item._id, value: item.count, fill: COLORS[i % COLORS.length],
                          }))}
                          cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value"
                          onClick={(d) => {
                            const p = d?.payload as any;
                            if (p?.name) setDrill({ title: `Status: ${p.name}`, items: [{ label: p.name, value: p.value, query: { status: p.name } }] });
                          }}
                        >
                          {analyticsData.applicationsByStatus.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {analyticsData.applicationsByStatus.map((item, i) => (
                        <div key={item._id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-muted-foreground">{item._id}</span>
                          </div>
                          <span className="font-semibold">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyChart label="No application data yet" cta="Invite Candidates" href="/dashboard/recruiter/candidates" />
                )}
              </CardContent>
            </Card>

            {/* Radar */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pipeline Health</CardTitle>
                <CardDescription className="text-xs">Funnel stage distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Radar name="Pipeline" dataKey="A" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} strokeWidth={2} />
                      <RechartsTooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label="No pipeline data" />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Skills */}
          {analyticsData?.topSkills && analyticsData.topSkills.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top Candidate Skills</CardTitle>
                <CardDescription className="text-xs">Most common skills across your applicant pool</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {analyticsData.topSkills.slice(0, 8).map((skill, i) => {
                    const max = analyticsData.topSkills[0].count || 1;
                    return (
                      <div key={skill._id} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                        <span className="text-sm font-medium w-28 truncate">{skill._id}</span>
                        <div className="flex-1"><SkillBar label="" value={(skill.count / max) * 100} color="#7c3aed" /></div>
                        <span className="text-xs font-semibold text-muted-foreground w-8 text-right">{skill.count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Funnel Tab ── */}
        <TabsContent value="funnel" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Funnel Chart */}
            <Card className="lg:col-span-2 border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Hiring Funnel</CardTitle>
                    <CardDescription className="text-xs">Candidate progression through your hiring process</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">{normalizeFunnel ? "Normalized" : "Raw"}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {funnelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={funnelData} layout="vertical" barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(val: any, name: any, props: any) => {
                          const applied = funnelData[0]?.value || 1;
                          const pctOfApplied = ((val / applied) * 100).toFixed(1);
                          return [`${val} (${pctOfApplied}% of applied)`, "Candidates"];
                        }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {funnelData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                        <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 600 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label="No funnel data yet" cta="Post a Job" href="/dashboard/recruiter/job-descriptions/create" />
                )}
              </CardContent>
            </Card>

            {/* Funnel stages */}
            <div className="space-y-3">
              {funnelData.map((stage, i) => {
                const fromPrev = i > 0 && funnelData[i - 1].value > 0
                  ? (stage.value / funnelData[i - 1].value) * 100 : 100;
                const target = STAGE_TARGETS[stage.name];
                const fromApplied = funnelData[0]?.value > 0 ? (stage.value / funnelData[0].value) * 100 : 100;
                return (
                  <Card key={stage.name} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{stage.name}</span>
                        <span className="text-xl font-bold" style={{ color: stage.fill }}>{stage.value}</span>
                      </div>
                      {i > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>From prev stage</span>
                            <span className={fromPrev >= (target || 50) ? "text-emerald-600 font-medium" : "text-rose-600 font-medium"}>
                              {fromPrev.toFixed(1)}%{target ? ` / target ${target}%` : ""}
                            </span>
                          </div>
                          <SkillBar label="" value={fromPrev} color={fromPrev >= (target || 50) ? "#16a34a" : "#ef4444"} />
                          <div className="text-xs text-muted-foreground">{fromApplied.toFixed(1)}% of all applicants</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Drop-off Analysis */}
          {dropOffs.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Drop-off Analysis</CardTitle>
                <CardDescription className="text-xs">Where candidates are leaving your pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dropOffs.map(({ stage, dropped, dropPct }) => (
                    <div key={stage} className={`p-4 rounded-xl border ${dropPct > 60 ? "bg-rose-50 border-rose-200" : dropPct > 40 ? "bg-amber-50 border-amber-200" : "bg-slate-50"}`}>
                      <p className="text-xs text-muted-foreground mb-1">→ {stage}</p>
                      <p className="text-2xl font-bold text-slate-700">-{dropped}</p>
                      <p className={`text-xs font-medium mt-1 ${dropPct > 60 ? "text-rose-600" : dropPct > 40 ? "text-amber-600" : "text-slate-500"}`}>
                        {dropPct.toFixed(1)}% dropped off
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Trends Tab ── */}
        <TabsContent value="trends" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recruitment Trends</CardTitle>
                  <CardDescription className="text-xs">Applications, interviews, and hires over time</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="interviewGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="hiresGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    <Legend />
                    <Area type="monotone" dataKey="applications" stroke="#7c3aed" fill="url(#appsGrad)" strokeWidth={2} name="Applications" />
                    <Area type="monotone" dataKey="interviews" stroke="#0ea5e9" fill="url(#interviewGrad)" strokeWidth={2} name="Interviews" />
                    <Area type="monotone" dataKey="hires" stroke="#10b981" fill="url(#hiresGrad)" strokeWidth={2} name="Hires" />
                    {compare && (
                      <>
                        <Line type="monotone" dataKey="applications" stroke="#94a3b8" strokeDasharray="4 4" dot={false} name="Apps (prev)" />
                        <Line type="monotone" dataKey="hires" stroke="#f87171" strokeDasharray="4 4" dot={false} name="Hires (prev)" />
                      </>
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart label="No trend data available" cta="Create a Job" href="/dashboard/recruiter/job-descriptions/create" />
              )}
            </CardContent>
          </Card>

          {/* Hiring velocity */}
          {trends.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Hiring Velocity</CardTitle>
                <CardDescription className="text-xs">Monthly conversion rate (hires ÷ applications)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trends.map((t) => ({
                    month: t.month,
                    rate: t.applications > 0 ? parseFloat(((t.hires / t.applications) * 100).toFixed(1)) : 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: "8px" }} />
                    <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981" }} name="Conversion %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Sources Tab ── */}
        <TabsContent value="sources" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Applications by Source</CardTitle>
                <CardDescription className="text-xs">Volume & hires per recruitment channel</CardDescription>
              </CardHeader>
              <CardContent>
                {advancedMetrics?.sourcePerformance ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={advancedMetrics.sourcePerformance} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip contentStyle={{ borderRadius: "8px" }} />
                      <Legend />
                      <Bar dataKey="applications" fill="#7c3aed" name="Applications" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="hires" fill="#10b981" name="Hires" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label="No source data yet" />
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Conversion by Source</CardTitle>
                <CardDescription className="text-xs">Which channels convert best</CardDescription>
              </CardHeader>
              <CardContent>
                {advancedMetrics?.sourcePerformance ? (
                  <div className="space-y-3">
                    {advancedMetrics.sourcePerformance.map((src, i) => (
                      <div key={src.source} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                            <span>{src.source}</span>
                          </div>
                          <span className="font-semibold">{(src.conversionRate ?? 0).toFixed(1)}%</span>
                        </div>
                        <SkillBar label="" value={src.conversionRate ?? 0} color="#7c3aed" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyChart label="No source conversion data" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Time & Cost Tab ── */}
        <TabsContent value="timing" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Time to Hire by Role</CardTitle>
                <CardDescription className="text-xs">Average days from apply to hired</CardDescription>
              </CardHeader>
              <CardContent>
                {advancedMetrics?.timeToHire.byPosition?.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={advancedMetrics.timeToHire.byPosition} layout="vertical" barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" unit="d" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="position" type="category" width={100} tick={{ fontSize: 11 }} />
                      <RechartsTooltip formatter={(v) => [`${v} days`, "Time to Hire"]} contentStyle={{ borderRadius: "8px" }} />
                      <Bar dataKey="days" fill="#0ea5e9" radius={[0, 6, 6, 0]}>
                        <LabelList dataKey="days" position="right" formatter={(v: any) => `${v}d`} style={{ fontSize: 11 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart label="No time-to-hire data" />
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cost per Hire Breakdown</CardTitle>
                <CardDescription className="text-xs">Total: ${cph.toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                {advancedMetrics?.costPerHire ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={costBreakdownData} cx="50%" cy="50%" outerRadius={70} innerRadius={35} dataKey="value">
                          {costBreakdownData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip formatter={(v: any) => [`$${v}`, ""]} contentStyle={{ borderRadius: "8px" }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2">
                      {costBreakdownData.map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-semibold">${d.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyChart label="No cost data" />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Quality Tab ── */}
        <TabsContent value="quality" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Score Distribution</CardTitle>
                <CardDescription className="text-xs">Candidate AI match score buckets</CardDescription>
              </CardHeader>
              <CardContent>
                {advancedMetrics?.candidateQuality?.scoreDistribution?.length ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50">
                      <Star className="h-8 w-8 text-violet-600" />
                      <div>
                        <p className="text-2xl font-bold text-violet-700">{advancedMetrics.candidateQuality.averageScore}</p>
                        <p className="text-xs text-violet-600/70">Average candidate score</p>
                      </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={advancedMetrics.candidateQuality.scoreDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip contentStyle={{ borderRadius: "8px" }} />
                        <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                          {advancedMetrics.candidateQuality.scoreDistribution.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChart label="No score distribution data" />
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quality Benchmarks</CardTitle>
                <CardDescription className="text-xs">How your pipeline compares to targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Avg Match Score", value: advancedMetrics?.candidateQuality.averageScore || 0, target: 75, unit: "/100" },
                  { label: "Conversion Rate", value: parseFloat(convRate), target: 8, unit: "%" },
                  { label: "Avg Time to Hire", value: timeAvg, target: 25, unit: "d", inverse: true },
                  { label: "Screened Rate", value: advancedMetrics?.hiringFunnel.applied ? Math.round((advancedMetrics.hiringFunnel.screened / advancedMetrics.hiringFunnel.applied) * 100) : 0, target: 70, unit: "%" },
                ].map(({ label, value, target, unit, inverse }) => {
                  const isGood = inverse ? value <= target : value >= target;
                  return (
                    <div key={label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${isGood ? "text-emerald-600" : "text-rose-600"}`}>{value}{unit}</span>
                          <span className="text-xs text-muted-foreground">/ {target}{unit}</span>
                        </div>
                      </div>
                      <SkillBar label="" value={inverse ? Math.min(100, (target / Math.max(value, 1)) * 100) : Math.min(100, (value / target) * 100)} color={isGood ? "#16a34a" : "#ef4444"} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Drill-down Panel ── */}
      {drill && (
        <div className="fixed inset-0 bg-black/40 z-20 backdrop-blur-sm" onClick={() => setDrill(null)}>
          <div className="absolute right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-2xl p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{drill.title}</h3>
              <Button variant="ghost" size="sm" onClick={() => setDrill(null)}>Close</Button>
            </div>
            <div className="space-y-3">
              {drill.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-xl">
                  <span className="text-sm">{it.label}</span>
                  <span className="text-sm font-bold">{it.value}</span>
                </div>
              ))}
              {drill.items[0]?.query && (
                <a
                  href={`/dashboard/recruiter/candidates?${new URLSearchParams(drill.items[0].query).toString()}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-violet-50 text-violet-700 text-sm font-medium hover:bg-violet-100 transition-colors"
                >
                  Open in Candidates
                  <ChevronRight className="h-4 w-4" />
                </a>
              )}
            </div>

            {/* Saved views in panel */}
            <div className="mt-6 pt-4 border-t space-y-3">
              <p className="text-sm font-semibold">Saved Views</p>
              <div className="flex gap-2">
                <input
                  className="border rounded-lg px-2.5 py-1.5 text-sm flex-1"
                  placeholder="View name"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveCurrentView()}
                />
                <Button variant="outline" size="sm" onClick={saveCurrentView}>Save</Button>
              </div>
              <div className="space-y-2">
                {views.length === 0 && <p className="text-xs text-muted-foreground">No saved views yet.</p>}
                {views.map((v) => (
                  <div key={v.name} className="flex items-center justify-between text-sm p-2 border rounded-lg">
                    <span>{v.name}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => loadView(v)}>Load</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-rose-500" onClick={() => deleteView(v.name)}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
