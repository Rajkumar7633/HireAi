"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Star, MessageCircle, Eye, Users, TrendingUp, Award, Clock,
  RefreshCw, Download, LayoutGrid, LayoutList, ChevronRight, Filter,
  X, Briefcase, Code, BookOpen, Trophy, Zap, Target, Sparkles,
  ChevronDown, ChevronUp, CheckCircle, MapPin, Calendar, Brain,
  ArrowUpDown, Bookmark, BookmarkCheck, Crown, Medal, Loader2,
  BarChart3, SlidersHorizontal, PlusCircle, ArrowLeft, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scores {
  projects?: number;
  experience?: number;
  skills?: number;
  coding?: number;
  achievements?: number;
  completeness?: number;
  recency?: number;
  total?: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  professionalSummary?: string;
  profileScore: number;
  latestAssessment?: { score: number; completedAt?: string } | null;
  location?: string;
  lastUpdated?: string;
  skills: string[];
  yearsOfExperience: number;
  scores?: Scores;
  jobMatchScore?: number;
  finalScore?: number;
  linkedinUrl?: string;
  projects?: number;
  achievements?: number;
}

interface Job {
  _id: string;
  title: string;
}

type ViewMode = "grid" | "list";
type SortKey = "score" | "recent" | "job" | "experience" | "name";
type Tier = "elite" | "strong" | "promising" | "developing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTier(score: number): Tier {
  if (score >= 85) return "elite";
  if (score >= 70) return "strong";
  if (score >= 55) return "promising";
  return "developing";
}

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string; border: string; ring: string; dot: string; gradient: string }> = {
  elite:      { label: "Elite",      color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-300",  ring: "#f59e0b", dot: "bg-amber-400",   gradient: "from-amber-500 to-orange-400" },
  strong:     { label: "Strong",     color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-300",ring: "#10b981", dot: "bg-emerald-400", gradient: "from-emerald-500 to-teal-400" },
  promising:  { label: "Promising",  color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",   ring: "#3b82f6", dot: "bg-blue-400",    gradient: "from-blue-500 to-indigo-400" },
  developing: { label: "Developing", color: "text-slate-600",   bg: "bg-slate-50",   border: "border-slate-200",  ring: "#94a3b8", dot: "bg-slate-400",   gradient: "from-slate-400 to-slate-500" },
};

const SCORE_BREAKDOWN_LABELS: Array<{ key: keyof Scores; label: string; color: string; max: number }> = [
  { key: "experience",   label: "Experience",  color: "bg-violet-500",  max: 25 },
  { key: "skills",       label: "Skills",      color: "bg-blue-500",    max: 25 },
  { key: "projects",     label: "Projects",    color: "bg-emerald-500", max: 20 },
  { key: "coding",       label: "Coding",      color: "bg-amber-500",   max: 15 },
  { key: "achievements", label: "Achievements",color: "bg-rose-500",    max: 10 },
  { key: "completeness", label: "Completeness",color: "bg-indigo-400",  max: 5 },
];

function getSkillNames(rawSkills: any[]): string[] {
  if (!Array.isArray(rawSkills)) return [];
  return rawSkills.map((s) => {
    if (typeof s === "string") return s;
    if (s && typeof s === "object") return s.name || s.skill || "";
    return "";
  }).filter(Boolean);
}

function ScoreRing({ score, size = 56, tier }: { score: number; size?: number; tier: Tier }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(Math.max(score, 0), 100);
  const dash = (pct / 100) * circ * 0.75;
  const gap = circ - dash;
  const { ring } = TIER_CONFIG[tier];
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 50 46">
      <circle cx="25" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4.5"
        strokeDasharray={`${circ * 0.75} ${circ}`} strokeDashoffset={0}
        strokeLinecap="round" transform="rotate(-225 25 28)" />
      <circle cx="25" cy="28" r={r} fill="none" stroke={ring} strokeWidth="4.5"
        strokeDasharray={`${dash} ${gap + circ * 0.25}`} strokeDashoffset={0}
        strokeLinecap="round" transform="rotate(-225 25 28)"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x="25" y="31" textAnchor="middle" fontSize="10" fontWeight="bold" fill={ring}>{pct}</text>
    </svg>
  );
}

const PAGE_SIZE_OPTIONS = [12, 24, 48];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TalentPoolPage() {
  const { toast } = useToast();

  // ── Data state
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recomputeLoading, setRecomputeLoading] = useState(false);

  // ── Filter/sort state
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [minYears, setMinYears] = useState(0);
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // ── View state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // ── Feature state
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "saved" | "top">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const fetchRef = useRef(0);

  // ── Load saved from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("talent_pool_saved");
      if (raw) setSaved(new Set(JSON.parse(raw)));
      const prefs = localStorage.getItem("talent_pool_prefs");
      if (prefs) {
        const p = JSON.parse(prefs);
        if (p.viewMode) setViewMode(p.viewMode);
        if (p.pageSize) setPageSize(p.pageSize);
      }
    } catch {}
    fetchJobs();
  }, []);

  const saveSaved = (next: Set<string>) => {
    setSaved(next);
    localStorage.setItem("talent_pool_saved", JSON.stringify([...next]));
  };

  const savePrefs = (updates: Partial<{ viewMode: ViewMode; pageSize: number }>) => {
    try {
      const raw = localStorage.getItem("talent_pool_prefs");
      const prefs = raw ? JSON.parse(raw) : {};
      localStorage.setItem("talent_pool_prefs", JSON.stringify({ ...prefs, ...updates }));
    } catch {}
  };

  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/job-descriptions/my-jobs", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setJobs((data.jobDescriptions || []).map((j: any) => ({ _id: j._id, title: j.title })));
      }
    } catch {}
  };

  const fetchPool = useCallback(async (opts?: { pg?: number }) => {
    const thisCall = ++fetchRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (minScore > 0) params.set("minScore", String(minScore));
      if (minYears > 0) params.set("minYears", String(minYears));
      if (skillTags.length > 0) params.set("skills", skillTags.join(","));
      if (selectedJobId) { params.set("jobId", selectedJobId); params.set("sort", "job"); }
      else params.set("sort", sortKey === "job" ? "score" : sortKey);
      params.set("page", String(opts?.pg ?? page));
      params.set("limit", String(pageSize));

      const res = await fetch(`/api/talent-pool?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      if (fetchRef.current !== thisCall) return;

      const items: Candidate[] = (data.candidates || []).map((u: any) => ({
        id: String(u._id),
        name: u.name || "Unknown",
        email: u.email || "",
        profileImage: u.profileImage,
        professionalSummary: u.professionalSummary || "",
        profileScore: Number(u.profileScore || u.scores?.total || 0),
        latestAssessment: u.latestAssessment || null,
        location: u.businessLocation || "",
        lastUpdated: u.updatedAt,
        skills: getSkillNames(u.skills || []),
        yearsOfExperience: Number(u.yearsOfExperience || 0),
        scores: u.scores,
        jobMatchScore: u.jobMatchScore,
        finalScore: u.finalScore,
        linkedinUrl: u.linkedinUrl,
        projects: Array.isArray(u.projects) ? u.projects.length : 0,
        achievements: Array.isArray(u.achievements) ? u.achievements.length : 0,
      }));

      setCandidates(items);
      setTotal(data.total || items.length);
    } catch {
      if (fetchRef.current === thisCall) toast({ title: "Failed to load talent pool", variant: "destructive" });
    } finally {
      if (fetchRef.current === thisCall) setLoading(false);
    }
  }, [search, minScore, minYears, skillTags, selectedJobId, sortKey, page, pageSize]);

  // Debounced fetch on filter change, reset to page 1
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPool({ pg: 1 });
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, minScore, minYears, skillTags, selectedJobId, sortKey, pageSize]);

  // Fetch on page change (no debounce)
  useEffect(() => {
    fetchPool({ pg: page });
  }, [page]);

  const handleRecompute = async () => {
    setRecomputeLoading(true);
    try {
      const res = await fetch("/api/talent-pool/recompute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast({ title: "Scores refreshed", description: `Updated ${data.updatedCount || 0} candidate profiles` });
      fetchPool({ pg: page });
    } catch {
      toast({ title: "Recompute failed", variant: "destructive" });
    } finally {
      setRecomputeLoading(false);
    }
  };

  const addSkillTag = () => {
    const tag = skillInput.trim().toLowerCase();
    if (tag && !skillTags.includes(tag)) {
      setSkillTags((prev) => [...prev, tag]);
    }
    setSkillInput("");
  };

  const removeSkillTag = (tag: string) => setSkillTags((prev) => prev.filter((t) => t !== tag));

  const toggleSaved = (id: string) => {
    const next = new Set(saved);
    next.has(id) ? next.delete(id) : next.add(id);
    saveSaved(next);
    toast({ title: next.has(id) ? "Saved to favorites" : "Removed from favorites" });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportCSV = (list: Candidate[]) => {
    const rows = [
      ["Name", "Email", "Profile Score", "Job Match", "Skills", "Experience (yrs)", "Location", "Last Updated"],
      ...list.map((c) => [
        c.name, c.email,
        c.profileScore,
        c.jobMatchScore ?? "",
        c.skills.join("; "),
        c.yearsOfExperience,
        c.location || "",
        c.lastUpdated ? format(new Date(c.lastUpdated), "yyyy-MM-dd") : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "talent-pool.csv";
    a.click();
    toast({ title: "Exported", description: `${list.length} candidates exported to CSV` });
  };

  // Displayed list based on active tab
  const displayList = useMemo(() => {
    let list = [...candidates];
    if (activeTab === "saved") list = list.filter((c) => saved.has(c.id));
    if (activeTab === "top") list = [...list].sort((a, b) => (b.finalScore ?? b.profileScore) - (a.finalScore ?? a.profileScore)).slice(0, 10);
    if (tierFilter !== "all") list = list.filter((c) => getTier(c.finalScore ?? c.profileScore) === tierFilter);
    return list;
  }, [candidates, activeTab, saved, tierFilter]);

  // Stats from full loaded set
  const stats = useMemo(() => {
    const scores = candidates.map((c) => c.finalScore ?? c.profileScore);
    return {
      total,
      savedCount: saved.size,
      elite: candidates.filter((c) => (c.finalScore ?? c.profileScore) >= 85).length,
      avgScore: candidates.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      withJobMatch: candidates.filter((c) => c.jobMatchScore != null).length,
      topMatchScore: candidates.length && selectedJobId
        ? Math.max(...candidates.map((c) => c.jobMatchScore ?? 0))
        : 0,
    };
  }, [candidates, saved, total, selectedJobId]);

  const tierCounts = useMemo(() => ({
    elite:      candidates.filter((c) => getTier(c.finalScore ?? c.profileScore) === "elite").length,
    strong:     candidates.filter((c) => getTier(c.finalScore ?? c.profileScore) === "strong").length,
    promising:  candidates.filter((c) => getTier(c.finalScore ?? c.profileScore) === "promising").length,
    developing: candidates.filter((c) => getTier(c.finalScore ?? c.profileScore) === "developing").length,
  }), [candidates]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/dashboard/recruiter" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Talent Pool</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            Talent Pool
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover, track, and engage top candidates with AI-powered scoring
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => exportCSV(displayList)}>
            <Download className="h-3.5 w-3.5 mr-1.5" />Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleRecompute} disabled={recomputeLoading}>
            {recomputeLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
            Refresh Scores
          </Button>
        </div>
      </div>

      {/* ── Stats Banner ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Talent", value: stats.total, icon: <Users className="h-4 w-4 text-violet-500" />, bg: "bg-violet-50", color: "text-violet-700" },
          { label: "Elite Tier",   value: stats.elite, icon: <Crown className="h-4 w-4 text-amber-500" />,  bg: "bg-amber-50",  color: "text-amber-700" },
          { label: "Avg Score",    value: stats.avgScore ? `${stats.avgScore}%` : "—", icon: <BarChart3 className="h-4 w-4 text-blue-500" />, bg: "bg-blue-50", color: "text-blue-700" },
          { label: "Saved",        value: stats.savedCount, icon: <Bookmark className="h-4 w-4 text-emerald-500" />, bg: "bg-emerald-50", color: "text-emerald-700" },
          { label: selectedJobId ? "Top Job Match" : "Jobs Available", value: selectedJobId ? (stats.topMatchScore ? `${stats.topMatchScore}%` : "—") : jobs.length, icon: <Briefcase className="h-4 w-4 text-indigo-500" />, bg: "bg-indigo-50", color: "text-indigo-700" },
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

      {/* ── Tier Distribution Bar ── */}
      {candidates.length > 0 && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score Tier Distribution</p>
            <button onClick={() => setTierFilter("all")} className={`text-xs ${tierFilter !== "all" ? "text-violet-600 hover:underline" : "text-muted-foreground"}`}>
              {tierFilter !== "all" ? "Clear tier filter" : `${candidates.length} candidates loaded`}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {(["elite", "strong", "promising", "developing"] as Tier[]).map((t) => {
              const count = tierCounts[t];
              const pct = candidates.length ? (count / candidates.length) * 100 : 0;
              const cfg = TIER_CONFIG[t];
              return (
                <button
                  key={t}
                  onClick={() => setTierFilter(tierFilter === t ? "all" : t)}
                  className={`flex-1 rounded-lg p-2.5 text-center border transition-all ${tierFilter === t ? `${cfg.bg} ${cfg.border} shadow-sm` : "border-transparent hover:bg-muted/50"}`}
                >
                  <div className={`h-2 rounded-full ${cfg.dot.replace("bg-", "bg-")} mb-1.5 transition-all`} style={{ opacity: count > 0 ? 1 : 0.3 }} />
                  <p className={`text-base font-bold ${cfg.color}`}>{count}</p>
                  <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
                  <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-xl w-fit">
        {([
          { id: "all",   label: "All Talent",   count: total },
          { id: "saved", label: "Saved",         count: stats.savedCount },
          { id: "top",   label: "Top 10",        count: null },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeTab === t.id ? "bg-violet-100 text-violet-700" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search + Controls Row ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, summary, skills…"
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Job match selector */}
        <Select
          value={selectedJobId || "__none__"}
          onValueChange={(v) => { setSelectedJobId(v === "__none__" ? "" : v); if (v !== "__none__") setSortKey("job"); }}
        >
          <SelectTrigger className="w-52 h-9 text-sm">
            <Briefcase className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder="Match against a job…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No job match</SelectItem>
            {jobs.map((j) => <SelectItem key={j._id} value={j._id}>{j.title}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Profile Score</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="experience">Experience</SelectItem>
            <SelectItem value="name">Name A–Z</SelectItem>
            {selectedJobId && <SelectItem value="job">Job Match</SelectItem>}
          </SelectContent>
        </Select>

        {/* Advanced filters toggle */}
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className={`h-9 ${showFilters ? "bg-violet-600 hover:bg-violet-700" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />Filters
          {(skillTags.length > 0 || minScore > 0 || minYears > 0) && (
            <span className="ml-1.5 h-4 w-4 rounded-full bg-white text-violet-700 text-[10px] font-bold flex items-center justify-center">
              {[skillTags.length > 0, minScore > 0, minYears > 0].filter(Boolean).length}
            </span>
          )}
        </Button>

        {/* View toggle */}
        <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg">
          <button onClick={() => { setViewMode("grid"); savePrefs({ viewMode: "grid" }); }} className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setViewMode("list"); savePrefs({ viewMode: "list" }); }} className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-white shadow-sm" : "text-muted-foreground"}`}>
            <LayoutList className="h-3.5 w-3.5" />
          </button>
        </div>

        <span className="text-xs text-muted-foreground">{displayList.length} shown</span>
      </div>

      {/* ── Advanced Filters Panel ── */}
      {showFilters && (
        <div className="rounded-xl border bg-muted/10 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold flex items-center gap-2"><Filter className="h-4 w-4 text-violet-500" />Advanced Filters</p>
            <button
              onClick={() => { setMinScore(0); setMinYears(0); setSkillTags([]); setSkillInput(""); }}
              className="text-xs text-rose-500 hover:underline"
            >
              Reset all
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {/* Min Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Min Profile Score</Label>
                <span className="text-sm font-bold text-violet-700">{minScore}%</span>
              </div>
              <input type="range" min={0} max={90} step={5} value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-violet-600" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0 (all)</span><span>90 (strict)</span>
              </div>
            </div>

            {/* Min Experience */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Min Experience</Label>
                <span className="text-sm font-bold text-blue-700">{minYears > 0 ? `${minYears}+ yrs` : "Any"}</span>
              </div>
              <input type="range" min={0} max={15} step={1} value={minYears}
                onChange={(e) => setMinYears(Number(e.target.value))}
                className="w-full accent-blue-600" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Any</span><span>15+ yrs</span>
              </div>
            </div>

            {/* Skill tags */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Required Skills</Label>
              <div className="flex gap-1.5">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkillTag(); } }}
                  placeholder="e.g. React, Python…"
                  className="text-xs h-8 flex-1"
                />
                <Button size="sm" variant="outline" className="h-8 px-2" onClick={addSkillTag}>
                  <PlusCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
              {skillTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {skillTags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-md bg-violet-100 text-violet-700 px-2 py-0.5 text-xs">
                      {t}
                      <button onClick={() => removeSkillTag(t)}><X className="h-2.5 w-2.5" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-violet-50 border border-violet-200 px-4 py-2.5">
          <span className="text-sm font-medium text-violet-800">{selectedIds.size} selected</span>
          <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700"
            onClick={() => exportCSV(candidates.filter((c) => selectedIds.has(c.id)))}>
            <Download className="h-3 w-3 mr-1" />Export Selected
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-violet-600 hover:underline">Clear</button>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className={viewMode === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`bg-muted animate-pulse rounded-xl ${viewMode === "grid" ? "h-72" : "h-20"}`} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && displayList.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-violet-300" />
          </div>
          <p className="font-semibold text-muted-foreground">
            {activeTab === "saved" ? "No saved candidates yet" : activeTab === "top" ? "No candidates scored yet" : "No candidates match your filters"}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {activeTab === "saved" ? "Star a candidate to save them here" : "Try adjusting your search or filters"}
          </p>
          {(search || minScore > 0 || minYears > 0 || skillTags.length > 0) && (
            <Button variant="outline" size="sm" className="mt-4"
              onClick={() => { setSearch(""); setMinScore(0); setMinYears(0); setSkillTags([]); }}>
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {!loading && displayList.length > 0 && viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayList.map((c, idx) => {
            const display = c.finalScore ?? c.profileScore;
            const tier = getTier(display);
            const cfg = TIER_CONFIG[tier];
            const isSaved = saved.has(c.id);
            const isSelected = selectedIds.has(c.id);
            const isTop3 = activeTab === "top" && idx < 3;
            const isExpanded = expandedId === c.id;

            return (
              <Card
                key={c.id}
                className={`border shadow-sm transition-all hover:shadow-lg group relative overflow-hidden ${isSelected ? "border-violet-300 ring-2 ring-violet-200" : `border ${cfg.border}`}`}
              >
                {/* Tier accent strip */}
                <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient}`} />

                <CardContent className="p-4 space-y-3">
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(c.id)}
                      className="h-4 w-4 mt-1 rounded accent-violet-600 shrink-0"
                    />

                    {/* Avatar */}
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 text-base font-bold text-white bg-gradient-to-br ${cfg.gradient}`}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isTop3 && <span className="text-base">{medals[idx]}</span>}
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      {c.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />{c.location}
                        </p>
                      )}
                    </div>

                    {/* Score ring + save */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <ScoreRing score={display} size={52} tier={tier} />
                      <button
                        onClick={() => toggleSaved(c.id)}
                        className={`transition-colors ${isSaved ? "text-amber-500" : "text-muted-foreground hover:text-amber-400"}`}
                      >
                        {isSaved ? <BookmarkCheck className="h-4 w-4" fill="currentColor" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Tier + job match badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
                    </span>
                    {c.jobMatchScore != null && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Target className="h-3 w-3" />Match {c.jobMatchScore}%
                      </span>
                    )}
                    {c.latestAssessment && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <Brain className="h-3 w-3" />Test {c.latestAssessment.score}%
                      </span>
                    )}
                  </div>

                  {/* Summary */}
                  {c.professionalSummary && (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{c.professionalSummary}</p>
                  )}

                  {/* Experience + stats row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {c.yearsOfExperience > 0 && (
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{c.yearsOfExperience}y exp</span>
                    )}
                    {(c.projects ?? 0) > 0 && (
                      <span className="flex items-center gap-1"><Code className="h-3 w-3" />{c.projects} projects</span>
                    )}
                    {(c.achievements ?? 0) > 0 && (
                      <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{c.achievements} achievements</span>
                    )}
                    {c.lastUpdated && (
                      <span className="flex items-center gap-1 ml-auto"><Clock className="h-3 w-3" />
                        {(() => { try { return format(new Date(c.lastUpdated), "MMM d"); } catch { return "—"; } })()}
                      </span>
                    )}
                  </div>

                  {/* Skills */}
                  {c.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {c.skills.slice(0, 5).map((s, i) => {
                        const matched = skillTags.includes(s.toLowerCase());
                        return (
                          <span key={i} className={`rounded-md px-2 py-0.5 text-xs border transition-colors ${matched ? "bg-violet-100 text-violet-700 border-violet-300" : "bg-muted text-muted-foreground border-transparent"}`}>
                            {matched && <CheckCircle className="h-2.5 w-2.5 inline mr-1" />}{s}
                          </span>
                        );
                      })}
                      {c.skills.length > 5 && (
                        <span className="rounded-md px-2 py-0.5 text-xs bg-muted text-muted-foreground">+{c.skills.length - 5}</span>
                      )}
                    </div>
                  )}

                  {/* Score breakdown (expandable) */}
                  {c.scores && (
                    <div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : c.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <BarChart3 className="h-3 w-3" />Score breakdown
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 rounded-xl bg-muted/30 p-3">
                          {SCORE_BREAKDOWN_LABELS.map(({ key, label, color, max }) => {
                            const val = c.scores?.[key] ?? 0;
                            const pct = max > 0 ? Math.round((val / max) * 100) : 0;
                            return (
                              <div key={key} className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground w-20 shrink-0">{label}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] font-medium w-6 text-right">{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2 border-t flex-wrap">
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs flex-1">
                      <Link href={`/dashboard/recruiter/candidates/${c.id}`}>
                        <Eye className="h-3 w-3 mr-1" />Profile
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs flex-1">
                      <Link href={`/dashboard/messages?userId=${c.id}`}>
                        <MessageCircle className="h-3 w-3 mr-1" />Message
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
                      <Link href={`/dashboard/recruiter/assessments?userId=${c.id}`} title="Assign Test">
                        <BookOpen className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
                      <Link href={`/dashboard/recruiter/video-interviews?userId=${c.id}`} title="Schedule Interview">
                        <Calendar className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {!loading && displayList.length > 0 && viewMode === "list" && (
        <div className="space-y-2">
          {displayList.map((c, idx) => {
            const display = c.finalScore ?? c.profileScore;
            const tier = getTier(display);
            const cfg = TIER_CONFIG[tier];
            const isSaved = saved.has(c.id);
            const isSelected = selectedIds.has(c.id);
            const isTop3 = activeTab === "top" && idx < 3;
            const isExpanded = expandedId === c.id;

            return (
              <Card key={c.id} className={`border shadow-sm transition-all hover:shadow-md ${isSelected ? "border-violet-300 bg-violet-50/20" : ""}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Checkbox */}
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(c.id)}
                      className="h-4 w-4 rounded accent-violet-600 shrink-0" />

                    {/* Score ring */}
                    <div className="shrink-0">
                      <ScoreRing score={display} size={44} tier={tier} />
                    </div>

                    {/* Avatar */}
                    <div className={`h-9 w-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${cfg.gradient}`}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Identity */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isTop3 && <span>{medals[idx]}</span>}
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        <span className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{c.email}</span>
                        {c.location && <span className="hidden sm:flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{c.location}</span>}
                        {c.yearsOfExperience > 0 && <span>{c.yearsOfExperience}y exp</span>}
                      </div>
                    </div>

                    {/* Scores */}
                    <div className="hidden md:flex items-center gap-3 shrink-0">
                      {c.jobMatchScore != null && (
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Match</p>
                          <p className="text-sm font-bold text-indigo-700">{c.jobMatchScore}%</p>
                        </div>
                      )}
                      {c.latestAssessment && (
                        <div className="text-center">
                          <p className="text-[10px] text-muted-foreground">Test</p>
                          <p className="text-sm font-bold text-blue-700">{c.latestAssessment.score}%</p>
                        </div>
                      )}
                    </div>

                    {/* Skills (compact) */}
                    <div className="hidden lg:flex gap-1 shrink-0 max-w-48 overflow-hidden">
                      {c.skills.slice(0, 3).map((s, i) => (
                        <span key={i} className="rounded-md bg-muted text-muted-foreground text-xs px-2 py-0.5">{s}</span>
                      ))}
                      {c.skills.length > 3 && <span className="text-xs text-muted-foreground">+{c.skills.length - 3}</span>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleSaved(c.id)} className={`p-1.5 rounded-md hover:bg-muted transition-colors ${isSaved ? "text-amber-500" : "text-muted-foreground"}`}>
                        {isSaved ? <BookmarkCheck className="h-4 w-4" fill="currentColor" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : c.id)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2.5">
                        <Link href={`/dashboard/recruiter/candidates/${c.id}`}>View <ChevronRight className="ml-1 h-3 w-3" /></Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="Message">
                        <Link href={`/dashboard/messages?userId=${c.id}`}><MessageCircle className="h-3.5 w-3.5" /></Link>
                      </Button>
                    </div>
                  </div>

                  {/* Expanded row — breakdown + skills */}
                  {isExpanded && (
                    <div className="border-t px-4 py-3 bg-muted/20 space-y-3">
                      {c.professionalSummary && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{c.professionalSummary}</p>
                      )}
                      {c.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {c.skills.map((s, i) => (
                            <span key={i} className={`rounded-md px-2 py-0.5 text-xs ${skillTags.includes(s.toLowerCase()) ? "bg-violet-100 text-violet-700 border border-violet-300" : "bg-muted text-muted-foreground"}`}>{s}</span>
                          ))}
                        </div>
                      )}
                      {c.scores && (
                        <div className="grid sm:grid-cols-3 gap-2">
                          {SCORE_BREAKDOWN_LABELS.map(({ key, label, color, max }) => {
                            const val = c.scores?.[key] ?? 0;
                            const pct = max > 0 ? Math.round((val / max) * 100) : 0;
                            return (
                              <div key={key} className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground w-20 shrink-0">{label}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[10px] font-medium w-4 text-right">{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <Link href={`/dashboard/recruiter/assessments?userId=${c.id}`}><BookOpen className="h-3 w-3 mr-1" />Assign Test</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <Link href={`/dashboard/recruiter/video-interviews?userId=${c.id}`}><Calendar className="h-3 w-3 mr-1" />Schedule Interview</Link>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && total > pageSize && activeTab === "all" && (
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => { setPageSize(Number(v)); setPage(1); savePrefs({ pageSize: Number(v) }); }}
            >
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>· Page {page} of {totalPages} · {total} total</span>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(1)} disabled={page === 1}>
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pg: number;
              if (totalPages <= 5) pg = i + 1;
              else if (page <= 3) pg = i + 1;
              else if (page >= totalPages - 2) pg = totalPages - 4 + i;
              else pg = page - 2 + i;
              return (
                <Button
                  key={pg}
                  variant={pg === page ? "default" : "outline"}
                  size="sm"
                  className={`h-8 w-8 p-0 text-xs ${pg === page ? "bg-violet-600 hover:bg-violet-700" : ""}`}
                  onClick={() => setPage(pg)}
                >
                  {pg}
                </Button>
              );
            })}
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
