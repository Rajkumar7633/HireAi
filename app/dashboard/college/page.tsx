"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Users, TrendingUp, Building2, GraduationCap, BarChart3,
  ArrowRight, CheckCircle2, Search, Trophy, Loader2,
  UserPlus, ClipboardList, Send, Eye, Code2, Target,
  Award, Briefcase, RefreshCw, Mail, Handshake, Sparkles,
} from "lucide-react"
import { SkillBar } from "@/components/ui/charts"
import { DashboardHero } from "@/components/dashboard/dashboard-hero"
import { InsightStrip } from "@/components/dashboard/insight-strip"
import { DashboardPanel } from "@/components/dashboard/dashboard-panel"
import { ActivityFeed } from "@/components/dashboard/activity-feed"

// ── Types ─────────────────────────────────────────────────────────────────

interface PipelineData {
  pipeline: {
    total: number
    profileComplete: number
    appliedCount: number
    testTakenCount: number
    offerReceived: number
    placed: number
  }
  overview: {
    total: number
    placed: number
    offerReceived: number
    unplaced: number
    placementRate: number
    avgPackage: number
    highestPackage: number
    totalApplications: number
    testsAssigned: number
  }
  byDepartment: { department: string; total: number; placed: number; rate: number }[]
  recentActivity: { studentName: string; action: string; status: string; time: string }[]
  students: StudentRow[]
}

interface StudentRow {
  _id: string
  name: string
  email: string
  department: string
  batch: string
  cgpa: number | null
  skills: string[]
  placementStatus: string
  companyPlacedAt: string
  packageLPA: number | null
  profileScore: number
  skillCount: number
  applicationCount: number
  testsCompleted: number
  testsAssigned: number
  avgTestScore: number
  onboardingCompleted: boolean
  joinedAt: string
}

// ── Pipeline funnel stage ─────────────────────────────────────────────────

