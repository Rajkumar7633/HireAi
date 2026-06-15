"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/ui/charts";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/use-session";
import { authFetch } from "@/lib/client-auth";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Filter,
  Grid3X3,
  LayoutList,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

type SkillLevel = "beginner" | "intermediate" | "advanced";

type Skill = {
  name: string;
  level?: SkillLevel;
  verified?: boolean;
  verifiedScore?: number;
  verifiedAt?: string;
};

type SkillStats = {
  attempts: number;
  bestScore: number;
  lastScore: number;
  passed: boolean;
};

type DashboardStats = {
  total: number;
  verified: number;
  unverified: number;
  verificationRate: number;
  avgScore: number;
  passRate: number;
  totalAttempts: number;
  passedAttempts: number;
};

type AssessmentHistoryItem = {
  skillName: string;
  score?: number;
  passed?: boolean;
  status: string;
  attemptNumber?: number;
  createdAt?: string;
  completedAt?: string;
};

type Cooldown = {
  skillName: string;
  hoursRemaining: number;
  retryAt: string;
};

type AssessmentQuestion = {
  index: number;
  question: string;
  options: string[];
};

type MainTab = "skills" | "history" | "insights";
type StatusFilter = "all" | "verified" | "unverified";
type SortKey = "name" | "score" | "verifiedAt" | "level";
type ViewMode = "grid" | "list";

const LEVEL_META: Record<SkillLevel, { label: string; color: string; weight: number }> = {
  beginner: { label: "Beginner", color: "#94a3b8", weight: 40 },
  intermediate: { label: "Intermediate", color: "#3b82f6", weight: 65 },
  advanced: { label: "Advanced", color: "#8b5cf6", weight: 90 },
};

const ASSESSMENT_MINUTES = 15;

function levelScore(skill: Skill): number {
  if (skill.verified && typeof skill.verifiedScore === "number") return skill.verifiedScore;
  return LEVEL_META[skill.level || "intermediate"].weight;
}

