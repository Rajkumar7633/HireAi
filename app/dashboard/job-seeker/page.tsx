"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useSession } from "@/hooks/use-session"
import { useNotifications } from "@/hooks/use-notifications"
import { Button } from "@/components/ui/button"
import { SkillBar } from "@/components/ui/charts"
import { Badge } from "@/components/ui/badge"
import {
  Upload, FileText, Briefcase, MessageSquare, Bot, ListChecks, Target,
  TrendingUp, Clock, Brain, Calendar, Bell, User, Settings, Sparkles,
  AlertCircle, ChevronRight, Star, BookOpen, BarChart2, ArrowRight,
  CheckCircle2, Circle, Search, GraduationCap, Mic, Zap, Award,
} from "lucide-react"
import { DonutChart, MiniBarChart, TrendLine, PipelineStages } from "@/components/ui/charts"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { InsightStrip } from "@/components/dashboard/insight-strip"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { ActivityFeed } from "@/components/dashboard/activity-feed"

interface Application {
  _id: string
  jobId?: { title?: string; companyId?: { name?: string } }
  status: string
  createdAt: string
  updatedAt: string
}
interface ProfileData {
  profileCompleteness: number
  lastUpdated?: string
  experiences?: unknown[]
  projects?: unknown[]
  skills?: string[]
  education?: unknown[]
  profileImage?: string
  bio?: string
  currentTitle?: string
  phone?: string
  linkedin?: string
}

function ProfileRing({ score }: { score: number }) {
  const r = 48, circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444"
  return (
    <svg width="120" height="120">
      <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="9" />
      <circle
        cx="60" cy="60" r={r} fill="none"
        stroke={color} strokeWidth="9"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
    </svg>
  )
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  "Pending":             { label: "Pending",   color: "text-amber-700",   bg: "bg-amber-50 ring-amber-200",   dot: "bg-amber-400" },
  "Reviewed":            { label: "Reviewed",  color: "text-blue-700",    bg: "bg-blue-50 ring-blue-200",     dot: "bg-blue-400" },
  "Test Assigned":       { label: "Test",      color: "text-purple-700",  bg: "bg-purple-50 ring-purple-200", dot: "bg-purple-400" },
  "Assessment Assigned": { label: "Test",      color: "text-purple-700",  bg: "bg-purple-50 ring-purple-200", dot: "bg-purple-400" },
  "Interview Scheduled": { label: "Interview", color: "text-emerald-700", bg: "bg-emerald-50 ring-emerald-200", dot: "bg-emerald-400" },
  "Hired":               { label: "Hired ✓",   color: "text-teal-700",    bg: "bg-teal-50 ring-teal-200",     dot: "bg-teal-400" },
  "Rejected":            { label: "Rejected",  color: "text-red-700",     bg: "bg-red-50 ring-red-200",       dot: "bg-red-400" },
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const AVATAR_COLORS = [
  ["bg-violet-100 text-violet-700"], ["bg-blue-100 text-blue-700"],
  ["bg-emerald-100 text-emerald-700"], ["bg-orange-100 text-orange-700"],
  ["bg-rose-100 text-rose-700"], ["bg-indigo-100 text-indigo-700"],
]
function CompanyAvatar({ name }: { name: string }) {
  const [cls] = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]
  return (
    <div className={`w-9 h-9 rounded-xl ${cls} flex items-center justify-center font-bold text-sm shrink-0`}>
      {name.charAt(0).toUpperCase() || "?"}
    </div>
  )
}

