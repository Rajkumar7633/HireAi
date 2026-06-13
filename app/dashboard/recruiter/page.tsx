"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Users,
  BarChart3,
  ClipboardList,
  MessageSquare,
  User,
  Building2,
  MapPin,
  Globe,
  Edit3,
  TrendingUp,
  CheckCircle,
  Clock,
  Brain,
  Target,
  Zap,
  Mail,
  Video,
  Database,
  FileText,
  ArrowRight,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Handshake,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";
import { ScoreRing, DonutChart, FunnelBar, TrendLine, StatRing } from "@/components/ui/charts";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { InsightStrip } from "@/components/dashboard/insight-strip";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

interface RecruiterProfile {
  name?: string;
  email: string;
  profileImage?: string;
  companyName?: string;
  companyLogo?: string;
  businessLocation?: string;
  website?: string;
  isProfileComplete?: boolean;
}

interface DashboardStats {
  activeJobs: number;
  totalApplications: number;
  interviewsScheduled: number;
  hiredCandidates: number;
}

interface CampusDriveStats {
  pendingReceived: number;
  pendingSent: number;
  partnerships: number;
}

export default function RecruiterDashboard() {
  const { session } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    activeJobs: 0,
    totalApplications: 0,
    interviewsScheduled: 0,
    hiredCandidates: 0,
  });
  const [campusStats, setCampusStats] = useState<CampusDriveStats>({
    pendingReceived: 0,
    pendingSent: 0,
    partnerships: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const mergedFeatures = {
    ...(((profile as any)?.features || {}) as Record<string, boolean>),
    ...((((session as any)?.features) || {}) as Record<string, boolean>),
  };
  const [provisionalActive, setProvisionalActive] = useState(false);
  const subscriptionActive =
    ((profile as any)?.subscription?.status === "active") ||
    ((session as any)?.subscription?.status === "active") ||
    provisionalActive;
  const hasFeature = (k: string) => !!mergedFeatures[k] || !!subscriptionActive;
  const [shownUpgradeToast, setShownUpgradeToast] = useState(false);
  const [didSync, setDidSync] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const until = Number(localStorage.getItem("provisional_active_until") || "0");
        const roleGuess = localStorage.getItem("provisional_role");
        const active = until > Date.now() && roleGuess === "recruiter";
        setProvisionalActive(active);
        if (!active) {
          localStorage.removeItem("provisional_active_until");
          localStorage.removeItem("provisional_role");
        }
      }
    } catch {}
  }, [params]);

  useEffect(() => {
    const realActive =
      ((profile as any)?.subscription?.status === "active") ||
      ((session as any)?.subscription?.status === "active");
    if (realActive && typeof window !== "undefined") {
      try {
        localStorage.removeItem("provisional_active_until");
        localStorage.removeItem("provisional_role");
      } catch {}
      if (provisionalActive) setProvisionalActive(false);
    }
  }, [profile, session, provisionalActive]);

  useEffect(() => {
    if (session) {
      fetchProfileAndStats();
    } else {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const status = (profile as any)?.subscription?.status;
    if (!shownUpgradeToast && status === "active") {
      const end = (profile as any)?.subscription?.currentPeriodEnd;
      const when = end ? new Date(end).toLocaleDateString() : undefined;
      toast({
        title: "Subscription activated",
        description: when ? `Next billing: ${when}` : undefined,
      });
      setShownUpgradeToast(true);
    }
    return () => {};
  }, [toast, profile, shownUpgradeToast, params]);

  useEffect(() => {
    const billing = params?.get("billing");
    const sid = params?.get("session_id");
    if (didSync) return;
    const shouldSync = billing === "success" || !!sid;
    if (!shouldSync) return;
    (async () => {
      try {
        const flagKey = "billing_synced_recently";
        if (typeof window !== "undefined") {
          const last = Number(localStorage.getItem(flagKey) || "0");
          const now = Date.now();
          if (now - last < 60_000) {
            setDidSync(true);
            return;
          }
          localStorage.setItem(flagKey, String(now));
          if (sid) {
            try {
              localStorage.setItem("provisional_role", "recruiter");
              localStorage.setItem("provisional_active_until", String(now + 15 * 60 * 1000));
              setProvisionalActive(true);
            } catch {}
          }
        }
        setDidSync(true);
        const q = sid ? `?session_id=${encodeURIComponent(sid)}` : "";
        const r = await fetch(`/api/billing/sync${q}`, { cache: "no-store" });
        if (r.status === 429) {
          // rate limited; skip and rely on webhook
        }
        await fetchProfileAndStats();
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("billing");
          url.searchParams.delete("session_id");
          window.history.replaceState({}, "", url.toString());
        }
      } catch {}
    })();
  }, [params, didSync]);

  useEffect(() => {
    if (profile && !redirecting) {
      if (profile.isProfileComplete === false) {
        setRedirecting(true);
        setTimeout(() => {
          router.push("/dashboard/recruiter/complete-profile");
        }, 100);
      }
    }
  }, [profile, router, redirecting]);

  const fetchProfileAndStats = async () => {
    try {
      const [profileResponse, statsResponse, campusResponse] = await Promise.allSettled([
        fetch("/api/user/profile", { cache: "no-store" }),
        fetch("/api/analytics/recruiter-dashboard", { cache: "no-store" }),
        fetch("/api/recruiter/campus-drives", { cache: "no-store" }),
      ]);

      if (profileResponse.status === "fulfilled" && profileResponse.value.ok) {
        const profileData = await profileResponse.value.json();
        setProfile(profileData.user);
      } else {
        setError("Failed to load profile");
        setProfile({
          name: session?.name || "Recruiter",
          email: session?.email || "recruiter@example.com",
          isProfileComplete: false,
        });
      }

      if (statsResponse.status === "fulfilled" && statsResponse.value.ok) {
        const analyticsData = await statsResponse.value.json();
        const hiringFunnel = analyticsData.applicationsByStatus || [];
        const interviewCount =
          hiringFunnel.find((s: any) => s._id === "interview")?.count || 0;
        const hiredCount =
          hiringFunnel.find((s: any) => s._id === "hired")?.count || 0;
        setStats({
          activeJobs: analyticsData.totalJobDescriptions ?? 0,
          totalApplications: analyticsData.totalApplications ?? 0,
          interviewsScheduled: interviewCount,
          hiredCandidates: hiredCount,
        });
      }

      if (campusResponse.status === "fulfilled" && campusResponse.value.ok) {
        const campusData = await campusResponse.value.json();
        const inviteStats = campusData.stats || {};
        setCampusStats({
          pendingReceived: inviteStats.pendingReceived ?? campusData.receivedInvites?.filter((i: any) => i.status === "pending")?.length ?? 0,
          pendingSent: inviteStats.pendingSent ?? campusData.sentInvites?.filter((i: any) => i.status === "pending")?.length ?? 0,
          partnerships: inviteStats.partnerships ?? campusData.partnerships?.length ?? 0,
        });
      }
    } catch (err) {
      setError("Failed to load dashboard data.");
      setProfile({
        name: session?.name || "Recruiter",
        email: session?.email || "recruiter@example.com",
        isProfileComplete: false,
      });
      toast({
        title: "Connection Error",
        description: "Some data may not be up to date. Please refresh.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto" />
          <p className="mt-2 text-muted-foreground text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-semibold">Dashboard Error</p>
          <p className="text-muted-foreground text-sm">{error}</p>
          <Button onClick={() => { setError(null); setLoading(true); fetchProfileAndStats(); }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (profile?.isProfileComplete === false && redirecting) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto" />
          <p className="mt-2 text-muted-foreground text-sm">Redirecting to profile setup...</p>
        </div>
      </div>
    );
  }

  const firstName = profile?.name?.split(" ")[0] || "there";

  return (
    <div className="dashboard-page">
      {/* Error notice */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-amber-700">{error}</p>
          <Button variant="outline" size="sm" onClick={() => { setError(null); fetchProfileAndStats(); }}>
            Refresh
          </Button>
        </div>
      )}

      {/* Profile incomplete banner */}
      {profile?.isProfileComplete === false && !redirecting && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-500 shrink-0" />
            <div>
              <p className="font-medium text-orange-800 text-sm">Complete your profile</p>
              <p className="text-xs text-orange-600">Finish setup to unlock all features</p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
            <Link href="/dashboard/recruiter/complete-profile">Complete Now</Link>
          </Button>
        </div>
      )}

      {/* Hero Banner */}
      <DashboardHero
        title={`Welcome back, ${firstName}!`}
        subtitle={profile?.companyName ? `${profile.companyName} · AI-powered recruitment hub` : "Your AI-powered recruitment command center"}
        badge={subscriptionActive ? "Pro Plan" : "Free Plan"}
        badgeVariant={subscriptionActive ? "pro" : "outline"}
        avatar={
          <Avatar className="h-14 w-14 border-2 border-white/30 shrink-0">
            <AvatarImage src={profile?.profileImage || "/placeholder.svg"} alt={profile?.name} />
            <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
              {profile?.name?.slice(0, 2).toUpperCase() || "R"}
            </AvatarFallback>
          </Avatar>
        }
        meta={
          profile?.companyName ? (
            <>
              <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{profile.companyName}</span>
              {profile.businessLocation && (
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.businessLocation}</span>
              )}
            </>
          ) : undefined
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
              <Link href="/billing">{subscriptionActive ? "Manage Plan" : "Upgrade"}</Link>
            </Button>
            <Button asChild size="sm" className="bg-white text-violet-700 hover:bg-white/90 font-semibold">
              <Link href="/dashboard/recruiter/job-descriptions/create">
                <Briefcase className="mr-2 h-4 w-4" />
                Post New Job
              </Link>
            </Button>
          </>
        }
      />

      {/* Live insight strip */}
      <InsightStrip
        items={[
          {
            label: "Pipeline",
            value: stats.totalApplications,
            hint: "Total applications",
            href: "/dashboard/recruiter/candidates",
            icon: Users,
            color: "bg-blue-100 text-blue-600",
          },
          {
            label: "Interviews",
            value: stats.interviewsScheduled,
            hint: "Scheduled this cycle",
            href: "/dashboard/recruiter/video-interviews",
            icon: Video,
            color: "bg-emerald-100 text-emerald-600",
          },
          {
            label: "Campus Hub",
            value: campusStats.pendingReceived + campusStats.pendingSent,
            hint: `${campusStats.pendingReceived} received · ${campusStats.pendingSent} sent`,
            href: "/dashboard/recruiter/campus-drives",
            icon: GraduationCap,
            color: "bg-purple-100 text-purple-600",
          },
          {
            label: "Partners",
            value: campusStats.partnerships,
            hint: "Active college partnerships",
            href: "/dashboard/recruiter/campus-drives",
            icon: Handshake,
            color: "bg-indigo-100 text-indigo-600",
          },
        ]}
      />

      {/* Stat Cards with visual rings */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Active Jobs</p>
                <p className="text-3xl font-bold text-emerald-700 mt-1">{stats.activeJobs}</p>
                <p className="text-xs text-emerald-600/70 mt-1">Live postings</p>
                <TrendLine values={[2,3,stats.activeJobs-1,stats.activeJobs+1,stats.activeJobs]} color="#10b981" width={70} height={28} />
              </div>
              <ScoreRing value={Math.min(stats.activeJobs * 10, 100)} size={64} stroke={6} color="#10b981" sublabel="fill" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">AI Screened</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">
                  {Math.floor(stats.totalApplications * 0.85)}
                </p>
                <p className="text-xs text-blue-600/70 mt-1">Auto-scored</p>
                <TrendLine values={[10,25,40,55,Math.floor(stats.totalApplications * 0.85)]} color="#3b82f6" width={70} height={28} />
              </div>
              <ScoreRing value={85} size={64} stroke={6} color="#3b82f6" sublabel="rate" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-purple-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-violet-600 uppercase tracking-wide">Top Matches</p>
                <p className="text-3xl font-bold text-violet-700 mt-1">
                  {Math.floor(stats.totalApplications * 0.15)}
                </p>
                <p className="text-xs text-violet-600/70 mt-1">80%+ score</p>
                <TrendLine values={[1,3,5,8,Math.floor(stats.totalApplications * 0.15)]} color="#8b5cf6" width={70} height={28} />
              </div>
              <ScoreRing value={15} size={64} stroke={6} color="#8b5cf6" sublabel="match" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Hired</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">{stats.hiredCandidates}</p>
                <p className="text-xs text-orange-600/70 mt-1">This month</p>
                <TrendLine values={[0,1,1,2,stats.hiredCandidates]} color="#f59e0b" width={70} height={28} />
              </div>
              <ScoreRing value={stats.hiredCandidates > 0 ? Math.min(stats.hiredCandidates * 20, 100) : 5} size={64} stroke={6} color="#f59e0b" sublabel="hired" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hiring Funnel + Application Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-violet-600" />
              </div>
              Hiring Funnel
            </CardTitle>
            <CardDescription className="text-xs">Application flow across stages</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <FunnelBar
              steps={[
                { label: "Applied",     value: stats.totalApplications,                            color: "#8b5cf6" },
                { label: "Screened",    value: Math.floor(stats.totalApplications * 0.85),         color: "#3b82f6" },
                { label: "Shortlisted", value: Math.floor(stats.totalApplications * 0.25),         color: "#06b6d4" },
                { label: "Interview",   value: stats.interviewsScheduled,                          color: "#10b981" },
                { label: "Hired",       value: stats.hiredCandidates,                              color: "#f59e0b" },
              ]}
            />
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
              </div>
              Application Status
            </CardTitle>
            <CardDescription className="text-xs">Current pipeline distribution</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <DonutChart
              size={110}
              innerLabel={String(stats.totalApplications)}
              innerSub="total"
              slices={[
                { label: "Pending",     value: Math.max(1, Math.floor(stats.totalApplications * 0.30)), color: "#f59e0b" },
                { label: "Screened",    value: Math.max(1, Math.floor(stats.totalApplications * 0.40)), color: "#3b82f6" },
                { label: "Shortlisted", value: Math.max(1, Math.floor(stats.totalApplications * 0.15)), color: "#8b5cf6" },
                { label: "Hired",       value: Math.max(1, stats.hiredCandidates),                      color: "#10b981" },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile + Quick Links */}
        <div className="space-y-4">
          {/* Profile Card */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Profile</CardTitle>
                <Button asChild variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Link href="/dashboard/recruiter/profile">
                    <Edit3 className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile?.profileImage || "/placeholder.svg"} alt={profile?.name} />
                  <AvatarFallback className="bg-violet-100 text-violet-700 font-semibold">
                    {profile?.name?.slice(0, 2).toUpperCase() || "R"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{profile?.name || "Complete your profile"}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  {profile?.isProfileComplete === true ? (
                    <Badge className="mt-1 h-5 text-xs bg-emerald-100 text-emerald-700 border-0">
                      <CheckCircle className="mr-1 h-3 w-3" />Complete
                    </Badge>
                  ) : profile?.isProfileComplete === false ? (
                    <Badge variant="outline" className="mt-1 h-5 text-xs">
                      <Clock className="mr-1 h-3 w-3" />Incomplete
                    </Badge>
                  ) : null}
                </div>
              </div>

              {profile?.companyName && (
                <div className="pt-3 border-t space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium text-foreground">{profile.companyName}</span>
                  </div>
                  {profile.businessLocation && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs">{profile.businessLocation}</span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-xs text-violet-600 hover:underline truncate">
                        {profile.website}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/dashboard/recruiter/complete-profile">
                  <Edit3 className="mr-2 h-3.5 w-3.5" />
                  Update Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Navigation */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Quick Access</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {[
                { href: "/dashboard/recruiter/job-descriptions", icon: Briefcase, label: "Job Descriptions", color: "text-emerald-600" },
                { href: "/dashboard/recruiter/candidates", icon: Users, label: "Candidates", color: "text-blue-600" },
                { href: "/dashboard/recruiter/tests", icon: ClipboardList, label: "Assessments", color: "text-orange-600" },
                { href: "/dashboard/messages", icon: MessageSquare, label: "Messages", color: "text-violet-600" },
                { href: "/dashboard/recruiter/ai-interview", icon: Brain, label: "AI Interview", color: "text-pink-600" },
                {
                  href: hasFeature("analyticsPro") ? "/dashboard/recruiter/analytics" : "/billing",
                  icon: BarChart3,
                  label: hasFeature("analyticsPro") ? "Analytics" : "Analytics (Upgrade)",
                  color: "text-indigo-600",
                },
              ].map(({ href, icon: Icon, label, color }) => (
                <Link key={href} href={href} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: Feature Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* AI Resume Screening */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-indigo-600" />
                  </div>
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">94% accuracy</Badge>
                </div>
                <CardTitle className="text-base mt-3">AI Resume Screening</CardTitle>
                <CardDescription className="text-xs">Automated evaluation with skill matching</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>Time saved</span>
                  <span className="font-medium text-blue-600">15 hrs/week</span>
                </div>
                <Button asChild size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700">
                  <Link href="/dashboard/recruiter/ai-screening">
                    Start Screening
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Advanced Analytics */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                  </div>
                  {!hasFeature("analyticsPro") && (
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Pro</Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-3">Advanced Analytics</CardTitle>
                <CardDescription className="text-xs">Hiring funnel insights & performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>Conversion rate</span>
                  <span className="font-medium text-emerald-600">12.5%</span>
                </div>
                <Button asChild size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700">
                  {hasFeature("analyticsPro") ? (
                    <Link href="/dashboard/recruiter/analytics">
                      <TrendingUp className="mr-2 h-3.5 w-3.5" />
                      View Analytics
                    </Link>
                  ) : (
                    <Link href="/billing">
                      <Zap className="mr-2 h-3.5 w-3.5" />
                      Upgrade to Unlock
                    </Link>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Smart Pipeline */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-rose-600" />
                  </div>
                  <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">{stats.totalApplications} active</Badge>
                </div>
                <CardTitle className="text-base mt-3">Candidate Pipeline</CardTitle>
                <CardDescription className="text-xs">AI-powered ranking & management</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>Quality score</span>
                  <span className="font-medium text-rose-600">8.4 / 10</span>
                </div>
                <Button asChild size="sm" className="w-full bg-rose-600 hover:bg-rose-700">
                  <Link href="/dashboard/recruiter/candidates">
                    Manage Pipeline
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Talent Pool */}
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Database className="h-5 w-5 text-amber-600" />
                  </div>
                  {!hasFeature("rediscovery") && (
                    <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Pro</Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-3">Talent Pool</CardTitle>
                <CardDescription className="text-xs">Build & manage your talent database</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>Pool size</span>
                  <span className="font-medium text-amber-600">2,847 candidates</span>
                </div>
                <Button asChild size="sm" className="w-full bg-amber-600 hover:bg-amber-700">
                  {hasFeature("rediscovery") ? (
                    <Link href="/dashboard/recruiter/talent-pool">
                      Explore Pool
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <Link href="/billing">
                      <Zap className="mr-2 h-3.5 w-3.5" />
                      Upgrade to Unlock
                    </Link>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tools Row */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">More Tools</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { href: "/dashboard/recruiter/ai-matching", icon: Target, label: "Smart Matching", locked: !hasFeature("rulesEngine"), color: "bg-violet-50 text-violet-700" },
                  { href: "/dashboard/recruiter/ai-interview", icon: Sparkles, label: "AI Interview", locked: false, color: "bg-pink-50 text-pink-700" },
                  { href: "/dashboard/messages", icon: Mail, label: "Messages", locked: false, color: "bg-blue-50 text-blue-700" },
                  { href: "/dashboard/recruiter/email-templates", icon: FileText, label: "Email Templates", locked: false, color: "bg-cyan-50 text-cyan-700" },
                  { href: "/dashboard/recruiter/video-interviews", icon: Video, label: "Video Interviews", locked: false, color: "bg-red-50 text-red-700" },
                  { href: "/dashboard/recruiter/collaboration", icon: Users, label: "Team Collab", locked: false, color: "bg-green-50 text-green-700" },
                ].map(({ href, icon: Icon, label, locked, color }) => (
                  <Link
                    key={href}
                    href={locked ? "/billing" : href}
                    className="flex items-center gap-2 p-3 rounded-xl border hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`h-8 w-8 rounded-lg ${color.split(" ")[0]} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${color.split(" ")[1]}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-tight truncate">{label}</p>
                      {locked && <p className="text-xs text-amber-600">Upgrade</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pipeline activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardPanel
          className="lg:col-span-2"
          title="Hiring momentum"
          description="Key metrics at a glance — funnel health and conversion"
          icon={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <TrendingUp className="h-4 w-4 text-violet-600" />
            </div>
          }
        >
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
              <p className="text-2xl font-bold text-violet-600">
                {stats.totalApplications > 0 ? Math.round((stats.hiredCandidates / stats.totalApplications) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Hire conversion</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.interviewsScheduled}</p>
              <p className="text-xs text-slate-500 mt-1">In interview stage</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{stats.activeJobs}</p>
              <p className="text-xs text-slate-500 mt-1">Open requisitions</p>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Quick pipeline"
          description="Jump to active workflows"
          icon={
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <Zap className="h-4 w-4 text-indigo-600" />
            </div>
          }
        >
          <ActivityFeed
            items={[
              ...(campusStats.pendingReceived > 0 ? [{
                id: "campus-recv",
                title: `${campusStats.pendingReceived} campus invite${campusStats.pendingReceived > 1 ? "s" : ""} pending`,
                description: "Review and accept college proposals",
                href: "/dashboard/recruiter/campus-drives",
                status: "pending" as const,
              }] : []),
              ...(stats.interviewsScheduled > 0 ? [{
                id: "interviews",
                title: `${stats.interviewsScheduled} interview${stats.interviewsScheduled > 1 ? "s" : ""} scheduled`,
                description: "Manage video interview rooms",
                href: "/dashboard/recruiter/video-interviews",
                status: "info" as const,
              }] : []),
              {
                id: "tests",
                title: "Assign coding assessments",
                description: "Send tests to shortlisted candidates",
                href: "/dashboard/recruiter/tests",
                status: "info" as const,
              },
              {
                id: "candidates",
                title: `${stats.totalApplications} applications in pipeline`,
                description: "Review AI-scored candidates",
                href: "/dashboard/recruiter/candidates",
                status: stats.hiredCandidates > 0 ? "success" as const : "info" as const,
              },
            ]}
            emptyMessage="Your pipeline is clear — post a job to get started"
          />
        </DashboardPanel>
      </div>
    </div>
  );
}
