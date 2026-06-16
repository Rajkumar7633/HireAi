"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, GraduationCap, Mail, Phone, Globe, ExternalLink,
  CheckCircle2, Clock, Code2, ArrowRight, Trophy, RefreshCw,
  Building2, Calendar, MessageSquare, FileText, Target, Bell,
  Briefcase, Users, Sparkles, MapPin, Send, Video, Award,
  ClipboardList, TrendingUp, AlertCircle,
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

interface CollegeInfo {
  _id: string
  name: string
  location: string
  website: string
  email: string
  phone: string
  logo: string | null
}

interface StudentInfo {
  department: string
  batch: string
  currentYear: number | null
  semester: number | null
  cgpa: number | null
  placementStatus: string
  companyPlacedAt: string
  packageLPA: number | null
  skills: string[]
  backlogs: number
}

interface CollegeTest {
  assignmentId: string
  testId: string
  testTitle: string
  assignedAt: string
  dueDate: string | null
  status: string
  score: number | null
  completedAt: string | null
}

interface DrivePreview {
  _id: string
  companyName: string
  role: string
  driveDate: string
  packageMin?: number
  packageMax?: number
  canApply: boolean
  applied: boolean
  applicationStatus: string | null
  deadlinePassed: boolean
}

interface MeetingPreview {
  _id: string
  title: string
  meetingType: string
  startTime: string
  venue?: string
  meetingLink?: string
}

interface Pipeline {
  stage: string
  readiness: number
  testsTotal: number
  testsCompleted: number
  testsPending: number
  drivesOpen: number
  drivesApplied: number
  upcomingMeetings: number
}

interface NotifItem {
  _id: string
  type: string
  message: string
  read: boolean
  createdAt: string
}

const QUICK_ACTIONS = [
  { label: "Campus Drives", href: "/dashboard/job-seeker/campus-drives", icon: Building2, color: "from-blue-500 to-cyan-500" },
  { label: "All Tests", href: "/dashboard/job-seeker/tests", icon: Code2, color: "from-purple-500 to-violet-500" },
  { label: "Status Portal", href: "/dashboard/job-seeker/status-portal", icon: ClipboardList, color: "from-emerald-500 to-teal-500" },
  { label: "Contact College", href: "/dashboard/job-seeker/contact-college", icon: MessageSquare, color: "from-orange-500 to-amber-500" },
  { label: "Meetings", href: "/dashboard/job-seeker/interviews", icon: Video, color: "from-pink-500 to-rose-500" },
  { label: "Offer Letters", href: "/dashboard/job-seeker/offer-letters", icon: FileText, color: "from-indigo-500 to-blue-500" },
  { label: "Resume", href: "/dashboard/job-seeker/resume-builder", icon: Award, color: "from-violet-500 to-purple-500" },
  { label: "Skill Gap", href: "/dashboard/job-seeker/skill-gap", icon: Target, color: "from-green-500 to-lime-500" },
]

const PIPELINE_STEPS = [
  { id: "registered", label: "Registered", icon: Users },
  { id: "assessed", label: "Tests Done", icon: Code2 },
  { id: "applying", label: "Applied", icon: Briefcase },
  { id: "offer", label: "Offer", icon: Trophy },
  { id: "placed", label: "Placed", icon: CheckCircle2 },
]

function stageIndex(stage: string) {
  const i = PIPELINE_STEPS.findIndex((s) => s.id === stage)
  return i >= 0 ? i : 0
}