export default function JobSeekerDashboard() {
  const { session } = useSession()
  const { notifications } = useNotifications()
  const [profile, setProfile] = useState<ProfileData>({ profileCompleteness: 0 })
  const [applications, setApplications] = useState<Application[]>([])
  const [testCount, setTestCount] = useState(0)
  const [assessmentCount, setAssessmentCount] = useState(0)

  const fetchData = useCallback(async () => {
    const [pRes, aRes, tRes, assessRes] = await Promise.allSettled([
      fetch("/api/job-seeker/profile", { cache: "no-store" }),
      fetch("/api/applications/my-applications", { cache: "no-store" }),
      fetch("/api/job-seeker/tests", { cache: "no-store" }),
      fetch("/api/assessments/my-assessments", { cache: "no-store" }),
    ])
    if (pRes.status === "fulfilled" && pRes.value.ok) setProfile(await pRes.value.json())
    if (aRes.status === "fulfilled" && aRes.value.ok) {
      const d = await aRes.value.json()
      const arr = Array.isArray(d) ? d : Array.isArray(d?.applications) ? d.applications : []
      setApplications(arr.slice(0, 6))
    }
    if (tRes.status === "fulfilled" && tRes.value.ok) {
      const d = await tRes.value.json()
      const arr = Array.isArray(d) ? d : Array.isArray(d?.tests) ? d.tests : []
      setTestCount(arr.filter((t: any) => t.status !== "completed").length || arr.length)
    }
    if (assessRes.status === "fulfilled" && assessRes.value.ok) {
      const d = await assessRes.value.json()
      const arr = Array.isArray(d) ? d : Array.isArray(d?.assessments) ? d.assessments : []
      setAssessmentCount(arr.filter((a: any) => a.status !== "completed").length || arr.length)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const h = () => fetchData()
    window.addEventListener("profileUpdated", h)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") fetchData()
    })
    return () => window.removeEventListener("profileUpdated", h)
  }, [fetchData])

  const alerts = notifications.filter(n => n.type === "assessment_assigned" && !n.read)

  const appStats = useMemo(() => ({
    total: applications.length,
    active: applications.filter(a => !["Hired", "Rejected"].includes(a.status)).length,
    interviews: applications.filter(a => a.status === "Interview Scheduled").length,
    pending: applications.filter(a => a.status === "Pending").length,
    hired: applications.filter(a => a.status === "Hired").length,
    rejected: applications.filter(a => a.status === "Rejected").length,
  }), [applications])

  const checks = [
    { label: "Profile photo",   done: !!profile.profileImage },
    { label: "Work experience", done: (profile.experiences?.length ?? 0) > 0 },
    { label: "Skills",          done: (profile.skills?.length ?? 0) > 0 },
    { label: "Education",       done: (profile.education?.length ?? 0) > 0 },
    { label: "Bio / summary",   done: !!profile.bio },
    { label: "Phone number",    done: !!profile.phone },
    { label: "LinkedIn URL",    done: !!profile.linkedin },
    { label: "Projects",        done: (profile.projects?.length ?? 0) > 0 },
  ]
  const doneCount = checks.filter(c => c.done).length
  const score = profile.profileCompleteness ?? 0
  const scoreColor = score >= 80 ? "text-emerald-600" : score >= 60 ? "text-amber-500" : "text-red-500"
  const scoreLabel = score >= 80 ? "Strong" : score >= 60 ? "Good" : "Incomplete"
  const isPremium = (session as any)?.subscription?.status === "active"

  return (
    <div className="dashboard-page min-h-full">

      <DashboardHero
        title={session?.name || "Job Seeker"}
        subtitle={`${greeting()} — track applications, assessments, and AI career tools in one place`}
        badge={isPremium ? "Plus Plan" : "Free Plan"}
        badgeVariant={isPremium ? "pro" : "outline"}
        gradient="indigo"
        meta={
          <>
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
            {profile.currentTitle && <span>· {profile.currentTitle}</span>}
            <span>· Profile {score}%</span>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
              <Link href="/dashboard/job-seeker/profile"><User className="h-3.5 w-3.5 mr-1.5" /> Profile</Link>
            </Button>
            <Button asChild size="sm" className="bg-white text-indigo-700 hover:bg-white/90 font-semibold">
              <Link href="/dashboard/job-seeker/matches"><Target className="h-3.5 w-3.5 mr-1.5" /> AI Matches</Link>
            </Button>
          </>
        }
      />

      <InsightStrip
        items={[
          { label: "Applications", value: appStats.total, hint: `${appStats.active} active`, href: "/dashboard/job-seeker/applications", icon: FileText, color: "bg-violet-100 text-violet-600" },
          { label: "Interviews", value: appStats.interviews, hint: "Scheduled", href: "/dashboard/job-seeker/interviews", icon: Calendar, color: "bg-emerald-100 text-emerald-600" },
          { label: "Tests", value: testCount, hint: "Pending / assigned", href: "/dashboard/job-seeker/tests", icon: ListChecks, color: "bg-orange-100 text-orange-600" },
          { label: "Assessments", value: assessmentCount, hint: "Skill evaluations", href: "/dashboard/job-seeker/assessments", icon: Brain, color: "bg-blue-100 text-blue-600" },
        ]}
      />

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/dashboard/job-seeker/applications">
          <div className="group bg-white rounded-2xl border border-slate-200 hover:border-violet-200 hover:shadow-md transition-all p-4 cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Applications</p>
                <p className="text-3xl font-bold text-slate-900 mt-1 leading-none">{appStats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">{appStats.active} active</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <FileText className="h-4.5 w-4.5 text-violet-600" />
              </div>
            </div>
            <MiniBarChart values={[appStats.rejected, appStats.pending, appStats.active, appStats.interviews, appStats.hired]} color="#8b5cf6" width={80} height={28} />
          </div>
        </Link>

        <Link href="/dashboard/job-seeker/status-portal">
          <div className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all p-4 cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Interviews</p>
                <p className="text-3xl font-bold text-slate-900 mt-1 leading-none">{appStats.interviews}</p>
                <p className="text-xs text-muted-foreground mt-1">scheduled</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Calendar className="h-4.5 w-4.5 text-emerald-600" />
              </div>
            </div>
            <TrendLine values={[0,0,1,appStats.interviews]} color="#10b981" width={80} height={28} />
          </div>
        </Link>

        <Link href="/dashboard/job-seeker/matches">
          <div className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-md transition-all p-4 cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium">AI Matches</p>
                <p className="text-3xl font-bold text-slate-900 mt-1 leading-none">47</p>
                <p className="text-xs text-muted-foreground mt-1">available now</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Target className="h-4.5 w-4.5 text-blue-600" />
              </div>
            </div>
            <TrendLine values={[12,20,31,40,47]} color="#3b82f6" width={80} height={28} />
          </div>
        </Link>

        <Link href="/dashboard/job-seeker/profile">
          <div className="group bg-white rounded-2xl border border-slate-200 hover:border-orange-200 hover:shadow-md transition-all p-4 cursor-pointer">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Profile Score</p>
                <p className="text-3xl font-bold text-slate-900 mt-1 leading-none">{score}%</p>
                <p className="text-xs text-muted-foreground mt-1">{scoreLabel}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4.5 w-4.5 text-orange-600" />
              </div>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444" }} />
            </div>
          </div>
        </Link>
      </div>

      {/* ── Application Status Visual ── */}
      {appStats.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-sm">Application Overview</p>
              <p className="text-xs text-muted-foreground mt-0.5">Status distribution across all applications</p>
            </div>
            <Button asChild size="sm" variant="outline" className="text-xs h-7">
              <Link href="/dashboard/job-seeker/applications">View all <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <DonutChart
              size={100}
              innerLabel={String(appStats.total)}
              innerSub="total"
              slices={[
                ...(appStats.pending   > 0 ? [{ label: "Pending",   value: appStats.pending,   color: "#f59e0b" }] : []),
                ...(appStats.active    > 0 ? [{ label: "In Review", value: appStats.active - appStats.interviews, color: "#3b82f6" }] : []),
                ...(appStats.interviews > 0 ? [{ label: "Interview", value: appStats.interviews, color: "#10b981" }] : []),
                ...(appStats.hired     > 0 ? [{ label: "Hired",     value: appStats.hired,     color: "#06b6d4" }] : []),
                ...(appStats.rejected  > 0 ? [{ label: "Rejected",  value: appStats.rejected,  color: "#f87171" }] : []),
              ].filter(s => s.value > 0)}
            />
            <div className="flex-1 min-w-0">
              <PipelineStages
                stages={[
                  { label: "Applied",    count: appStats.total },
                  { label: "Review",     count: Math.max(0, appStats.active - appStats.interviews) },
                  { label: "Interview",  count: appStats.interviews },
                  { label: "Hired",      count: appStats.hired },
                ]}
                activeIndex={appStats.interviews > 0 ? 2 : appStats.active > 0 ? 1 : appStats.hired > 0 ? 3 : 0}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">{alerts.length} New Assessment{alerts.length > 1 ? "s" : ""} Assigned</p>
              <p className="text-xs text-muted-foreground">Complete them to advance your applications</p>
            </div>
          </div>
          <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-0 shrink-0">
            <Link href="/dashboard/job-seeker/assessments">
              <ListChecks className="h-3.5 w-3.5 mr-1.5" /> Take Now
            </Link>
          </Button>
        </div>
      )}

      {score < 80 && (
        <div className="bg-white border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-sm">Profile is {score}% complete</p>
              <p className="text-xs text-muted-foreground">A complete profile gets 4× more recruiter views</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-28"><SkillBar label="" value={score} color={score >= 70 ? "#16a34a" : score >= 40 ? "#f59e0b" : "#ef4444"} /></div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/job-seeker/profile-setup">
                <Settings className="h-3 w-3 mr-1" /> Complete
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* LEFT SIDEBAR — 4 cols */}
        <div className="lg:col-span-4 space-y-4">

          {/* Profile Strength */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-violet-500 via-blue-400 to-emerald-400" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-sm">Profile Strength</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Attract more opportunities</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
                  {scoreLabel}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <ProfileRing score={score} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-xl font-bold ${scoreColor}`}>{score}%</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Score</span>
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  {checks.map(({ label, done }) => (
                    <div key={label} className="flex items-center gap-2">
                      {done
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        : <Circle className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                      <span className={`text-xs ${done ? "text-slate-700" : "text-slate-400"}`}>{label}</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground pt-0.5">{doneCount}/{checks.length} complete</p>
                </div>
              </div>
              <Button asChild size="sm" className="w-full mt-4 bg-violet-600 hover:bg-violet-700 text-white border-0">
                <Link href="/dashboard/job-seeker/profile">
                  <User className="h-3.5 w-3.5 mr-1.5" /> Edit Profile
                </Link>
              </Button>
            </div>
          </div>

          {/* AI Career Tools */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center">
                <Brain className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <p className="font-semibold text-sm">AI Career Tools</p>
            </div>
            <div className="p-3 space-y-0.5">
              {([
                { icon: Bot,           label: "Resume Coach",       desc: "AI-powered optimization",    href: "/dashboard/job-seeker/resume-chatbot",  iconBg: "bg-blue-100",    iconColor: "text-blue-600" },
                { icon: Mic,           label: "Mock Interview",     desc: "Practice with AI feedback",  href: "/dashboard/job-seeker/mock-interview",  iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
                { icon: BarChart2,     label: "Skill Gap Analysis", desc: "Find what's missing",        href: "/dashboard/job-seeker/skill-gap",       iconBg: "bg-purple-100",  iconColor: "text-purple-600" },
                { icon: GraduationCap, label: "Interview Coach",    desc: "Q&A bank & tips",            href: "/dashboard/job-seeker/interview-coach", iconBg: "bg-orange-100",  iconColor: "text-orange-600" },
              ] as const).map(({ icon: Icon, label, desc, href, iconBg, iconColor }) => (
                <Link key={label} href={href}>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none">{label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-yellow-600" />
              </div>
              <p className="font-semibold text-sm">Quick Links</p>
            </div>
            <div className="p-3 space-y-0.5">
              {([
                { label: "Upload Resume",   href: "/dashboard/job-seeker/upload",        icon: Upload },
                { label: "My Applications", href: "/dashboard/job-seeker/applications",  icon: ListChecks },
                { label: "Status Portal",   href: "/dashboard/job-seeker/status-portal", icon: Clock },
                { label: "Messages",        href: "/dashboard/messages",                 icon: MessageSquare },
                { label: "Notifications",   href: "/dashboard/notifications",            icon: Bell },
                { label: "My College",      href: "/dashboard/job-seeker/my-college",    icon: BookOpen },
                { label: "Manage Billing",  href: "/billing",                            icon: Star },
              ] as const).map(({ label, href, icon: Icon }) => (
                <Link key={label} href={href}>
                  <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors flex-1">{label}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT MAIN — 8 cols */}
        <div className="lg:col-span-8 space-y-4">

          {/* Recent Applications */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">Recent Applications</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your latest job applications and current status</p>
              </div>
              <Button asChild size="sm" variant="outline" className="text-xs h-7">
                <Link href="/dashboard/job-seeker/applications">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-14 px-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No applications yet</p>
                <p className="text-xs text-muted-foreground mt-1">Find your next opportunity and start applying today</p>
                <Button asChild size="sm" className="mt-4 bg-violet-600 hover:bg-violet-700 text-white border-0">
                  <Link href="/dashboard/jobs">
                    <Search className="h-3.5 w-3.5 mr-1.5" /> Browse Jobs
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {applications.map((app) => {
                  const title   = app.jobId?.title ?? "Job Position"
                  const company = app.jobId?.companyId?.name ?? "Company"
                  const sc = STATUS_CFG[app.status] ?? { label: app.status, color: "text-slate-600", bg: "bg-slate-100 ring-slate-200", dot: "bg-slate-400" }
                  return (
                    <div key={app._id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer group">
                      <CompanyAvatar name={company} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate group-hover:text-violet-700 transition-colors">{title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{company}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1 shrink-0 ${sc.bg} ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                        {sc.label}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 w-14 text-right">
                        {timeAgo(app.updatedAt || app.createdAt)}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Feature Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              { title: "Browse Jobs",     desc: "Search thousands of roles",   icon: Search,        bg: "bg-violet-50   border-violet-100", iconBg: "bg-violet-100",  iconColor: "text-violet-600", href: "/dashboard/jobs" },
              { title: "Smart Matches",   desc: "AI-curated for your profile", icon: Target,        bg: "bg-emerald-50  border-emerald-100", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", href: "/dashboard/job-seeker/matches" },
              { title: "Track Status",    desc: "Real-time pipeline view",     icon: Clock,         bg: "bg-blue-50     border-blue-100",    iconBg: "bg-blue-100",    iconColor: "text-blue-600", href: "/dashboard/job-seeker/status-portal" },
              { title: "Assessments",     desc: "Complete skill evaluations",  icon: ListChecks,    bg: "bg-orange-50   border-orange-100",  iconBg: "bg-orange-100",  iconColor: "text-orange-600", href: "/dashboard/job-seeker/assessments" },
              { title: "Resume Builder",  desc: "AI-powered resume tools",     icon: FileText,      bg: "bg-rose-50     border-rose-100",    iconBg: "bg-rose-100",    iconColor: "text-rose-600", href: "/dashboard/job-seeker/resume-builder" },
              { title: "Social Network",  desc: "Connect with professionals",  icon: MessageSquare, bg: "bg-indigo-50   border-indigo-100",  iconBg: "bg-indigo-100",  iconColor: "text-indigo-600", href: "/dashboard/job-seeker/social/feed" },
            ] as const).map(({ title, desc, icon: Icon, bg, iconBg, iconColor, href }) => (
              <Link key={title} href={href}>
                <div className={`group rounded-2xl border ${bg} p-4 h-full cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5`}>
                  <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <p className="font-semibold text-sm text-slate-800">{title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Experience & Projects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Briefcase className="h-3.5 w-3.5 text-teal-600" />
                  </div>
                  <p className="font-semibold text-sm">Experience</p>
                </div>
                <Link href="/dashboard/job-seeker/profile?edit=experience"
                  className="text-xs text-muted-foreground hover:text-violet-600 transition-colors">Edit</Link>
              </div>
              <div className="p-4 space-y-2">
                {(profile.experiences ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No experience added yet.</p>
                ) : (
                  (profile.experiences as any[]).slice(0, 2).map((e: any, i: number) => (
                    <div key={i} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-xs font-semibold truncate">{e.role}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {e.company} · {e.startDate}–{e.current ? "Present" : (e.endDate || "")}
                      </p>
                    </div>
                  ))
                )}
                <Link href="/dashboard/job-seeker/profile">
                  <p className="text-xs text-muted-foreground hover:text-violet-600 transition-colors flex items-center gap-1 pt-1 cursor-pointer">
                    View full profile <ChevronRight className="h-3 w-3" />
                  </p>
                </Link>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Award className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <p className="font-semibold text-sm">Projects</p>
                </div>
                <Link href="/dashboard/job-seeker/profile?edit=projects"
                  className="text-xs text-muted-foreground hover:text-violet-600 transition-colors">Edit</Link>
              </div>
              <div className="p-4 space-y-2">
                {(profile.projects ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No projects added yet.</p>
                ) : (
                  (profile.projects as any[]).slice(0, 2).map((p: any, i: number) => (
                    <div key={i} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-xs font-semibold truncate">{p.title}</p>
                      {p.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.tags.slice(0, 4).map((t: string, j: number) => (
                            <span key={j} className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-md">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <Link href="/dashboard/job-seeker/profile">
                  <p className="text-xs text-muted-foreground hover:text-violet-600 transition-colors flex items-center gap-1 pt-1 cursor-pointer">
                    View full profile <ChevronRight className="h-3 w-3" />
                  </p>
                </Link>
              </div>
            </div>
          </div>

          {/* Career momentum */}
          <DashboardPanel
            title="Career momentum"
            description="Recommended next steps based on your profile"
            icon={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                <Sparkles className="h-4 w-4 text-violet-600" />
              </div>
            }
          >
            <ActivityFeed
              items={[
                ...(score < 80 ? [{
                  id: "profile",
                  title: `Complete profile (${score}%)`,
                  description: "Profiles above 80% get 4× more views",
                  href: "/dashboard/job-seeker/profile-setup",
                  status: "warning" as const,
                }] : []),
                ...(alerts.length > 0 ? [{
                  id: "assess",
                  title: `${alerts.length} new assessment${alerts.length > 1 ? "s" : ""}`,
                  description: "Complete to advance applications",
                  href: "/dashboard/job-seeker/assessments",
                  status: "pending" as const,
                }] : []),
                {
                  id: "skill-gap",
                  title: "Run skill gap analysis",
                  description: "Identify gaps for your target role",
                  href: "/dashboard/job-seeker/skill-gap",
                  status: "info" as const,
                },
                {
                  id: "campus",
                  title: "Browse campus drives",
                  description: "Apply to on-campus opportunities",
                  href: "/dashboard/job-seeker/campus-drives",
                  status: "info" as const,
                },
              ]}
            />
          </DashboardPanel>

        </div>
      </div>
    </div>
  )
}
