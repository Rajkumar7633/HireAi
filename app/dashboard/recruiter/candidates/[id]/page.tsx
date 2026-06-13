"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SkillBar, ScoreRing } from "@/components/ui/charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Loader2, Mail, Phone, MapPin, Globe, Github, Linkedin, MessageSquare,
  FileText, Star, CheckCircle, XCircle, Briefcase, GraduationCap,
  Calendar, ChevronRight, Award, Target, TrendingUp, Clock,
  User, ExternalLink, Download, BookOpen, Code, Trophy, ArrowLeft,
  Building2, Layers, Sparkles, Tag, Plus, Trash2,
  Copy, ChevronDown, ChevronUp, AlertCircle, Activity, Bookmark,
  ThumbsUp, BarChart3, Send, Zap, BookmarkCheck, Shield,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface UserProfile {
  _id: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  role: string;
  skills?: Array<{ name?: string; verified?: boolean } | string>;
  yearsOfExperience?: number;
  jobSeekerProfile?: JobSeekerProfile | null;
}

interface JobSeekerProfile {
  firstName?: string; lastName?: string; location?: string;
  currentTitle?: string; skills?: string[]; yearsOfExperience?: number;
  summary?: string; linkedinUrl?: string; portfolioUrl?: string; githubUrl?: string;
  profileCompleteness?: number; atsScore?: number; openToWork?: boolean;
  industry?: string; experienceLevel?: string; desiredRole?: string;
  salaryExpectation?: string; workPreference?: string; education?: string;
  university?: string; graduationYear?: string; gpa?: string;
  projects?: Array<{ title: string; description?: string; tags?: string[]; link?: string }>;
  achievements?: string[];
  experiences?: Array<{ company: string; role: string; startDate: string; endDate?: string; current?: boolean; description?: string }>;
  lastUpdated?: string; phone?: string;
}

interface Resume {
  _id: string; filename: string; parsedText: string; fileUrl?: string;
  metadata: { skills?: string[]; experience?: string; education?: string };
  uploadDate: string; atsScore?: number; size?: number; mimeType?: string;
  analysis?: { strengths?: string[]; improvements?: string[] };
  extractedData?: {
    name?: string; email?: string; phone?: string; skills?: string[];
    experience?: Array<{ title?: string; company?: string; duration?: string }>;
    education?: Array<{ degree?: string; school?: string; year?: string }>;
  };
  status?: string;
}

interface Application {
  _id: string;
  jobDescriptionId: { _id: string; title: string };
  status: string; applicationDate: string;
  aiMatchScore?: number; atsScore?: number; testScore?: number;
  shortlisted?: boolean; skillsMatched?: string[];
  rounds?: Array<{ roundName: string; status: string }>;
  rejectionReason?: string; aiExplanation?: string; missingSkills?: string[];
}

interface Job { _id: string; title: string; skillsRequired?: string[] }
interface RecruiterNote { id: string; text: string; createdAt: string }

interface BgVerificationSummary {
  _id: string
  applicationId: string
  status: string
  overallResult?: string
  provider: string
  initiatedAt?: string
  components?: Record<string, { status: string }>
}

// ─── Constants ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  "Under Review", "Shortlisted", "Rejected",
  "Interview Scheduled",   "Hired", "Test Assigned",
  "Offer",
] as const;

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string }> = {
  "Pending":               { color: "text-slate-600",   bg: "bg-slate-100",   dot: "bg-slate-400" },
  "pending":               { color: "text-slate-600",   bg: "bg-slate-100",   dot: "bg-slate-400" },
  "Under Review":          { color: "text-blue-600",    bg: "bg-blue-100",    dot: "bg-blue-400" },
  "Shortlisted":           { color: "text-violet-600",  bg: "bg-violet-100",  dot: "bg-violet-500" },
  "Test Assigned":         { color: "text-amber-600",   bg: "bg-amber-100",   dot: "bg-amber-400" },
  "Test Passed":           { color: "text-emerald-600", bg: "bg-emerald-100", dot: "bg-emerald-400" },
  "Test Failed":           { color: "text-rose-600",    bg: "bg-rose-100",    dot: "bg-rose-400" },
  "Interview Scheduled":   { color: "text-indigo-600",  bg: "bg-indigo-100",  dot: "bg-indigo-400" },
  "Hired":                 { color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
  "Offer":                 { color: "text-purple-700",  bg: "bg-purple-100",  dot: "bg-purple-500" },
  "Rejected":              { color: "text-rose-700",    bg: "bg-rose-100",    dot: "bg-rose-500" },
};

const PREDEFINED_TAGS = [
  "Top Talent", "Strong Fit", "Follow Up", "Culture Fit",
  "Technical Strong", "Needs Review", "On Hold", "Overqualified",
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function getVerdict(score: number) {
  if (score >= 85) return { label: "Strong Hire", color: "text-emerald-700", bg: "bg-emerald-100", ring: "#10b981" };
  if (score >= 70) return { label: "Hire",        color: "text-blue-700",    bg: "bg-blue-100",    ring: "#3b82f6" };
  if (score >= 55) return { label: "Maybe",       color: "text-amber-700",   bg: "bg-amber-100",   ring: "#f59e0b" };
  return              { label: "Pass",         color: "text-rose-700",    bg: "bg-rose-100",    ring: "#ef4444" };
}

function getSkillNames(raw: any[]): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => (typeof s === "string" ? s : s?.name || s?.skill || "")).filter(Boolean);
}

/** Parse API scores safely — avoids NaN in rings and charts */
function normalizeScore(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}



// ─── SVG Charts ────────────────────────────────────────────────────────────

function RadarChart({ dims }: { dims: Array<{ label: string; value: number; max: number }> }) {
  const n = dims.length;
  const cx = 90, cy = 90, r = 65;
  const toXY = (i: number, pct: number) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + r * pct * Math.cos(a), y: cy + r * pct * Math.sin(a) };
  };
  const grid = [0.25, 0.5, 0.75, 1];
  const polyPts = (level: number) =>
    dims.map((_, i) => { const p = toXY(i, level); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ");
  const dataPts = dims.map((d, i) => { const p = toXY(i, Math.min(d.value / d.max, 1)); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ");
  const axes = dims.map((_, i) => { const edge = toXY(i, 1); return { x2: edge.x, y2: edge.y }; });
  const labels = dims.map((d, i) => { const lp = toXY(i, 1.22); return { ...lp, label: d.label, val: d.value }; });
  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      {grid.map((lvl, li) => (
        <polygon key={li} points={polyPts(lvl)} fill={li === 3 ? "none" : "none"} stroke="#e2e8f0" strokeWidth={li === 3 ? 1.5 : 0.8} />
      ))}
      {axes.map((a, i) => <line key={i} x1={cx} y1={cy} x2={a.x2} y2={a.y2} stroke="#e2e8f0" strokeWidth="0.8" />)}
      <polygon points={dataPts} fill="rgba(139,92,246,0.15)" stroke="#8b5cf6" strokeWidth="2" />
      {dims.map((d, i) => {
        const p = toXY(i, Math.min(d.value / d.max, 1));
        return <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#8b5cf6" stroke="white" strokeWidth="1.5" />;
      })}
      {labels.map((l, i) => (
        <g key={i}>
          <text x={l.x} y={l.y - 4} textAnchor="middle" fontSize="8.5" fill="#64748b" fontWeight="500">{l.label}</text>
          <text x={l.x} y={l.y + 6} textAnchor="middle" fontSize="9" fill="#8b5cf6" fontWeight="700">{l.val}%</text>
        </g>
      ))}
    </svg>
  );
}

function HalfGauge({ value, max = 100, color = "#8b5cf6", label = "" }: { value: number; max?: number; color?: string; label?: string }) {
  const pct = Math.min(value / max, 1);
  const r = 44, cx = 65, cy = 60;
  const totalAngle = Math.PI;
  const startX = cx - r, startY = cy;
  const endX = cx + r, endY = cy;
  const sweepX = cx + r * Math.cos(Math.PI - pct * Math.PI);
  const sweepY = cy - r * Math.sin(pct * Math.PI);
  const largeArc = pct > 0.5 ? 1 : 0;
  const colorForVal = value >= 70 ? "#10b981" : value >= 50 ? "#f59e0b" : "#ef4444";
  const activeColor = color === "#8b5cf6" ? colorForVal : color;
  return (
    <svg width="130" height="78" viewBox="0 0 130 78">
      <path d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`} fill="none" stroke="#e2e8f0" strokeWidth="9" strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${sweepX.toFixed(2)} ${sweepY.toFixed(2)}`}
          fill="none" stroke={activeColor} strokeWidth="9" strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }} />
      )}
      <text x={cx} y={cy - 10} textAnchor="middle" fontSize="18" fontWeight="800" fill={activeColor}>{value}%</text>
      {label && <text x={cx} y={cy + 4} textAnchor="middle" fontSize="9" fill="#94a3b8">{label}</text>}
    </svg>
  );
}