function exportHistoryCsv(rows: AssessmentHistoryItem[]) {
  const header = ["Skill", "Attempt", "Score", "Result", "Created", "Completed"];
  const lines = rows.map((r) =>
    [
      r.skillName,
      r.attemptNumber ?? "",
      typeof r.score === "number" ? `${r.score}%` : "",
      r.passed ? "Passed" : "Failed",
      r.createdAt ? new Date(r.createdAt).toISOString() : "",
      r.completedAt ? new Date(r.completedAt).toISOString() : "",
    ]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `skill-assessments-${format(new Date(), "yyyy-MM-dd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function JobSeekerSkillsPage() {
  const { refreshSession } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("skills");

  const [skills, setSkills] = useState<Skill[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [cooldowns, setCooldowns] = useState<Cooldown[]>([]);
  const [skillStats, setSkillStats] = useState<Record<string, SkillStats>>({});
  const [endorsements, setEndorsements] = useState<{ skill: string; count: number }[]>([]);
  const [trending, setTrending] = useState<{ name: string; count: number }[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [profileContext, setProfileContext] = useState({
    desiredRole: "",
    currentTitle: "",
    industry: "",
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [levelFilter, setLevelFilter] = useState<"all" | SkillLevel>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [historyFilter, setHistoryFilter] = useState<"all" | "passed" | "failed">("all");

  const [addOpen, setAddOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [addingSkill, setAddingSkill] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [currentSkill, setCurrentSkill] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ASSESSMENT_MINUTES * 60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const res = await authFetch("/api/job-seeker/skills", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load skills");
      const data = await res.json();
      setSkills(data.skills || []);
      setStats(data.stats || null);
      setHistory(data.history || []);
      setCooldowns(data.cooldowns || []);
      setSkillStats(data.skillStats || {});
      setEndorsements(data.endorsements || []);
      setTrending(data.trending || []);
      setRecommendations(data.recommendations || []);
      setProfileContext(data.profileContext || {});
    } catch (e: unknown) {
      toast({
        title: "Could not load skills",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!assessmentOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimeLeft(ASSESSMENT_MINUTES * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [assessmentOpen, assessmentId]);

  const cooldownMap = useMemo(() => {
    const m = new Map<string, Cooldown>();
    cooldowns.forEach((c) => m.set(c.skillName.toLowerCase(), c));
    return m;
  }, [cooldowns]);

  const endorsementMap = useMemo(() => {
    const m = new Map<string, number>();
    endorsements.forEach((e) => m.set(e.skill.toLowerCase(), e.count));
    return m;
  }, [endorsements]);

  const filteredSkills = useMemo(() => {
    let list = [...skills];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
    if (statusFilter === "verified") list = list.filter((s) => s.verified);
    if (statusFilter === "unverified") list = list.filter((s) => !s.verified);
    if (levelFilter !== "all") list = list.filter((s) => (s.level || "intermediate") === levelFilter);

    list.sort((a, b) => {
      if (sortKey === "score") return levelScore(b) - levelScore(a);
      if (sortKey === "verifiedAt") {
        const ta = a.verifiedAt ? new Date(a.verifiedAt).getTime() : 0;
        const tb = b.verifiedAt ? new Date(b.verifiedAt).getTime() : 0;
        return tb - ta;
      }
      if (sortKey === "level") {
        return LEVEL_META[b.level || "intermediate"].weight - LEVEL_META[a.level || "intermediate"].weight;
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [skills, search, statusFilter, levelFilter, sortKey]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return history;
    if (historyFilter === "passed") return history.filter((h) => h.passed);
    return history.filter((h) => !h.passed);
  }, [history, historyFilter]);

  const radarData = useMemo(() => {
    return skills.slice(0, 8).map((s) => ({
      skill: s.name.length > 14 ? `${s.name.slice(0, 12)}…` : s.name,
      score: levelScore(s),
    }));
  }, [skills]);

  const levelDistribution = useMemo(() => {
    const counts = { beginner: 0, intermediate: 0, advanced: 0 };
    skills.forEach((s) => {
      counts[s.level || "intermediate"] += 1;
    });
    return [
      { level: "Beginner", count: counts.beginner, fill: "#94a3b8" },
      { level: "Intermediate", count: counts.intermediate, fill: "#3b82f6" },
      { level: "Advanced", count: counts.advanced, fill: "#8b5cf6" },
    ];
  }, [skills]);

  const answeredCount = answers.filter((a) => a >= 0).length;
  const assessmentProgress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;

  const manageSkill = async (action: "add" | "update" | "remove", skillName: string, level?: SkillLevel) => {
    const res = await authFetch("/api/job-seeker/skills", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, skillName, level }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({
        title: "Update failed",
        description: data.msg || data.message || "Please try again.",
        variant: "destructive",
      });
      return false;
    }
    await loadDashboard(true);
    await refreshSession?.();
    return true;
  };

  const handleAddSkill = async () => {
    const name = newSkillName.trim();
    if (!name) return;
    setAddingSkill(true);
    const ok = await manageSkill("add", name);
    setAddingSkill(false);
    if (ok) {
      setNewSkillName("");
      setAddOpen(false);
      toast({ title: "Skill added", description: `${name} is ready to verify.` });
    }
  };

  const handleLevelChange = async (skillName: string, level: SkillLevel) => {
    await manageSkill("update", skillName, level);
    toast({ title: "Level updated", description: `${skillName} → ${LEVEL_META[level].label}` });
  };

  const handleRemoveSkill = async () => {
    if (!removeTarget) return;
    const ok = await manageSkill("remove", removeTarget);
    if (ok) {
      toast({ title: "Skill removed", description: removeTarget });
      setRemoveTarget(null);
    }
  };

  const startAssessment = async (skillName: string) => {
    const cd = cooldownMap.get(skillName.toLowerCase());
    if (cd) {
      toast({
        title: "Cooldown active",
        description: `Retry in ${cd.hoursRemaining} hour(s) (${format(new Date(cd.retryAt), "PPp")}).`,
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await authFetch("/api/skills/start-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName }),
      });
      const data = await res.json();

      if (res.status === 429) {
        toast({
          title: "Please wait before retrying",
          description: data?.msg || `Retry in ${data?.cooldownHoursRemaining ?? "some"} hour(s).`,
          variant: "destructive",
        });
        return;
      }
      if (!res.ok) {
        toast({
          title: "Could not start assessment",
          description: data?.msg || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setCurrentSkill(data.skillName);
      setAssessmentId(data.assessmentId);
      setQuestions(data.questions || []);
      setAnswers(new Array((data.questions || []).length).fill(-1));
      setCurrentQuestion(0);
      setAssessmentOpen(true);
    } catch (e: unknown) {
      toast({
        title: "Error starting assessment",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const submitAssessment = async () => {
    if (!assessmentId) return;
    if (answers.some((a) => a < 0)) {
      toast({
        title: "Incomplete",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await authFetch(`/api/skills/submit-assessment/${assessmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Submit failed",
          description: data?.msg || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: data.passed ? "Skill verified!" : "Assessment complete",
        description: data.passed
          ? `You scored ${data.score}% — badge unlocked.`
          : `Score ${data.score}%. Need 80% to verify. Retry after 24h.`,
        variant: data.passed ? "default" : "destructive",
      });

      setAssessmentOpen(false);
      await loadDashboard(true);
      await refreshSession?.();
    } catch (e: unknown) {
      toast({
        title: "Error submitting",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyVerifiedBadge = (skill: Skill) => {
    const text = `✅ Verified ${skill.name} on HireAI — ${skill.verifiedScore}% score`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard", description: "Share your verified skill badge." });
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-violet-950/20 dark:to-indigo-950/20">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-200/60 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 p-6 text-white shadow-xl md:p-8">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-violet-100">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Skills Verification Studio</span>
              </div>
              <h1 className="text-2xl font-bold md:text-3xl">Prove your expertise. Stand out to recruiters.</h1>
              <p className="max-w-xl text-sm text-violet-100/90 md:text-base">
                {profileContext.desiredRole
                  ? `Targeting ${profileContext.desiredRole} — verify skills to boost match scores.`
                  : "Add skills, take assessments, earn verified badges, and track your progress."}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="secondary" className="bg-white/15 text-white hover:bg-white/25">
                  <Link href="/dashboard/job-seeker/skill-gap">
                    <Target className="mr-1.5 h-4 w-4" /> Skill gap analysis
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary" className="bg-white/15 text-white hover:bg-white/25">
                  <Link href="/dashboard/job-seeker/profile">
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Edit profile
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <ScoreRing
                score={stats?.verificationRate ?? 0}
                size={100}
                stroke={10}
                ringColor="#fff"
                label="Verified"
                sublabel="rate"
              />
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/20 text-white hover:bg-white/30"
                onClick={() => loadDashboard(true)}
                disabled={refreshing}
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total skills", value: stats?.total ?? 0, icon: Sparkles, color: "text-violet-600" },
            { label: "Verified", value: stats?.verified ?? 0, icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Avg verify score", value: `${stats?.avgScore ?? 0}%`, icon: Award, color: "text-amber-600" },
            { label: "Pass rate", value: `${stats?.passRate ?? 0}%`, icon: TrendingUp, color: "text-blue-600" },
          ].map((kpi) => (
            <Card key={kpi.label} className="border-0 shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`rounded-xl bg-slate-100 p-3 dark:bg-slate-800 ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="skills">My Skills</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
            <Button onClick={() => setAddOpen(true)} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="mr-2 h-4 w-4" /> Add skill
            </Button>
          </div>

          {/* Skills tab */}
          <TabsContent value="skills" className="mt-6 space-y-4">
            <Card className="border-0 shadow-md">
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search skills..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="unverified">Unverified</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as typeof levelFilter)}>
                  <SelectTrigger className="w-full md:w-[140px]">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
                  <SelectTrigger className="w-full md:w-[130px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="level">Level</SelectItem>
                    <SelectItem value="verifiedAt">Verified date</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant={viewMode === "grid" ? "default" : "outline"}
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant={viewMode === "list" ? "default" : "outline"}
                    onClick={() => setViewMode("list")}
                  >
                    <LayoutList className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {filteredSkills.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                  <Zap className="h-12 w-12 text-violet-400" />
                  <div>
                    <p className="font-semibold">No skills yet</p>
                    <p className="text-sm text-muted-foreground">
                      Add skills from trending list or your profile, then verify them.
                    </p>
                  </div>
                  <Button onClick={() => setAddOpen(true)}>Add your first skill</Button>
                </CardContent>
              </Card>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    : "flex flex-col gap-3"
                }
              >
                {filteredSkills.map((skill) => {
                  const cd = cooldownMap.get(skill.name.toLowerCase());
                  const endorseCount = endorsementMap.get(skill.name.toLowerCase()) || 0;
                  const st = skillStats[skill.name.toLowerCase()];
                  const level = skill.level || "intermediate";

                  return (
                    <Card
                      key={skill.name}
                      className={`group border-0 shadow-md transition hover:shadow-lg ${
                        skill.verified ? "ring-1 ring-emerald-200 dark:ring-emerald-800" : ""
                      }`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <CardTitle className="text-lg">{skill.name}</CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-2 pt-1">
                              <Badge
                                variant="outline"
                                style={{ borderColor: LEVEL_META[level].color, color: LEVEL_META[level].color }}
                              >
                                {LEVEL_META[level].label}
                              </Badge>
                              {skill.verified ? (
                                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                                  <ShieldCheck className="mr-1 h-3 w-3" />
                                  Verified {skill.verifiedScore}%
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Not verified</Badge>
                              )}
                              {endorseCount > 0 && (
                                <Badge variant="outline" className="gap-1">
                                  <Users className="h-3 w-3" /> {endorseCount} endorsements
                                </Badge>
                              )}
                            </CardDescription>
                          </div>
                          <ScoreRing score={levelScore(skill)} size={56} stroke={5} showValue />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {st && (
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span>{st.attempts} attempt(s)</span>
                            <span>Best: {st.bestScore}%</span>
                          </div>
                        )}
                        {skill.verifiedAt && (
                          <p className="text-xs text-muted-foreground">
                            Verified {formatDistanceToNow(new Date(skill.verifiedAt), { addSuffix: true })}
                          </p>
                        )}
                        {cd && (
                          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                            <Clock className="h-3.5 w-3.5" />
                            Retry in {cd.hoursRemaining}h — {format(new Date(cd.retryAt), "PPp")}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={level}
                            onValueChange={(v) => handleLevelChange(skill.name, v as SkillLevel)}
                          >
                            <SelectTrigger className="h-8 w-[130px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="flex-1 bg-violet-600 hover:bg-violet-700"
                            disabled={Boolean(cd)}
                            onClick={() => startAssessment(skill.name)}
                          >
                            {skill.verified ? "Re-verify" : "Verify skill"}
                          </Button>
                          {skill.verified && (
                            <Button size="sm" variant="outline" onClick={() => copyVerifiedBadge(skill)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => setRemoveTarget(skill.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {recommendations.length > 0 && (
              <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-violet-600" /> Recommended to add
                  </CardTitle>
                  <CardDescription>Trending skills in the community you don&apos;t have yet</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {recommendations.map((name) => (
                    <Button
                      key={name}
                      size="sm"
                      variant="outline"
                      className="border-violet-300"
                      onClick={async () => {
                        const ok = await manageSkill("add", name);
                        if (ok) toast({ title: "Added", description: name });
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" /> {name}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History tab */}
          <TabsContent value="history" className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Select value={historyFilter} onValueChange={(v) => setHistoryFilter(v as typeof historyFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All attempts</SelectItem>
                  <SelectItem value="passed">Passed only</SelectItem>
                  <SelectItem value="failed">Failed only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => exportHistoryCsv(filteredHistory)} disabled={!filteredHistory.length}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>
            <Card className="border-0 shadow-md">
              <CardContent className="p-0">
                {filteredHistory.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">No assessment history yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left text-muted-foreground dark:bg-slate-900">
                          <th className="px-4 py-3">Skill</th>
                          <th className="px-4 py-3">Attempt</th>
                          <th className="px-4 py-3">Score</th>
                          <th className="px-4 py-3">Result</th>
                          <th className="px-4 py-3">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((a, idx) => (
                          <tr key={`${a.skillName}-${idx}`} className="border-b last:border-0">
                            <td className="px-4 py-3 font-medium">{a.skillName}</td>
                            <td className="px-4 py-3">#{a.attemptNumber ?? "-"}</td>
                            <td className="px-4 py-3">{typeof a.score === "number" ? `${a.score}%` : "—"}</td>
                            <td className="px-4 py-3">
                              {a.passed ? (
                                <Badge className="bg-emerald-100 text-emerald-800">Passed</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">Failed</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {a.completedAt
                                ? formatDistanceToNow(new Date(a.completedAt), { addSuffix: true })
                                : a.createdAt
                                  ? formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })
                                  : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights tab */}
          <TabsContent value="insights" className="mt-6 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" /> Skill strength radar
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  {radarData.length >= 3 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                        <Radar dataKey="score" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Add at least 3 skills for radar chart
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Level distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={levelDistribution}>
                      <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {levelDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            {trending.length > 0 && (
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Trending in community</CardTitle>
                  <CardDescription>Most listed skills across HireAI profiles</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {trending.slice(0, 15).map((t) => (
                    <Badge key={t.name} variant="secondary" className="px-3 py-1">
                      {t.name} · {t.count}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add skill dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a skill</DialogTitle>
            <DialogDescription>Type a skill or pick from trending suggestions</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. React, Python, System Design"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
          />
          {trending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {trending.slice(0, 8).map((t) => (
                <Button key={t.name} size="sm" variant="outline" onClick={() => setNewSkillName(t.name)}>
                  {t.name}
                </Button>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSkill} disabled={addingSkill || !newSkillName.trim()}>
              {addingSkill ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add skill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirm */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove skill?</DialogTitle>
            <DialogDescription>
              {removeTarget} will be removed from your profile. Verification history is kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemoveSkill}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assessment dialog */}
      <Dialog open={assessmentOpen} onOpenChange={(open) => !submitting && setAssessmentOpen(open)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verify: {currentSkill}</DialogTitle>
            <DialogDescription className="flex flex-wrap items-center justify-between gap-2">
              <span>Score 80%+ to earn verified badge · {questions.length} questions</span>
              <Badge variant={timeLeft < 60 ? "destructive" : "secondary"}>
                <Clock className="mr-1 h-3 w-3" /> {formatTimer(timeLeft)}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span>{answeredCount}/{questions.length} answered</span>
            </div>
            <Progress value={assessmentProgress} className="h-2" />
          </div>

          <div className="flex flex-wrap gap-1">
            {questions.map((_, i) => (
              <Button
                key={i}
                size="sm"
                variant={currentQuestion === i ? "default" : answers[i] >= 0 ? "secondary" : "outline"}
                className="h-8 w-8 p-0"
                onClick={() => setCurrentQuestion(i)}
              >
                {i + 1}
              </Button>
            ))}
          </div>

          {questions[currentQuestion] && (
            <div className="space-y-3 rounded-lg border p-4">
              <p className="font-medium">
                Q{currentQuestion + 1}. {questions[currentQuestion].question}
              </p>
              <RadioGroup
                value={answers[currentQuestion] >= 0 ? String(answers[currentQuestion]) : ""}
                onValueChange={(val) => {
                  const idx = Number(val);
                  setAnswers((prev) => {
                    const copy = [...prev];
                    copy[currentQuestion] = idx;
                    return copy;
                  });
                }}
              >
                {questions[currentQuestion].options.map((opt, optIndex) => (
                  <label key={optIndex} className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-900">
                    <RadioGroupItem value={String(optIndex)} />
                    <span>{opt}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              disabled={currentQuestion === 0}
              onClick={() => setCurrentQuestion((q) => Math.max(0, q - 1))}
            >
              Previous
            </Button>
            {currentQuestion < questions.length - 1 ? (
              <Button onClick={() => setCurrentQuestion((q) => q + 1)}>Next</Button>
            ) : (
              <Button onClick={submitAssessment} disabled={submitting} className="bg-violet-600 hover:bg-violet-700">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit assessment"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