function PipelineStage({
  icon, label, count, total, color, sublabel,
}: {
  icon: React.ReactNode
  label: string
  count: number
  total: number
  color: string
  sublabel?: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500 text-blue-700 bg-blue-50 ring-blue-200",
    purple: "bg-purple-500 text-purple-700 bg-purple-50 ring-purple-200",
    yellow: "bg-yellow-500 text-yellow-700 bg-yellow-50 ring-yellow-200",
    orange: "bg-orange-500 text-orange-700 bg-orange-50 ring-orange-200",
    teal: "bg-teal-500 text-teal-700 bg-teal-50 ring-teal-200",
    green: "bg-green-500 text-green-700 bg-green-50 ring-green-200",
  }
  const [bar, text, bg, ring] = colorMap[color].split(" ")

  return (
    <div className={`flex flex-col items-center gap-2 p-4 rounded-xl ${bg} ring-1 ${ring} text-center`}>
      <div className="text-2xl">{icon}</div>
      <p className={`text-3xl font-black ${text}`}>{count}</p>
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
      <div className="w-full mt-1">
        <div className="h-1.5 w-full rounded-full bg-white/60">
          <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{pct}%</p>
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────

function PlacementBadge({ status }: { status: string }) {
  if (status === "placed") return <Badge className="bg-green-100 text-green-800 border border-green-200 text-xs">Placed</Badge>
  if (status === "offer_received") return <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-xs">Offer</Badge>
  return <Badge className="bg-gray-100 text-gray-600 border border-gray-200 text-xs">Unplaced</Badge>
}

// ── Main dashboard ────────────────────────────────────────────────────────

export default function CollegeDashboardPage() {
  const [data, setData] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [collegeName, setCollegeName] = useState("Your College")
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("all")
  const [inviteStats, setInviteStats] = useState({ pending: 0, partnerships: 0, drives: 0 })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [pipelineRes, profileRes, invitesRes, drivesRes] = await Promise.all([
        fetch("/api/college/pipeline-stats"),
        fetch("/api/college/profile"),
        fetch("/api/college/campus-drive-invites"),
        fetch("/api/college/campus-drives"),
      ])
      if (pipelineRes.ok) setData(await pipelineRes.json())
      if (profileRes.ok) {
        const p = await profileRes.json()
        setCollegeName(p.profile?.collegeName || p.name || "Your College")
      }
      if (invitesRes.ok) {
        const inv = await invitesRes.json()
        const pending = (inv.receivedInvites || inv.invites || []).filter((i: any) => i.status === "pending").length
        setInviteStats((s) => ({ ...s, pending }))
      }
      if (drivesRes.ok) {
        const drives = await drivesRes.json()
        const arr = Array.isArray(drives) ? drives : drives.drives || []
        setInviteStats((s) => ({ ...s, drives: arr.length }))
      }
    } catch { /**/ } finally {
      setLoading(false)
    }
  }

  const filteredStudents = (data?.students || []).filter((s) => {
    const q = search.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.department.toLowerCase().includes(q)
    const matchDept = deptFilter === "all" || s.department === deptFilter
    return matchSearch && matchDept
  })

  const depts = Array.from(new Set((data?.students || []).map((s) => s.department).filter(Boolean))) as string[]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Loading dashboard…</p>
      </div>
    )
  }

  const ov = data?.overview
  const pipeline = data?.pipeline

  return (
    <div className="dashboard-page w-full">
      <DashboardHero
        title={collegeName}
        subtitle="Placement cell command center — students, drives, partnerships & analytics"
        badge="Placement Cell"
        gradient="purple"
        avatar={
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold ring-2 ring-white/30">
            {collegeName.charAt(0).toUpperCase()}
          </div>
        }
        meta={
          <>
            <span>{ov?.total ?? 0} students onboarded</span>
            <span>· {ov?.placementRate ?? 0}% placement rate</span>
            <span>· ₹{ov?.avgPackage ?? 0}L avg package</span>
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchAll} className="bg-white/10 border-white/30 text-white hover:bg-white/20 gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button className="bg-white text-purple-700 hover:bg-white/90 font-semibold gap-2" size="sm" asChild>
              <Link href="/dashboard/college/students"><UserPlus className="h-3.5 w-3.5" /> Onboard Student</Link>
            </Button>
          </>
        }
      />

      <InsightStrip
        items={[
          { label: "Placed", value: ov?.placed ?? 0, hint: `${ov?.placementRate ?? 0}% rate`, href: "/dashboard/college/placements", icon: CheckCircle2, color: "bg-green-100 text-green-600" },
          { label: "Campus Drives", value: inviteStats.drives, hint: "Live & upcoming", href: "/dashboard/college/campus-drives", icon: Building2, color: "bg-orange-100 text-orange-600" },
          { label: "Invitations", value: inviteStats.pending, hint: "Pending proposals", href: "/dashboard/college/partnerships", icon: Handshake, color: "bg-indigo-100 text-indigo-600" },
          { label: "Applications", value: ov?.totalApplications ?? 0, hint: "Student applications", href: "/dashboard/college/placement-analytics", icon: BarChart3, color: "bg-blue-100 text-blue-600" },
        ]}
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        {[
          { label: "Total Students", value: ov?.total ?? 0,           color: "from-blue-500 to-blue-600",     sub: "Registered",    ringColor: "#3b82f6", pct: 100 },
          { label: "Placed",         value: ov?.placed ?? 0,           color: "from-green-500 to-green-600",   sub: "Confirmed",     ringColor: "#10b981", pct: ov?.placementRate ?? 0 },
          { label: "Offers",         value: ov?.offerReceived ?? 0,    color: "from-teal-500 to-teal-600",     sub: "Pending joins", ringColor: "#14b8a6", pct: ov?.total ? Math.round(((ov.offerReceived??0)/ov.total)*100) : 0 },
          { label: "Placement %",    value: `${ov?.placementRate ?? 0}%`, color: "from-purple-500 to-purple-600", sub: "Overall rate", ringColor: "#8b5cf6", pct: ov?.placementRate ?? 0 },
          { label: "Avg Package",    value: `₹${ov?.avgPackage ?? 0}L`, color: "from-orange-500 to-orange-600", sub: "LPA",         ringColor: "#f97316", pct: 65 },
          { label: "Highest",        value: `₹${ov?.highestPackage ?? 0}L`, color: "from-yellow-500 to-yellow-600", sub: "Package",  ringColor: "#eab308", pct: 80 },
          { label: "Applications",   value: ov?.totalApplications ?? 0, color: "from-indigo-500 to-indigo-600", sub: "Total applied", ringColor: "#6366f1", pct: 70 },
        ].map((kpi) => (
          <Card key={kpi.label} className={`bg-gradient-to-br ${kpi.color} text-white border-0 shadow overflow-hidden`}>
            <CardContent className="pt-3 pb-3 px-4 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-black leading-none">{kpi.value}</p>
                <p className="text-xs opacity-80 mt-0.5">{kpi.sub}</p>
                <p className="text-xs font-medium mt-1">{kpi.label}</p>
              </div>
              <div className="shrink-0 opacity-90">
                <svg width="36" height="36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="white" strokeWidth="4"
                    strokeDasharray={`${(kpi.pct / 100) * 87.96} 87.96`}
                    strokeLinecap="round" transform="rotate(-90 18 18)"
                  />
                </svg>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Pipeline funnel — 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" /> Student Placement Pipeline
              </CardTitle>
              <CardDescription>Track every student from onboarding to placement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
                <PipelineStage icon={<Users className="h-6 w-6 text-blue-500" />} label="Onboarded" count={pipeline?.total ?? 0} total={pipeline?.total ?? 1} color="blue" sublabel="Total students" />
                <PipelineStage icon={<GraduationCap className="h-6 w-6 text-purple-500" />} label="Profile Done" count={pipeline?.profileComplete ?? 0} total={pipeline?.total ?? 1} color="purple" sublabel="Updated profile" />
                <PipelineStage icon={<Briefcase className="h-6 w-6 text-yellow-500" />} label="Applied" count={pipeline?.appliedCount ?? 0} total={pipeline?.total ?? 1} color="yellow" sublabel="Applied to jobs" />
                <PipelineStage icon={<Code2 className="h-6 w-6 text-orange-500" />} label="Test Given" count={pipeline?.testTakenCount ?? 0} total={pipeline?.total ?? 1} color="orange" sublabel="Completed tests" />
                <PipelineStage icon={<Award className="h-6 w-6 text-teal-500" />} label="Offer" count={pipeline?.offerReceived ?? 0} total={pipeline?.total ?? 1} color="teal" sublabel="Received offers" />
                <PipelineStage icon={<CheckCircle2 className="h-6 w-6 text-green-500" />} label="Placed" count={pipeline?.placed ?? 0} total={pipeline?.total ?? 1} color="green" sublabel="Confirmed jobs" />
              </div>
            </CardContent>
          </Card>

          {/* Department breakdown */}
          {(data?.byDepartment || []).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" /> Department-wise Placement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.byDepartment || []).slice(0, 6).map((dept) => (
                  <div key={dept.department} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-24 shrink-0 truncate">{dept.department}</span>
                    <div className="flex-1">
                      <SkillBar
                        label={`${dept.placed}/${dept.total}`}
                        value={dept.rate}
                        color={dept.rate >= 80 ? "#10b981" : dept.rate >= 60 ? "#f59e0b" : "#ef4444"}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — quick actions + recent activity */}
        <div className="space-y-4">
          {/* Quick actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { href: "/dashboard/college/students", icon: UserPlus, label: "Onboard Students", color: "bg-blue-100 text-blue-600" },
                { href: "/dashboard/college/assign-tests", icon: Send, label: "Assign Tests", color: "bg-purple-100 text-purple-600" },
                { href: "/dashboard/college/leaderboard", icon: Trophy, label: "Student Leaderboard", color: "bg-yellow-100 text-yellow-600" },
                { href: "/dashboard/college/campus-drives", icon: Building2, label: "Campus Drives", color: "bg-orange-100 text-orange-600" },
                { href: "/dashboard/college/reports", icon: BarChart3, label: "Placement Reports", color: "bg-green-100 text-green-600" },
                { href: "/dashboard/college/partnerships", icon: Briefcase, label: "Invite Recruiters", color: "bg-indigo-100 text-indigo-600" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className={`w-8 h-8 rounded-lg ${a.color} flex items-center justify-center shrink-0`}>
                    <a.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium flex-1">{a.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <DashboardPanel
            title="Recent Activity"
            description="Latest student placement events"
            icon={
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <Sparkles className="h-4 w-4 text-purple-600" />
              </div>
            }
            noPadding
          >
            <div className="px-5 pb-4">
              {(data?.recentActivity || []).length === 0 ? (
                <ActivityFeed items={[]} emptyMessage="No recent activity." />
              ) : (
                <ActivityFeed
                  items={(data?.recentActivity || []).slice(0, 6).map((act, i) => ({
                    id: String(i),
                    title: act.studentName,
                    description: act.action,
                    time: act.time,
                    status: act.status === "placed" ? "success" as const : act.status === "offer_received" ? "info" as const : "pending" as const,
                  }))}
                />
              )}
            </div>
          </DashboardPanel>
        </div>
      </div>

      {/* Student table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                All Students ({filteredStudents.length})
              </CardTitle>
              <CardDescription>Click "View" to see full stats, resume, test scores, applications</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search students…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm w-48"
                />
              </div>
              {depts.length > 0 && (
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="h-8 text-sm border rounded-md px-2 bg-background"
                >
                  <option value="all">All Depts</option>
                  {depts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredStudents.length === 0 ? (
            <div className="py-14 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground text-sm">
                {(data?.students || []).length === 0
                  ? "No students onboarded yet."
                  : "No students match your search."}
              </p>
              {(data?.students || []).length === 0 && (
                <Button className="mt-3 bg-purple-600 hover:bg-purple-700" asChild>
                  <Link href="/dashboard/college/students"><UserPlus className="h-4 w-4 mr-2" /> Onboard First Student</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-5 py-3 font-semibold text-muted-foreground text-xs">Student</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground text-xs">Dept / Batch</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs">CGPA</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs">Skills</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs">Apps</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs">Tests</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs">Status</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground text-xs">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((s) => (
                    <tr key={s._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[140px]">{s.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[140px]">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-xs">{s.department || "—"}</p>
                        <p className="text-xs text-muted-foreground">{s.batch ? `Batch ${s.batch}` : "—"}</p>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold text-sm ${s.cgpa != null && s.cgpa >= 8 ? "text-green-600" : s.cgpa != null && s.cgpa >= 6 ? "text-yellow-600" : "text-muted-foreground"}`}>
                          {s.cgpa != null ? s.cgpa.toFixed(1) : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-sm">{s.skillCount}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-sm">{s.applicationCount}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-sm">
                          {s.testsCompleted}/{s.testsAssigned}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <PlacementBadge status={s.placementStatus} />
                        {s.companyPlacedAt && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[80px]">{s.companyPlacedAt}</p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:border-purple-300" asChild>
                          <Link href={`/dashboard/college/students/${s._id}`}>
                            <Eye className="h-3 w-3" /> View
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