function MiniSparkBar({ values, color = "#8b5cf6" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  const w = 120, h = 28, barW = Math.max(4, Math.floor(w / values.length) - 2);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {values.map((v, i) => {
        const barH = Math.max(2, (v / max) * (h - 4));
        return (
          <rect key={i} x={i * (barW + 2)} y={h - barH - 2} width={barW} height={barH}
            rx="2" fill={color} opacity={0.6 + 0.4 * (v / max)} />
        );
      })}
    </svg>
  );
}

function SkillStrengthBar({ pct, color }: { pct: number; color: string }) {
  return (
    <svg width="40" height="6" viewBox="0 0 40 6">
      <rect x="0" y="0" width="40" height="6" rx="3" fill="#e2e8f0" />
      <rect x="0" y="0" width={Math.max(4, pct * 0.4)} height="6" rx="3" fill={color}
        style={{ transition: "width 0.6s ease" }} />
    </svg>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

export default function CandidateProfilePage() {
  const params = useParams();
  const userId = (params?.id ?? "") as string;
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  // Resume viewer
  const [resumeViewMode, setResumeViewMode] = useState<"parsed" | "pdf">("parsed");
  const [pdfFallback, setPdfFallback] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  // Notes & Tags (localStorage)
  const [notes, setNotes] = useState<RecruiterNote[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Inline status update
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);

  // Job match analyzer
  const [matchJobId, setMatchJobId] = useState("");

  // Expanded app row
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

  // Saved (bookmark) toggle
  const [isSaved, setIsSaved] = useState(false);

  // Background verification per application
  const [bgByApp, setBgByApp] = useState<Record<string, BgVerificationSummary | null>>({});
  const [bgLoading, setBgLoading] = useState(false);
  const [bgActionId, setBgActionId] = useState<string | null>(null);

  // ── Derived ─────────────────────────────────────────────────────────────

  const jsp = profile?.jobSeekerProfile;

  const displayName = useMemo(() =>
    jsp?.firstName ? `${jsp.firstName}${jsp.lastName ? " " + jsp.lastName : ""}` : profile?.name || "Candidate",
    [profile, jsp]
  );

  const allSkills = useMemo(() => {
    if (jsp?.skills?.length) return jsp.skills;
    return getSkillNames(profile?.skills || []);
  }, [profile, jsp]);

  const verifiedSkillNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of profile?.skills || []) {
      if (s && typeof s === "object" && (s as any).verified && (s as any).name)
        set.add((s as any).name.toLowerCase().trim());
    }
    return set;
  }, [profile]);

  const candidateApplications = useMemo(() => allApplications, [allApplications]);

  const bestApp = useMemo(() =>
    candidateApplications.reduce<Application | null>((best, a) =>
      !best || (a.aiMatchScore ?? 0) > (best.aiMatchScore ?? 0) ? a : best, null),
    [candidateApplications]
  );

  const displayAtsScore = normalizeScore(jsp?.atsScore ?? bestApp?.atsScore);
  const displayAiScore = normalizeScore(bestApp?.aiMatchScore);
  const bestTestScore = useMemo(() => {
    const scores = candidateApplications.map(a => a.testScore).filter((s): s is number => s != null);
    return scores.length > 0 ? Math.max(...scores) : null;
  }, [candidateApplications]);

  const verdict = displayAiScore != null ? getVerdict(displayAiScore) : null;

  const matchJob = useMemo(() => jobs.find(j => j._id === matchJobId), [jobs, matchJobId]);

  const matchedSkills = useMemo(() => {
    if (!matchJob?.skillsRequired) return [];
    return matchJob.skillsRequired.filter(s =>
      allSkills.some(cs => cs.toLowerCase().includes(s.toLowerCase()))
    );
  }, [matchJob, allSkills]);

  const missingSkills = useMemo(() => {
    if (!matchJob?.skillsRequired) return [];
    return matchJob.skillsRequired.filter(s =>
      !allSkills.some(cs => cs.toLowerCase().includes(s.toLowerCase()))
    );
  }, [matchJob, allSkills]);

  // ── Effects ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    try {
      const n = localStorage.getItem(`rec_notes_${userId}`);
      if (n) setNotes(JSON.parse(n));
      const t = localStorage.getItem(`rec_tags_${userId}`);
      if (t) setSelectedTags(new Set(JSON.parse(t)));
      const sv = localStorage.getItem(`rec_saved_${userId}`);
      if (sv) setIsSaved(JSON.parse(sv));
    } catch {}
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const loadAll = async () => {
      setLoading(true);
      try {
        const [profileRes, resumeRes, appRes, jobsRes] = await Promise.all([
          fetch(`/api/users/${userId}`, { credentials: "include" }),
          fetch(`/api/resume/user/${userId}`, { credentials: "include" }),
          fetch("/api/applications/recruiter", { credentials: "include" }),
          fetch("/api/job-descriptions?limit=100", { credentials: "include" }),
        ]);

        if (profileRes.ok) {
          const d = await profileRes.json();
          setProfile(d.user);
        } else {
          toast({ title: "User not found", variant: "destructive" });
        }

        if (resumeRes.ok) {
          const d = await resumeRes.json();
          const list: Resume[] = d.resumes || [];
          setResumes(list);
          if (list.length > 0) setSelectedResume(list[0]);
        }

        if (appRes.ok) {
          const d = await appRes.json();
          const apps = (d.applications || [])
            .filter((a: any) => {
              const js = a.jobSeekerId;
              const id = typeof js === "object" ? js?._id : js;
              return id === userId || String(id) === userId;
            })
            .map((a: any) => {
              const jd = a.jobDescriptionId;
              return {
                ...a,
                aiMatchScore: normalizeScore(a.aiMatchScore),
                atsScore: normalizeScore(a.atsScore),
                testScore: normalizeScore(a.testScore),
                jobDescriptionId: jd && typeof jd === "object" ? jd : { _id: jd || "", title: a.jobTitle || "Job" },
              };
            });
          setAllApplications(apps);
        }

        if (jobsRes.ok) {
          const d = await jobsRes.json();
          setJobs(d.jobDescriptions || d.jobs || []);
        }
      } catch {
        toast({ title: "Error", description: "Failed to load profile.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, [userId]);

  useEffect(() => {
    if (allApplications.length > 0) {
      loadBgChecks(allApplications);
    }
  }, [allApplications.length]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const loadBgChecks = async (apps: Application[]) => {
    if (!apps.length) return;
    setBgLoading(true);
    const map: Record<string, BgVerificationSummary | null> = {};
    await Promise.all(
      apps.map(async (app) => {
        try {
          const res = await fetch(`/api/background-verification?applicationId=${app._id}`, {
            credentials: "include",
          });
          if (res.ok) {
            const d = await res.json();
            map[app._id] = d.verification;
          } else {
            map[app._id] = null;
          }
        } catch {
          map[app._id] = null;
        }
      }),
    );
    setBgByApp(map);
    setBgLoading(false);
  };

  const startBgCheck = async (applicationId: string) => {
    setBgActionId(applicationId);
    try {
      const res = await fetch("/api/background-verification", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          provider: "Manual",
          components: {
            identity: true,
            education: true,
            employment: true,
            criminal: true,
            drug: false,
            reference: true,
          },
          notes: "Initiated from candidate profile",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBgByApp(prev => ({ ...prev, [applicationId]: data.verification }));
        toast({ title: "Background check started" });
      } else {
        toast({ title: data.message || "Could not start check", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setBgActionId(null);
    }
  };

  const addNote = () => {
    if (!noteInput.trim()) return;
    const n: RecruiterNote = { id: Date.now().toString(), text: noteInput.trim(), createdAt: new Date().toISOString() };
    const updated = [n, ...notes];
    setNotes(updated);
    localStorage.setItem(`rec_notes_${userId}`, JSON.stringify(updated));
    setNoteInput("");
    toast({ title: "Note saved" });
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    localStorage.setItem(`rec_notes_${userId}`, JSON.stringify(updated));
  };

  const toggleTag = (tag: string) => {
    const next = new Set(selectedTags);
    next.has(tag) ? next.delete(tag) : next.add(tag);
    setSelectedTags(next);
    localStorage.setItem(`rec_tags_${userId}`, JSON.stringify(Array.from(next)));
  };

  const toggleSaved = () => {
    const next = !isSaved;
    setIsSaved(next);
    localStorage.setItem(`rec_saved_${userId}`, JSON.stringify(next));
    toast({ title: next ? "Saved to favourites" : "Removed from favourites" });
  };

  const updateAppStatus = async (appId: string, status: string) => {
    setUpdatingAppId(appId);
    try {
      const res = await fetch(`/api/applications/${appId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAllApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
        toast({ title: "Status updated", description: `Moved to "${status}"` });
        if (status === "Offer") {
          const bgRes = await fetch("/api/background-verification", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId: appId,
              provider: "Manual",
              components: {
                identity: true,
                education: true,
                employment: true,
                criminal: true,
                drug: false,
                reference: true,
              },
              notes: "Auto-initiated when application status set to Offer",
            }),
          });
          if (bgRes.ok) {
            const bgData = await bgRes.json();
            if (bgData.verification) {
              setBgByApp(prev => ({ ...prev, [appId]: bgData.verification }));
              toast({ title: "Background verification auto-started" });
            }
          }
        }
      } else {
        toast({ title: "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setUpdatingAppId(null);
    }
  };

  const exportProfile = () => {
    const rows = [
      ["Field", "Value"],
      ["Name", displayName],
      ["Email", profile?.email || ""],
      ["Phone", profile?.phone || jsp?.phone || ""],
      ["Location", jsp?.location || profile?.address || ""],
      ["Title", jsp?.currentTitle || ""],
      ["Experience (yrs)", String(jsp?.yearsOfExperience || profile?.yearsOfExperience || 0)],
      ["Skills", allSkills.join(", ")],
      ["ATS Score", String(jsp?.atsScore || "")],
      ["Profile Completeness", String(jsp?.profileCompleteness || "")],
      ["Best AI Match", String(bestApp?.aiMatchScore || "")],
      ["Open to Work", String(jsp?.openToWork || false)],
      ["LinkedIn", jsp?.linkedinUrl || ""],
      ["GitHub", jsp?.githubUrl || ""],
      ["Total Applications", String(candidateApplications.length)],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${displayName.replace(/\s+/g, "_")}_profile.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Profile exported" });
  };

  const copyEmail = () => {
    if (profile?.email) {
      navigator.clipboard.writeText(profile.email);
      toast({ title: "Email copied" });
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto w-full">
        <div className="h-6 w-56 bg-muted animate-pulse rounded-lg" />
        <div className="h-[280px] sm:h-[240px] bg-muted animate-pulse rounded-2xl" />
        <div className="grid lg:grid-cols-4 gap-5">
          <div className="h-96 bg-muted animate-pulse rounded-xl" />
          <div className="lg:col-span-3 h-96 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <User className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="font-semibold text-muted-foreground">Candidate not found</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/dashboard/recruiter/candidates"><ArrowLeft className="mr-2 h-3.5 w-3.5" />Back</Link>
        </Button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-[1400px] mx-auto w-full">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
        <Link href="/dashboard/recruiter" className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
        <Link href="/dashboard/recruiter/candidates" className="hover:text-foreground transition-colors">Candidates</Link>
        <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
        <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">{displayName}</span>
      </div>

      {/* Hero Banner */}
      <Card className="border shadow-sm overflow-hidden">
        {/* Top band — avatar + identity live inside the gradient (no overlap collapse) */}
        <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(circle_at_20%_0%,white,transparent_45%),radial-gradient(circle_at_80%_100%,white,transparent_40%)]" />
          <div className="relative px-4 sm:px-6 pt-5 pb-6 sm:pt-6 sm:pb-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              {/* Identity block */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 min-w-0 flex-1">
                <div
                  className="h-20 w-20 sm:h-[88px] sm:w-[88px] rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 shadow-xl flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shrink-0 mx-auto sm:mx-0"
                >
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 text-center sm:text-left space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap justify-center sm:justify-start">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{displayName}</h1>
                    {verdict && (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${verdict.bg} ${verdict.color} border border-current/15 shadow-sm`}>
                        <Sparkles className="h-3 w-3" />
                        {verdict.label}
                      </span>
                    )}
                    {jsp?.openToWork && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 text-white text-xs font-semibold px-2.5 py-1">
                        <Sparkles className="h-3 w-3" />Open to Work
                      </span>
                    )}
                  </div>
                  <p className="text-violet-100 text-sm sm:text-base">
                    {jsp?.currentTitle || profile.role.replace("_", " ")}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center sm:justify-start text-xs sm:text-sm text-violet-100/90">
                    <button onClick={copyEmail} className="flex items-center gap-1.5 hover:text-white transition-colors max-w-full">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{profile.email}</span>
                      <Copy className="h-3 w-3 shrink-0 opacity-60" />
                    </button>
                    {(profile.phone || jsp?.phone) && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {profile.phone || jsp?.phone}
                      </span>
                    )}
                    {(jsp?.location || profile.address) && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{jsp?.location || profile.address}</span>
                      </span>
                    )}
                    {jsp?.industry && (
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        {jsp.industry}
                      </span>
                    )}
                  </div>
                  {selectedTags.size > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start pt-1">
                      {Array.from(selectedTags).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-white/15 text-white text-xs font-medium px-2 py-0.5 border border-white/20">
                          <Tag className="h-2.5 w-2.5" />{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2 shrink-0">
                <button
                  onClick={toggleSaved}
                  className={`p-2.5 rounded-xl border transition-colors ${isSaved ? "bg-amber-400/20 text-amber-100 border-amber-300/40" : "bg-white/10 hover:bg-white/20 border-white/20 text-white"}`}
                  title="Save candidate"
                >
                  {isSaved ? <BookmarkCheck className="h-4 w-4" fill="currentColor" /> : <Bookmark className="h-4 w-4" />}
                </button>
                {jsp?.linkedinUrl && (
                  <Button asChild variant="secondary" size="sm" className="h-9 text-xs bg-white/95 hover:bg-white text-violet-900 border-0">
                    <a href={jsp.linkedinUrl} target="_blank" rel="noreferrer">
                      <Linkedin className="h-3.5 w-3.5 mr-1.5" />LinkedIn
                    </a>
                  </Button>
                )}
                {jsp?.githubUrl && (
                  <Button asChild variant="secondary" size="sm" className="h-9 text-xs bg-white/95 hover:bg-white text-slate-800 border-0">
                    <a href={jsp.githubUrl} target="_blank" rel="noreferrer">
                      <Github className="h-3.5 w-3.5 mr-1.5" />GitHub
                    </a>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 text-xs bg-white/95 hover:bg-white text-slate-800 border-0"
                  onClick={exportProfile}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />Export
                </Button>
                <Button asChild size="sm" className="h-9 text-xs bg-white text-violet-700 hover:bg-violet-50 shadow-md border-0 font-semibold">
                  <Link href={`/dashboard/messages?userId=${profile._id}`}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1.5" />Message
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats strip — clean white section below banner */}
        <CardContent className="px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-b from-slate-50/80 to-white">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-xl bg-white border border-violet-100 shadow-sm px-4 py-3.5">
              <p className="text-2xl font-bold text-violet-700 tabular-nums">
                {jsp?.yearsOfExperience ?? profile.yearsOfExperience ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Years experience</p>
            </div>
            <div className="rounded-xl bg-white border border-blue-100 shadow-sm px-4 py-3.5">
              <p className="text-2xl font-bold text-blue-700 tabular-nums">{allSkills.length || "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Skills listed</p>
            </div>
            <div className="rounded-xl bg-white border border-emerald-100 shadow-sm px-3 py-2 flex flex-col items-center justify-center min-h-[88px]">
              {displayAtsScore != null ? (
                <ScoreRing value={displayAtsScore} size={52} stroke={5} color="#10b981" />
              ) : (
                <p className="text-2xl font-bold text-slate-300">—</p>
              )}
              <p className="text-xs text-muted-foreground mt-1 font-medium">ATS Score</p>
            </div>
            <div className="rounded-xl bg-white border border-amber-100 shadow-sm px-3 py-2 flex flex-col items-center justify-center min-h-[88px]">
              {displayAiScore != null ? (
                <ScoreRing value={displayAiScore} size={52} stroke={5} color="#f59e0b" />
              ) : (
                <p className="text-2xl font-bold text-slate-300">—</p>
              )}
              <p className="text-xs text-muted-foreground mt-1 font-medium">Best AI Match</p>
            </div>
            <div className="rounded-xl bg-white border border-indigo-100 shadow-sm px-4 py-3.5 col-span-2 sm:col-span-1">
              <p className="text-2xl font-bold text-indigo-700 tabular-nums">{candidateApplications.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Applications</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Layout: Sidebar + Content */}
      <div className="grid lg:grid-cols-4 gap-5">

        {/* ─── Left Sidebar ──────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Quick Actions */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-violet-500" />Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bestApp && (
                <Button
                  variant="outline" size="sm"
                  className="w-full justify-start h-8 text-xs text-violet-700 border-violet-200 hover:bg-violet-50"
                  onClick={() => updateAppStatus(bestApp._id, "Shortlisted")}
                  disabled={updatingAppId === bestApp._id}
                >
                  {updatingAppId === bestApp._id ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5 mr-2" />}
                  Shortlist Candidate
                </Button>
              )}
              <Button asChild variant="outline" size="sm" className="w-full justify-start h-8 text-xs">
                <Link href={`/dashboard/recruiter/video-interviews?userId=${userId}`}>
                  <Calendar className="h-3.5 w-3.5 mr-2 text-blue-500" />Schedule Interview
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start h-8 text-xs">
                <Link href={`/dashboard/recruiter/assessments?userId=${userId}`}>
                  <BookOpen className="h-3.5 w-3.5 mr-2 text-amber-500" />Assign Assessment
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start h-8 text-xs">
                <Link href={`/dashboard/messages?userId=${userId}`}>
                  <Send className="h-3.5 w-3.5 mr-2 text-emerald-500" />Send Message
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start h-8 text-xs" onClick={exportProfile}>
                <Download className="h-3.5 w-3.5 mr-2 text-indigo-500" />Export Profile CSV
              </Button>
              {bestApp && (
                <Button
                  variant="outline" size="sm"
                  className="w-full justify-start h-8 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => updateAppStatus(bestApp._id, "Rejected")}
                  disabled={updatingAppId === bestApp._id}
                >
                  <XCircle className="h-3.5 w-3.5 mr-2" />Reject Candidate
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Verdict Card */}
          {verdict && displayAiScore != null && (
            <Card className={`border shadow-sm ${verdict.bg}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <ScoreRing value={displayAiScore} size={52} stroke={5} color={verdict.ring} />
                  <div>
                    <p className={`text-sm font-bold ${verdict.color}`}>{verdict.label}</p>
                    <p className="text-xs text-muted-foreground">AI Recommendation</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Based on best application</p>
                  </div>
                </div>
                {jsp?.profileCompleteness && (
                  <div className="mt-3">
                    <SkillBar label={`Profile Completeness: ${jsp.profileCompleteness}%`} value={jsp.profileCompleteness} color={jsp.profileCompleteness >= 70 ? "#16a34a" : jsp.profileCompleteness >= 50 ? "#f59e0b" : "#ef4444"} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-violet-500" />Labels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {PREDEFINED_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${
                      selectedTags.has(tag)
                        ? "bg-violet-100 text-violet-700 border-violet-300"
                        : "bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    {selectedTags.has(tag) && <CheckCircle className="inline h-2.5 w-2.5 mr-1" />}
                    {tag}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Profile Scores Breakdown — mini rings */}
          {(bestApp?.aiMatchScore != null || bestApp?.atsScore != null) && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-violet-500" />Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "AI Match",  val: bestApp?.aiMatchScore,  color: "#8b5cf6" },
                    { label: "ATS",       val: bestApp?.atsScore,       color: "#3b82f6" },
                    { label: "Test",      val: bestApp?.testScore,      color: "#10b981" },
                    { label: "Profile",   val: jsp?.profileCompleteness,color: "#f59e0b" },
                  ].filter(s => s.val != null).map(s => (
                    <div key={s.label} className="flex flex-col items-center gap-1">
                      <ScoreRing value={s.val!} size={48} stroke={5} color={s.color} />
                      <span className="text-[10px] text-muted-foreground font-medium">{s.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Details */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-violet-500" />Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{profile.email}</span>
                </span>
                <button onClick={copyEmail} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              {(profile.phone || jsp?.phone) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{profile.phone || jsp?.phone}</span>
                </div>
              )}
              {(jsp?.location || profile.address) && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>{jsp?.location || profile.address}</span>
                </div>
              )}
              {jsp?.linkedinUrl && (
                <a href={jsp.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline">
                  <Linkedin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">LinkedIn Profile</span>
                </a>
              )}
              {jsp?.githubUrl && (
                <a href={jsp.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-slate-600 hover:underline">
                  <Github className="h-3.5 w-3.5 shrink-0" /><span className="truncate">GitHub Profile</span>
                </a>
              )}
              {jsp?.portfolioUrl && (
                <a href={jsp.portfolioUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-violet-600 hover:underline">
                  <Globe className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Portfolio</span>
                </a>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Main Content Tabs ─────────────────────────────────────── */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="h-10 flex-wrap gap-0.5">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
              <TabsTrigger value="experience" className="text-xs sm:text-sm">Experience</TabsTrigger>
              <TabsTrigger value="resumes" className="text-xs sm:text-sm">
                Resumes {resumes.length > 0 && <Badge className="ml-1.5 bg-violet-100 text-violet-700 border-0 text-xs h-4 px-1">{resumes.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="applications" className="text-xs sm:text-sm">
                Applications {candidateApplications.length > 0 && <Badge className="ml-1.5 bg-blue-100 text-blue-700 border-0 text-xs h-4 px-1">{candidateApplications.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="match" className="text-xs sm:text-sm">Job Match</TabsTrigger>
              <TabsTrigger value="verification" className="text-xs sm:text-sm">
                <Shield className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Verification
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs sm:text-sm">
                Notes {notes.length > 0 && <Badge className="ml-1.5 bg-amber-100 text-amber-700 border-0 text-xs h-4 px-1">{notes.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* ══ OVERVIEW TAB ══ */}
            <TabsContent value="overview" className="space-y-4">

              {/* About */}
              {jsp?.summary && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4 text-violet-500" />About</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{jsp.summary}</p>
                  </CardContent>
                </Card>
              )}

              {/* Skills */}
              {allSkills.length > 0 && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Code className="h-4 w-4 text-violet-500" />Skills
                      <Badge className="ml-auto bg-violet-50 text-violet-700 border-0 text-xs">{allSkills.length} total</Badge>
                      {verifiedSkillNames.size > 0 && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">{verifiedSkillNames.size} verified</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {allSkills.map((skill, i) => {
                        const isVerified = verifiedSkillNames.has(skill.toLowerCase().trim());
                        return (
                          <span key={i} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border ${
                            isVerified ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"
                          }`}>
                            {isVerified && <CheckCircle className="h-3 w-3" />}
                            {skill}
                            {isVerified && <span className="text-[9px] uppercase tracking-wide opacity-70">verified</span>}
                          </span>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Scorecard — radar + stat pills */}
              {(bestApp?.aiMatchScore != null || bestApp?.atsScore != null || jsp?.profileCompleteness != null) && (
                <Card className="border shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-violet-500 via-indigo-400 to-blue-500" />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-violet-500" />Candidate Scorecard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6 flex-wrap">
                      <RadarChart dims={[
                        { label: "AI Match",  value: bestApp?.aiMatchScore ?? 0, max: 100 },
                        { label: "ATS",       value: bestApp?.atsScore ?? (jsp?.atsScore ?? 0), max: 100 },
                        { label: "Profile",   value: jsp?.profileCompleteness ?? 0, max: 100 },
                        { label: "Skills",    value: Math.min((allSkills.length / 20) * 100, 100), max: 100 },
                        { label: "Test",      value: bestApp?.testScore ?? 0, max: 100 },
                      ]} />
                      <div className="flex-1 grid grid-cols-2 gap-3 min-w-[180px]">
                        {[
                          { label: "AI Match",  value: bestApp?.aiMatchScore ?? 0, color: "text-violet-700", bg: "bg-violet-50", bar: "#8b5cf6" },
                          { label: "ATS Score", value: bestApp?.atsScore ?? (jsp?.atsScore ?? 0), color: "text-blue-700", bg: "bg-blue-50", bar: "#3b82f6" },
                          { label: "Profile",   value: jsp?.profileCompleteness ?? 0, color: "text-indigo-700", bg: "bg-indigo-50", bar: "#6366f1" },
                          { label: "Test Score",value: bestApp?.testScore ?? 0, color: "text-emerald-700", bg: "bg-emerald-50", bar: "#10b981" },
                        ].map(s => (
                          <div key={s.label} className={`rounded-xl ${s.bg} px-3 py-2.5 space-y-1`}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{s.label}</span>
                              <span className={`text-sm font-bold ${s.color}`}>{s.value > 0 ? `${s.value}%` : "—"}</span>
                            </div>
                            <SkillStrengthBar pct={s.value} color={s.bar} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Career Preferences */}
                {(jsp?.desiredRole || jsp?.workPreference || jsp?.salaryExpectation || jsp?.experienceLevel) && (
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-blue-500" />Career Preferences</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {[
                        { label: "Desired Role",   value: jsp?.desiredRole },
                        { label: "Work Mode",      value: jsp?.workPreference?.replace(/_/g, " ") },
                        { label: "Salary",         value: jsp?.salaryExpectation },
                        { label: "Level",          value: jsp?.experienceLevel },
                      ].filter(r => r.value).map(r => (
                        <div key={r.label} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{r.label}</span>
                          <span className="font-medium capitalize text-right max-w-[60%] truncate">{r.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Education */}
                {(jsp?.university || jsp?.education) && (
                  <Card className="border shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2"><GraduationCap className="h-4 w-4 text-indigo-500" />Education</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                          <GraduationCap className="h-4.5 w-4.5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{jsp?.education || "—"}</p>
                          {jsp?.university && <p className="text-xs text-muted-foreground mt-0.5">{jsp.university}</p>}
                          <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                            {jsp?.graduationYear && <span>{jsp.graduationYear}</span>}
                            {jsp?.gpa && <span>GPA: {jsp.gpa}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Achievements */}
              {jsp?.achievements && jsp.achievements.length > 0 && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" />Achievements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {jsp.achievements.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100">
                          <Star className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" fill="currentColor" />
                          <span className="text-muted-foreground text-xs leading-relaxed">{a}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!jsp && !allSkills.length && (
                <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 py-16 text-center">
                  <User className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">This candidate hasn't completed their profile yet.</p>
                </div>
              )}
            </TabsContent>

            {/* ══ EXPERIENCE TAB ══ */}
            <TabsContent value="experience" className="space-y-4">
              {/* Work Experience */}
              {jsp?.experiences && jsp.experiences.length > 0 ? (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-blue-500" />Work Experience
                      <Badge className="ml-auto bg-blue-50 text-blue-700 border-0 text-xs">{jsp.experiences.length} positions</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative space-y-6 pl-7 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-violet-400 before:to-slate-200">
                      {jsp.experiences.map((exp, i) => (
                        <div key={i} className="relative">
                          <div className={`absolute -left-7 top-1.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${exp.current ? "border-violet-500 bg-violet-100" : "border-slate-300 bg-white"}`}>
                            <div className={`h-2 w-2 rounded-full ${exp.current ? "bg-violet-500" : "bg-slate-300"}`} />
                          </div>
                          <div className="rounded-xl border bg-muted/20 p-4 hover:bg-muted/40 transition-colors">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div>
                                <p className="font-semibold text-sm">{exp.role}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Building2 className="h-3 w-3" />{exp.company}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {exp.startDate}{exp.current ? " — Present" : exp.endDate ? ` — ${exp.endDate}` : ""}
                                </span>
                                {exp.current && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-medium mt-1">Current</span>
                                )}
                              </div>
                            </div>
                            {exp.description && (
                              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{exp.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 py-10 text-center">
                  <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No work experience listed</p>
                </div>
              )}

              {/* Projects */}
              {jsp?.projects && jsp.projects.length > 0 && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Layers className="h-4 w-4 text-indigo-500" />Projects
                      <Badge className="ml-auto bg-indigo-50 text-indigo-700 border-0 text-xs">{jsp.projects.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {jsp.projects.map((p, i) => (
                        <div key={i} className="rounded-xl border bg-gradient-to-br from-indigo-50/50 to-violet-50/30 p-3.5 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-sm">{p.title}</p>
                            {p.link && (
                              <a href={p.link} target="_blank" rel="noreferrer" className="text-violet-600 hover:text-violet-700 shrink-0">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          {p.description && <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>}
                          {p.tags && p.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {p.tags.map((t, ti) => (
                                <span key={ti} className="rounded-md bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-medium">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ══ RESUMES TAB ══ */}
            <TabsContent value="resumes" className="space-y-4">
              {resumes.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-semibold text-muted-foreground">No resumes uploaded</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">This candidate hasn't uploaded any resumes yet</p>
                </div>
              ) : (
                <div className="grid lg:grid-cols-4 gap-4">
                  {/* Resume list */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Select Resume</p>
                    {resumes.map((r) => (
                      <button
                        key={r._id}
                        onClick={() => { setSelectedResume(r); setPdfFallback(false); setResumeViewMode("parsed"); }}
                        className={`w-full flex items-start gap-2.5 rounded-xl p-3 text-left border transition-all ${
                          selectedResume?._id === r._id ? "bg-violet-50 border-violet-300" : "border-transparent hover:bg-muted/50"
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${selectedResume?._id === r._id ? "bg-violet-100" : "bg-muted"}`}>
                          <FileText className={`h-4 w-4 ${selectedResume?._id === r._id ? "text-violet-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{r.filename}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {r.uploadDate ? format(new Date(r.uploadDate), "MMM d, yyyy") : "—"}
                          </p>
                          {r.atsScore && <span className="text-[10px] font-medium text-emerald-700">ATS: {r.atsScore}%</span>}
                          {r.status && (
                            <span className={`block text-[10px] mt-0.5 ${r.status === "processed" ? "text-emerald-600" : r.status === "error" ? "text-rose-500" : "text-amber-500"}`}>
                              {r.status}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Resume detail */}
                  <div className="lg:col-span-3">
                    {selectedResume ? (
                      <Card className="border shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <FileText className="h-4 w-4 text-violet-500" />
                              {selectedResume.filename}
                            </CardTitle>
                            <div className="flex items-center gap-2 flex-wrap">
                              {selectedResume.atsScore && (
                                <Badge className={`text-xs border-0 ${selectedResume.atsScore >= 70 ? "bg-emerald-100 text-emerald-700" : selectedResume.atsScore >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                                  ATS {selectedResume.atsScore}%
                                </Badge>
                              )}
                              {selectedResume.size && (
                                <span className="text-xs text-muted-foreground">{(selectedResume.size / 1024).toFixed(0)} KB</span>
                              )}
                              {selectedResume.fileUrl && (
                                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                                  <a href={selectedResume.fileUrl} download>
                                    <Download className="h-3 w-3 mr-1" />Download
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* View mode toggle */}
                          <div className="flex gap-0.5 p-0.5 bg-muted rounded-lg w-fit mb-4">
                            {(["parsed", "pdf"] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => { setResumeViewMode(t); setPdfFallback(false); }}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                                  resumeViewMode === t ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {t === "pdf" ? "View PDF / File" : "Parsed Data"}
                              </button>
                            ))}
                          </div>

                          {/* ── PARSED VIEW ── */}
                          {resumeViewMode === "parsed" && (
                            <div className="space-y-5">
                              {selectedResume.extractedData && (
                                <div className="grid sm:grid-cols-3 gap-3 rounded-xl bg-muted/30 p-3">
                                  {selectedResume.extractedData.name && <div className="text-sm"><span className="text-xs text-muted-foreground block">Name</span>{selectedResume.extractedData.name}</div>}
                                  {selectedResume.extractedData.email && <div className="text-sm"><span className="text-xs text-muted-foreground block">Email</span>{selectedResume.extractedData.email}</div>}
                                  {selectedResume.extractedData.phone && <div className="text-sm"><span className="text-xs text-muted-foreground block">Phone</span>{selectedResume.extractedData.phone}</div>}
                                </div>
                              )}

                              {selectedResume.extractedData?.experience && selectedResume.extractedData.experience.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Work Experience</h4>
                                  <div className="space-y-2.5">
                                    {selectedResume.extractedData.experience.map((exp, i) => (
                                      <div key={i} className="border-l-2 border-violet-200 pl-3">
                                        <p className="text-sm font-medium">{exp.title || "—"}</p>
                                        {exp.company && <p className="text-xs text-muted-foreground">{exp.company}</p>}
                                        {exp.duration && <p className="text-xs text-muted-foreground">{exp.duration}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedResume.extractedData?.education && selectedResume.extractedData.education.length > 0 && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Education</h4>
                                  <div className="space-y-2">
                                    {selectedResume.extractedData.education.map((edu, i) => (
                                      <div key={i} className="border-l-2 border-indigo-200 pl-3">
                                        <p className="text-sm font-medium">{edu.degree || "—"}</p>
                                        {edu.school && <p className="text-xs text-muted-foreground">{edu.school}</p>}
                                        {edu.year && <p className="text-xs text-muted-foreground">{edu.year}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {((selectedResume.extractedData?.skills || selectedResume.metadata?.skills || []).filter(Boolean).length > 0) && (
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Extracted Skills</h4>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(selectedResume.extractedData?.skills || selectedResume.metadata?.skills || []).map((s, i) => (
                                      <span key={i} className="rounded-md bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 text-xs">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedResume.analysis && (
                                <div className="grid sm:grid-cols-2 gap-3">
                                  {selectedResume.analysis.strengths && selectedResume.analysis.strengths.length > 0 && (
                                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                                      <p className="text-xs font-semibold text-emerald-700 mb-2 flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />Strengths</p>
                                      <ul className="space-y-1">
                                        {selectedResume.analysis.strengths.map((s, i) => (
                                          <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />{s}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {selectedResume.analysis.improvements && selectedResume.analysis.improvements.length > 0 && (
                                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                                      <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Improvements</p>
                                      <ul className="space-y-1">
                                        {selectedResume.analysis.improvements.map((s, i) => (
                                          <li key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                                            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />{s}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Raw text — always shown if available */}
                              {selectedResume.parsedText ? (
                                <div>
                                  <button
                                    onClick={() => setShowRawText(v => !v)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 hover:text-foreground transition-colors"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    Full Resume Text
                                    {showRawText ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                  </button>
                                  {showRawText && (
                                    <div className="max-h-80 overflow-y-auto rounded-xl bg-muted/40 border p-4">
                                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono">{selectedResume.parsedText}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                !selectedResume.extractedData && (
                                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-amber-800">Resume not parsed yet</p>
                                      <p className="text-xs text-amber-600 mt-0.5">The resume file was uploaded but hasn't been processed. Try the "View PDF / File" tab to download it.</p>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                          {/* ── PDF VIEW ── */}
                          {resumeViewMode === "pdf" && (
                            <div className="space-y-3">
                              {selectedResume.fileUrl ? (
                                <>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                      <a href={selectedResume.fileUrl} target="_blank" rel="noreferrer">
                                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open in New Tab
                                      </a>
                                    </Button>
                                    <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                                      <a href={selectedResume.fileUrl} download>
                                        <Download className="h-3.5 w-3.5 mr-1.5" />Download
                                      </a>
                                    </Button>
                                    {!pdfFallback && (
                                      <Button
                                        variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
                                        onClick={() => setPdfFallback(true)}
                                      >
                                        Use Google Viewer
                                      </Button>
                                    )}
                                  </div>

                                  {!pdfFallback ? (
                                    <div className="rounded-xl border overflow-hidden bg-muted/20">
                                      <iframe
                                        src={selectedResume.fileUrl}
                                        className="w-full h-[600px]"
                                        title={selectedResume.filename}
                                        onError={() => setPdfFallback(true)}
                                      />
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border overflow-hidden bg-muted/20">
                                      <iframe
                                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                                          selectedResume.fileUrl.startsWith("http")
                                            ? selectedResume.fileUrl
                                            : `${typeof window !== "undefined" ? window.location.origin : ""}${selectedResume.fileUrl}`
                                        )}&embedded=true`}
                                        className="w-full h-[600px]"
                                        title={selectedResume.filename}
                                      />
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center space-y-3">
                                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                                  <div>
                                    <p className="font-semibold text-muted-foreground">No file URL stored</p>
                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                      The resume file reference wasn't saved in the database. The parsed text data is available in the "Parsed Data" tab.
                                    </p>
                                  </div>
                                  <Button variant="outline" size="sm" className="text-xs" onClick={() => setResumeViewMode("parsed")}>
                                    View Parsed Data
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 py-16 text-center">
                        <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Select a resume to view details</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ══ APPLICATIONS TAB ══ */}
            <TabsContent value="applications" className="space-y-4">
              {candidateApplications.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 py-16 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="font-semibold text-muted-foreground">No applications found</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">This candidate hasn't applied to your jobs yet</p>
                </div>
              ) : (
                <>
                  {/* Stats row with score rings */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border bg-slate-50 px-4 py-3 text-center">
                      <p className="text-xl font-bold text-slate-700">{candidateApplications.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Total Applied</p>
                    </div>
                    <div className="rounded-xl border bg-violet-50 px-3 py-3 flex flex-col items-center">
                      {displayAiScore != null
                        ? <ScoreRing value={displayAiScore} size={44} stroke={5} color="#8b5cf6" />
                        : <p className="text-xl font-bold text-violet-700">—</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">Best AI Score</p>
                    </div>
                    <div className="rounded-xl border bg-emerald-50 px-4 py-3 text-center">
                      <p className="text-xl font-bold text-emerald-700">{candidateApplications.filter(a => a.status === "Shortlisted" || a.shortlisted).length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Shortlisted</p>
                    </div>
                    <div className="rounded-xl border bg-blue-50 px-3 py-3 flex flex-col items-center">
                      {bestTestScore != null
                        ? <ScoreRing value={bestTestScore} size={44} stroke={5} color="#3b82f6" />
                        : <p className="text-xl font-bold text-blue-700">—</p>}
                      <p className="text-xs text-muted-foreground mt-0.5">Best Test</p>
                    </div>
                  </div>

                  {/* Pipeline stage visual */}
                  {(() => {
                    const STAGES = [
                      { key: "Applied",    label: "Applied",   color: "#94a3b8", bg: "bg-slate-100" },
                      { key: "Under Review", label: "Review",  color: "#60a5fa", bg: "bg-blue-100" },
                      { key: "Shortlisted",  label: "Shortlist",color: "#a78bfa", bg: "bg-violet-100" },
                      { key: "Interview Scheduled", label: "Interview", color: "#818cf8", bg: "bg-indigo-100" },
                      { key: "Hired",      label: "Hired",     color: "#34d399", bg: "bg-emerald-100" },
                    ];
                    const bestStageIdx = (() => {
                      if (!bestApp) return 0;
                      if (bestApp.status === "Hired") return 4;
                      if (bestApp.status === "Interview Scheduled") return 3;
                      if (bestApp.status === "Shortlisted") return 2;
                      if (bestApp.status === "Under Review") return 1;
                      return 0;
                    })();
                    return (
                      <Card className="border shadow-sm">
                        <CardContent className="pt-4 pb-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Hiring Stage</p>
                          <div className="flex items-center gap-0">
                            {STAGES.map((stage, i) => (
                              <div key={stage.key} className="flex items-center flex-1">
                                <div className="flex-1 flex flex-col items-center gap-1.5">
                                  <div className={`h-7 w-7 rounded-full flex items-center justify-center transition-all ${
                                    i <= bestStageIdx ? "shadow-md" : "opacity-30"
                                  }`} style={{ background: i <= bestStageIdx ? stage.color : "#e2e8f0" }}>
                                    {i < bestStageIdx ? (
                                      <CheckCircle className="h-4 w-4 text-white" />
                                    ) : i === bestStageIdx ? (
                                      <div className="h-2.5 w-2.5 rounded-full bg-white" />
                                    ) : (
                                      <div className="h-2 w-2 rounded-full bg-slate-300" />
                                    )}
                                  </div>
                                  <span className={`text-[9px] font-medium text-center leading-tight ${i <= bestStageIdx ? "text-foreground" : "text-muted-foreground"}`}>
                                    {stage.label}
                                  </span>
                                </div>
                                {i < STAGES.length - 1 && (
                                  <div className={`h-0.5 flex-1 -mt-4 rounded-full transition-all ${i < bestStageIdx ? "bg-violet-400" : "bg-muted"}`} />
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  <div className="space-y-3">
                    {candidateApplications.map((app) => {
                      const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG["Pending"];
                      const v = app.aiMatchScore != null ? getVerdict(app.aiMatchScore) : null;
                      const isExpanded = expandedAppId === app._id;
                      let dateStr = "—";
                      try { dateStr = format(new Date(app.applicationDate || ""), "MMM d, yyyy"); } catch {}

                      return (
                        <Card key={app._id} className="border shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-200 flex items-center justify-center shrink-0">
                                <Briefcase className="h-4 w-4 text-violet-700" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{app.jobDescriptionId?.title || "—"}</p>
                                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />Applied {dateStr}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {app.aiMatchScore != null && (
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground">AI</p>
                                    <p className="text-sm font-bold text-violet-700">{app.aiMatchScore}%</p>
                                  </div>
                                )}
                                {app.atsScore != null && (
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground">ATS</p>
                                    <p className="text-sm font-bold text-blue-700">{app.atsScore}%</p>
                                  </div>
                                )}
                                {app.testScore != null && (
                                  <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground">Test</p>
                                    <p className={`text-sm font-bold ${app.testScore >= 60 ? "text-emerald-600" : "text-rose-600"}`}>{app.testScore}%</p>
                                  </div>
                                )}
                              </div>

                              {v && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${v.bg} ${v.color}`}>
                                  {v.label}
                                </span>
                              )}

                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ${sc.bg} ${sc.color}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />{app.status}
                              </span>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {/* Inline status update */}
                                <Select
                                  value={app.status}
                                  onValueChange={(s) => updateAppStatus(app._id, s)}
                                  disabled={updatingAppId === app._id}
                                >
                                  <SelectTrigger className="h-7 w-36 text-xs border-dashed">
                                    {updatingAppId === app._id
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : <SelectValue placeholder="Change..." />
                                    }
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATUS_OPTIONS.map(s => (
                                      <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <button onClick={() => setExpandedAppId(isExpanded ? null : app._id)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground">
                                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                </button>

                                <Button asChild variant="outline" size="sm" className="h-7 text-xs px-2">
                                  <Link href={`/dashboard/recruiter/job-descriptions/${app.jobDescriptionId?._id}/candidates`}>
                                    Pipeline <ChevronRight className="ml-1 h-3 w-3" />
                                  </Link>
                                </Button>
                              </div>
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t space-y-3">
                                {(app.aiMatchScore != null || app.atsScore != null) && (
                                  <div className="grid sm:grid-cols-2 gap-2">
                                    {app.aiMatchScore != null && (
                                      <SkillBar label={`AI Match: ${app.aiMatchScore}%`} value={app.aiMatchScore} color={app.aiMatchScore >= 70 ? "#7c3aed" : app.aiMatchScore >= 50 ? "#f59e0b" : "#ef4444"} />
                                    )}
                                    {app.atsScore != null && (
                                      <SkillBar label={`ATS Score: ${app.atsScore}%`} value={app.atsScore} color={app.atsScore >= 70 ? "#2563eb" : app.atsScore >= 50 ? "#f59e0b" : "#ef4444"} />
                                    )}
                                  </div>
                                )}
                                {(app.skillsMatched || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className="text-xs text-muted-foreground mr-1 self-center">Matched:</span>
                                    {(app.skillsMatched || []).slice(0, 8).map((s, i) => (
                                      <span key={i} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs">
                                        <CheckCircle className="h-2.5 w-2.5" />{s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {(app.missingSkills || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    <span className="text-xs text-muted-foreground mr-1 self-center">Missing:</span>
                                    {(app.missingSkills || []).slice(0, 6).map((s, i) => (
                                      <span key={i} className="inline-flex items-center gap-1 rounded-md bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 text-xs">
                                        <XCircle className="h-2.5 w-2.5" />{s}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {app.aiExplanation && (
                                  <p className="text-xs text-muted-foreground italic bg-muted/30 rounded-lg px-3 py-2">{app.aiExplanation}</p>
                                )}
                                {app.rejectionReason && (
                                  <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                                    <XCircle className="h-3.5 w-3.5 shrink-0" />{app.rejectionReason}
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
                </>
              )}
            </TabsContent>

            {/* ══ JOB MATCH TAB ══ */}
            <TabsContent value="match" className="space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-violet-500" />Job Match Analyzer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Select a job to see how this candidate matches the required skills</p>
                    <Select value={matchJobId} onValueChange={setMatchJobId}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Pick a job to compare..." />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map(j => (
                          <SelectItem key={j._id} value={j._id} className="text-sm">{j.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {matchJob && (
                    <div className="space-y-4">
                      {matchJob.skillsRequired && matchJob.skillsRequired.length > 0 ? (
                        <>
                          {/* Match ratio — gauge */}
                          <div className="rounded-xl border bg-muted/20 p-4">
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex flex-col items-center">
                                <HalfGauge
                                  value={Math.round((matchedSkills.length / matchJob.skillsRequired.length) * 100)}
                                  label="skill coverage"
                                />
                                <span className="text-xs text-muted-foreground -mt-1">
                                  {matchedSkills.length}/{matchJob.skillsRequired.length} skills
                                </span>
                              </div>
                              <div className="flex-1 space-y-2 min-w-[140px]">
                                <p className="text-sm font-semibold">Skill Match for</p>
                                <p className="text-xs text-muted-foreground truncate">{matchJob.title}</p>
                                <div className="flex gap-3 mt-2">
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-emerald-700">{matchedSkills.length}</p>
                                    <p className="text-[10px] text-muted-foreground">Matched</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-rose-600">{missingSkills.length}</p>
                                    <p className="text-[10px] text-muted-foreground">Missing</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-lg font-bold text-slate-700">{matchJob.skillsRequired.length}</p>
                                    <p className="text-[10px] text-muted-foreground">Required</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Matched */}
                          {matchedSkills.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5" />Matched Skills ({matchedSkills.length})
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {matchedSkills.map((s, i) => (
                                  <span key={i} className="rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1.5 text-xs font-medium flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />{s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Missing */}
                          {missingSkills.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                <XCircle className="h-3.5 w-3.5" />Missing Skills ({missingSkills.length})
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {missingSkills.map((s, i) => (
                                  <span key={i} className="rounded-lg bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-1.5 text-xs font-medium flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />{s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button asChild size="sm" className="bg-violet-600 hover:bg-violet-700 text-xs h-8">
                            <Link href={`/dashboard/recruiter/job-descriptions/${matchJob._id}/candidates`}>
                              View in Pipeline <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
                          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                          <p className="text-sm text-amber-700">This job has no required skills listed.</p>
                          <p className="text-xs text-amber-600 mt-1">Add skills to the job description to enable match analysis.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {!matchJobId && (
                    <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 py-10 text-center">
                      <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Select a job above to analyze fit</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Candidate's full skill list for reference */}
              {allSkills.length > 0 && (
                <Card className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Code className="h-4 w-4 text-violet-500" />Candidate's Full Skill Set
                      <Badge className="ml-auto bg-violet-50 text-violet-700 border-0 text-xs">{allSkills.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {allSkills.map((s, i) => (
                        <span key={i} className={`rounded-lg px-2.5 py-1 text-xs border ${
                          matchJob?.skillsRequired?.some(r => s.toLowerCase().includes(r.toLowerCase()))
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}>{s}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ══ VERIFICATION TAB ══ */}
            <TabsContent value="verification" className="space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    Background Verification
                    <Link
                      href="/dashboard/recruiter/background-verification"
                      className="ml-auto text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Open full dashboard <ExternalLink className="h-3 w-3" />
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {bgLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading checks…
                    </div>
                  ) : allApplications.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No applications for this candidate.</p>
                  ) : (
                    allApplications.map((app) => {
                      const bg = bgByApp[app._id];
                      const jobTitle = app.jobDescriptionId?.title || "Job";
                      return (
                        <div key={app._id} className="rounded-xl border p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-sm">{jobTitle}</p>
                              <p className="text-xs text-muted-foreground">Application · {app.status}</p>
                            </div>
                            {bg ? (
                              <Badge className="bg-blue-100 text-blue-800">{bg.status}</Badge>
                            ) : (
                              <Badge variant="secondary">Not started</Badge>
                            )}
                          </div>
                          {bg ? (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2 text-xs">
                                <span className="text-muted-foreground">Provider: {bg.provider}</span>
                                {bg.overallResult && (
                                  <Badge className="bg-emerald-100 text-emerald-800">{bg.overallResult}</Badge>
                                )}
                                {bg.initiatedAt && (
                                  <span className="text-muted-foreground">
                                    Started {format(new Date(bg.initiatedAt), "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                              {bg.components && (
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(bg.components).map(([key, comp]) => (
                                    comp.status !== "Not Required" ? (
                                      <span key={key} className="text-xs px-2 py-0.5 rounded-full bg-muted capitalize">
                                        {key}: {comp.status}
                                      </span>
                                    ) : null
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="h-8 gap-2 bg-blue-600 hover:bg-blue-700"
                              disabled={bgActionId === app._id}
                              onClick={() => startBgCheck(app._id)}
                            >
                              {bgActionId === app._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Shield className="h-3.5 w-3.5" />
                              )}
                              Start background check
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ══ NOTES TAB ══ */}
            <TabsContent value="notes" className="space-y-4">
              <Card className="border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />Recruiter Notes
                    <span className="text-xs text-muted-foreground font-normal ml-1">— Private, saved locally</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Textarea
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      placeholder="Add a private note about this candidate..."
                      className="min-h-[100px] text-sm resize-none"
                      onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) addNote(); }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Ctrl+Enter to save</span>
                      <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700" onClick={addNote} disabled={!noteInput.trim()}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />Add Note
                      </Button>
                    </div>
                  </div>

                  {notes.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 py-8 text-center">
                      <p className="text-sm text-muted-foreground">No notes yet. Add your first note above.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {notes.map(n => (
                        <div key={n.id} className="rounded-xl border bg-amber-50/50 p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-foreground leading-relaxed flex-1">{n.text}</p>
                            <button onClick={() => deleteNote(n.id)} className="text-muted-foreground hover:text-rose-500 transition-colors shrink-0 mt-0.5">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {format(new Date(n.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