export default function MyCollegePage() {
  const [college, setCollege] = useState<CollegeInfo | null>(null)
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [tests, setTests] = useState<CollegeTest[]>([])
  const [drives, setDrives] = useState<DrivePreview[]>([])
  const [meetings, setMeetings] = useState<MeetingPreview[]>([])
  const [notifications, setNotifications] = useState<NotifItem[]>([])
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [testTab, setTestTab] = useState("pending")
  const { toast } = useToast()

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch("/api/college/my-college", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setCollege(data.college)
        setStudentInfo(data.studentInfo)
        setTests(data.tests || [])
        setDrives(data.drives || [])
        setMeetings(data.meetings || [])
        setNotifications(data.notifications || [])
        setPipeline(data.pipeline || null)
      }
    } catch {
      toast({ title: "Error", description: "Failed to load college hub.", variant: "destructive" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const applyToDrive = async (driveId: string) => {
    try {
      const res = await fetch(`/api/job-seeker/campus-drives/${driveId}/apply`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: "Applied!", description: "Your application was submitted to placement cell." })
        fetchData(true)
      } else {
        toast({ title: "Could not apply", description: data.error || "Try again", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <p className="text-muted-foreground text-sm">Loading your college hub…</p>
      </div>
    )
  }

  if (!college) {
    return (
      <div className="p-6 w-full max-w-lg mx-auto">
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-xl font-semibold mb-2">No College Linked</h3>
            <p className="text-muted-foreground text-sm">
              You are not onboarded through a college placement cell. Ask your placement officer for the registration link.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingTests = tests.filter((t) => t.status !== "completed")
  const completedTests = tests.filter((t) => t.status === "completed")
  const filteredTests = testTab === "pending" ? pendingTests : testTab === "completed" ? completedTests : tests
  const currentStage = pipeline?.stage || "registered"
  const readiness = pipeline?.readiness ?? 0

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-purple-600" />
            My College Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Placement pipeline · tests · drives · meetings
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* College hero — fixed contrast */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="relative bg-gradient-to-br from-purple-700 via-blue-700 to-indigo-800 px-6 pt-8 pb-6 text-white">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
          <div className="relative flex flex-col sm:flex-row sm:items-end gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/95 shadow-xl flex items-center justify-center overflow-hidden shrink-0 ring-4 ring-white/30">
              {college.logo ? (
                <img src={college.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <GraduationCap className="h-10 w-10 text-purple-600" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <Badge className="bg-white/20 text-white border-white/30 mb-2 hover:bg-white/20">
                <Sparkles className="h-3 w-3 mr-1" /> Placement Cell Partner
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{college.name}</h2>
              {college.location && (
                <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {college.location}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                {college.email && (
                  <a href={`mailto:${college.email}`} className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors">
                    <Mail className="h-4 w-4" /> {college.email}
                  </a>
                )}
                {college.phone && (
                  <span className="flex items-center gap-1.5 text-white/80">
                    <Phone className="h-4 w-4" /> {college.phone}
                  </span>
                )}
                {college.website && (
                  <a href={college.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-white/90 hover:underline">
                    <Globe className="h-4 w-4" /> Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            {pipeline && (
              <div className="shrink-0 text-center sm:text-right bg-white/10 backdrop-blur rounded-xl px-5 py-4 border border-white/20">
                <p className="text-4xl font-black text-white">{readiness}%</p>
                <p className="text-xs text-white/70 uppercase tracking-wide mt-0.5">Placement Readiness</p>
                <Progress value={readiness} className="h-2 mt-2 bg-white/20" />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Pipeline stepper */}
      {pipeline && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" /> Your Placement Journey
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-between gap-2 relative">
              {PIPELINE_STEPS.map((step, i) => {
                const active = i <= stageIndex(currentStage)
                const current = step.id === currentStage
                const Icon = step.icon
                return (
                  <div key={step.id} className="flex flex-col items-center flex-1 min-w-[72px]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      current ? "bg-purple-600 text-white ring-4 ring-purple-200 scale-110" :
                      active ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className={`text-[10px] sm:text-xs mt-2 text-center font-medium ${current ? "text-purple-700" : active ? "text-green-700" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      {studentInfo && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Department", value: studentInfo.department || "—", cls: "text-purple-700" },
            { label: "Batch", value: studentInfo.batch || "—", cls: "text-blue-700" },
            { label: "CGPA", value: studentInfo.cgpa?.toFixed(2) ?? "—", cls: "text-green-700" },
            { label: "Year", value: studentInfo.currentYear ? `Yr ${studentInfo.currentYear}` : "—", cls: "text-indigo-700" },
            { label: "Semester", value: studentInfo.semester ? `Sem ${studentInfo.semester}` : "—", cls: "text-teal-700" },
            {
              label: "Placement",
              value: studentInfo.placementStatus === "placed"
                ? `Placed${studentInfo.packageLPA ? ` · ₹${studentInfo.packageLPA}L` : ""}`
                : studentInfo.placementStatus?.replace("_", " ") || "Unplaced",
              cls: studentInfo.placementStatus === "placed" ? "text-green-700" : "text-slate-700",
            },
          ].map((s) => (
            <Card key={s.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className={`font-bold text-sm mt-1 capitalize ${s.cls}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="h-full hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group overflow-hidden">
                <div className={`h-1 bg-gradient-to-r ${action.color}`} />
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} text-white shrink-0`}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-purple-700 transition-colors">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column — tests + drives */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tests */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-purple-500" /> College Tests
                  </CardTitle>
                  <CardDescription>
                    {pipeline?.testsCompleted ?? 0}/{pipeline?.testsTotal ?? 0} completed
                    {(pipeline?.testsPending ?? 0) > 0 && (
                      <span className="text-amber-600 font-medium"> · {pipeline?.testsPending} pending</span>
                    )}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/job-seeker/tests">View all</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs value={testTab} onValueChange={setTestTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="pending">Pending ({pendingTests.length})</TabsTrigger>
                  <TabsTrigger value="completed">Done ({completedTests.length})</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
                <TabsContent value={testTab} className="mt-0">
                  {filteredTests.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-sm">
                      <Code2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No tests in this tab yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTests.map((t) => (
                        <div key={t.assignmentId} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            t.status === "completed" ? "bg-green-100" : "bg-purple-100"
                          }`}>
                            {t.status === "completed"
                              ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                              : <Code2 className="h-4 w-4 text-purple-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{t.testTitle}</p>
                            <p className="text-xs text-muted-foreground">
                              {t.dueDate && (
                                <span className={new Date(t.dueDate) < new Date() && t.status !== "completed" ? "text-red-500" : ""}>
                                  Due {format(new Date(t.dueDate), "MMM d")} ·
                                </span>
                              )}{" "}
                              {t.score != null ? `Score ${t.score}%` : t.status}
                            </p>
                          </div>
                          {t.status !== "completed" ? (
                            <Button size="sm" className="h-8 bg-purple-600" asChild>
                              <Link href={`/dashboard/job-seeker/tests/${t.testId}`}>
                                Start <ArrowRight className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Done</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Campus drives */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" /> Campus Drives
                  </CardTitle>
                  <CardDescription>
                    {pipeline?.drivesOpen ?? 0} open to apply · {pipeline?.drivesApplied ?? 0} applied
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/job-seeker/campus-drives">All drives</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {drives.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">
                  <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  No drives match your batch/year profile right now.
                </div>
              ) : (
                drives.slice(0, 5).map((d) => (
                  <div key={d._id} className="flex items-center gap-3 p-3 rounded-xl border hover:border-blue-200 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center font-bold text-purple-700 text-sm shrink-0">
                      {d.companyName?.[0] || "C"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{d.companyName} · {d.role}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.driveDate && format(new Date(d.driveDate), "dd MMM yyyy")}
                        {(d.packageMin || d.packageMax) && ` · ₹${d.packageMin}–${d.packageMax} LPA`}
                      </p>
                    </div>
                    {d.canApply ? (
                      <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => applyToDrive(d._id)}>
                        <Send className="h-3 w-3 mr-1" /> Apply
                      </Button>
                    ) : d.applied ? (
                      <Badge className="bg-blue-100 text-blue-800">{d.applicationStatus || "Applied"}</Badge>
                    ) : d.deadlinePassed ? (
                      <span className="text-xs text-red-500">Closed</span>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — meetings, skills, notifications */}
        <div className="space-y-6">
          {/* Meetings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Video className="h-4 w-4 text-pink-500" /> Upcoming Meetings
              </CardTitle>
              <CardDescription>{pipeline?.upcomingMeetings ?? 0} scheduled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No upcoming meetings</p>
              ) : (
                meetings.map((m) => (
                  <div key={m._id} className="p-3 rounded-lg border text-sm">
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(m.startTime), "EEE, MMM d · h:mm a")}
                    </p>
                    {m.venue && <p className="text-xs text-muted-foreground">{m.venue}</p>}
                    {m.meetingLink && (
                      <Button size="sm" variant="link" className="h-auto p-0 mt-1 text-xs" asChild>
                        <a href={m.meetingLink} target="_blank" rel="noopener noreferrer">Join link</a>
                      </Button>
                    )}
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                <Link href="/dashboard/job-seeker/interviews">All meetings</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Skills */}
          {studentInfo && studentInfo.skills.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Your Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {studentInfo.skills.map((sk) => (
                    <Badge key={sk} variant="secondary" className="text-xs">{sk}</Badge>
                  ))}
                </div>
                <Button variant="link" size="sm" className="px-0 mt-2 h-auto" asChild>
                  <Link href="/dashboard/job-seeker/profile">Edit profile</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" /> College Updates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No recent updates</p>
              ) : (
                notifications.map((n) => (
                  <div key={n._id} className={`p-2.5 rounded-lg text-xs border ${n.read ? "opacity-60" : "bg-purple-50/50 border-purple-100"}`}>
                    <p className="leading-relaxed">{n.message}</p>
                    <p className="text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/dashboard/notifications">All notifications</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card className="border-purple-200 bg-gradient-to-b from-purple-50/80 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-purple-900">
                <Trophy className="h-4 w-4" /> Readiness Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                { done: !!studentInfo?.department, label: "Department on profile" },
                { done: (studentInfo?.skills?.length || 0) > 0, label: "Skills added", href: "/dashboard/job-seeker/profile" },
                { done: (pipeline?.testsCompleted || 0) > 0, label: "Complete assigned tests", href: "/dashboard/job-seeker/tests" },
                { done: (pipeline?.drivesApplied || 0) > 0, label: "Apply to campus drives", href: "/dashboard/job-seeker/campus-drives" },
                { done: studentInfo?.placementStatus === "placed", label: "Get placed!" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  {item.href && !item.done ? (
                    <Link href={item.href} className="text-purple-700 hover:underline">{item.label}</Link>
                  ) : (
                    <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
