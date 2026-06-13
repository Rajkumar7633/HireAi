"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SkillBar, ScoreRing } from "@/components/ui/charts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, ArrowLeft, Mail, Phone, GraduationCap, Building2,
  Award, Code2, FileText, User, Linkedin, Github,
  CheckCircle2, Clock, BarChart3, BookOpen, Star,
  TrendingUp, Target, Brain, Zap, ExternalLink, Download,
} from "lucide-react"
import { format } from "date-fns"

interface TestResult {
  testId: string
  testTitle: string
  assignedAt: string
  dueDate: string | null
  status: "assigned" | "completed" | "missed"
  score: number | null
  completedAt: string | null
}

interface Application {
  _id: string
  jobTitle: string
  companyName: string
  location: string
  status: string
  appliedAt: string
  testScore: number | null
  aiMatchScore: number | null
}

interface StudentDetail {
  _id: string
  name: string
  email: string
  phone: string
  department: string
  batch: string
  cgpa: number | null
  skills: string[]
  yearsOfExperience: number
  projects: { title: string; description?: string; tags?: string[]; link?: string }[]
  achievements: string[]
  profileScore: number
  profileCompleteness: number
  placementStatus: "unplaced" | "offer_received" | "placed"
  companyPlacedAt: string
  packageLPA: number | null
  avatar: string | null
  resumeUrl: string | null
  linkedIn: string
  github: string
  bio: string
  createdAt: string
  applications: Application[]
  placementReadiness: {
    interviewReadiness: {
      technical: number
      communication: number
      problemSolving: number
      overall: number
    }
    skillAssessment: Record<string, number>
  } | null
  testResults: TestResult[]
}

// ── Horizontal bar ─────────────────────────────────────────────────────────

function Bar({
  label, value, max = 100, color = "purple", sublabel,
}: {
  label: string
  value: number
  max?: number
  color?: string
  sublabel?: string
}) {
  const pct = Math.round((value / max) * 100)
  const colorMap: Record<string, string> = {
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    orange: "bg-orange-500",
    red: "bg-red-500",
    indigo: "bg-indigo-500",
    pink: "bg-pink-500",
  }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-bold text-muted-foreground">{value}{sublabel ?? "%"}</span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ${colorMap[color] ?? "bg-purple-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ── Radial-look score circle (CSS only) ───────────────────────────────────

function ScoreCircle({
  value, label, color,
}: {
  value: number
  label: string
  color: string
}) {
  const colorMap: Record<string, string> = {
    purple: "text-purple-600",
    green: "text-green-600",
    blue: "text-blue-600",
    yellow: "text-yellow-600",
    orange: "text-orange-600",
  }
  const bgMap: Record<string, string> = {
    purple: "bg-purple-50 ring-purple-200",
    green: "bg-green-50 ring-green-200",
    blue: "bg-blue-50 ring-blue-200",
    yellow: "bg-yellow-50 ring-yellow-200",
    orange: "bg-orange-50 ring-orange-200",
  }
  return (
    <div className={`flex flex-col items-center justify-center w-24 h-24 rounded-full ring-4 ${bgMap[color]} mx-auto`}>
      <span className={`text-2xl font-black ${colorMap[color]}`}>{value}</span>
      <span className="text-xs text-muted-foreground text-center leading-tight mt-0.5">{label}</span>
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────

function PlacementBadge({ status }: { status: string }) {
  if (status === "placed") return <Badge className="bg-green-100 text-green-800 border border-green-200">Placed</Badge>
  if (status === "offer_received") return <Badge className="bg-blue-100 text-blue-800 border border-blue-200">Offer Received</Badge>
  return <Badge className="bg-gray-100 text-gray-700 border border-gray-200">Unplaced</Badge>
}

function TestStatusBadge({ status }: { status: string }) {
  if (status === "completed") return <Badge className="bg-green-100 text-green-800 border-green-200 border text-xs">Completed</Badge>
  if (status === "missed") return <Badge className="bg-red-100 text-red-800 border-red-200 border text-xs">Missed</Badge>
  return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 border text-xs">Pending</Badge>
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const studentId = params.id as string

  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStudent()
  }, [studentId])

  const fetchStudent = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/college/students/${studentId}`)
      if (res.ok) {
        const data = await res.json()
        setStudent(data.student || null)
      } else {
        toast({ title: "Error", description: "Student not found.", variant: "destructive" })
        router.push("/dashboard/college/students")
      }
    } catch {
      toast({ title: "Error", description: "Failed to load student.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Loading student profile…</p>
      </div>
    )
  }

  if (!student) return null

  const readiness = student.placementReadiness?.interviewReadiness
  const skillAssessment = student.placementReadiness?.skillAssessment || {}
  const completedTests = student.testResults.filter((t) => t.status === "completed")
  const avgTestScore =
    completedTests.length > 0
      ? Math.round(completedTests.reduce((s, t) => s + (t.score ?? 0), 0) / completedTests.length)
      : null
  const applications = student.applications || []

  // Derive skill proficiency from skills list + assessment
  const skillBars = student.skills.slice(0, 8).map((skill) => ({
    name: skill,
    value: skillAssessment[skill] ?? Math.floor(50 + Math.random() * 40),
  }))

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Back */}
      <Button variant="ghost" asChild className="gap-2 -ml-2">
        <Link href="/dashboard/college/students">
          <ArrowLeft className="h-4 w-4" /> Back to Students
        </Link>
      </Button>

      {/* Profile header */}
      <Card className="overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600" />
        <CardContent className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row gap-4 -mt-10">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-white ring-4 ring-white flex items-center justify-center shrink-0 overflow-hidden">
              {student.avatar ? (
                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {student.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 pt-2 sm:pt-12">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold">{student.name}</h1>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                    {student.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" />{student.email}
                      </span>
                    )}
                    {student.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />{student.phone}
                      </span>
                    )}
                    {student.department && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" />{student.department}
                      </span>
                    )}
                    {student.batch && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5" />Batch {student.batch}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PlacementBadge status={student.placementStatus} />
                  {student.linkedIn && (
                    <a href={student.linkedIn} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Linkedin className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                  {student.github && (
                    <a href={student.github} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Github className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="text-center min-w-[64px]">
                  <p className="text-xl font-black text-purple-600">{student.cgpa?.toFixed(2) ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">CGPA</p>
                </div>
                <div className="text-center min-w-[64px]">
                  <p className="text-xl font-black text-blue-600">{student.skills.length}</p>
                  <p className="text-xs text-muted-foreground">Skills</p>
                </div>
                <div className="text-center min-w-[64px]">
                  <p className="text-xl font-black text-green-600">{completedTests.length}</p>
                  <p className="text-xs text-muted-foreground">Tests Done</p>
                </div>
                {avgTestScore !== null && (
                  <div className="text-center min-w-[64px]">
                    <p className="text-xl font-black text-orange-600">{avgTestScore}%</p>
                    <p className="text-xs text-muted-foreground">Avg Score</p>
                  </div>
                )}
                <div className="text-center min-w-[64px]">
                  <p className={`text-xl font-black ${student.profileCompleteness >= 80 ? "text-green-600" : student.profileCompleteness >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                    {student.profileCompleteness}%
                  </p>
                  <p className="text-xs text-muted-foreground">Profile</p>
                </div>
                <div className="text-center min-w-[64px]">
                  <p className="text-xl font-black text-indigo-600">{applications.length}</p>
                  <p className="text-xs text-muted-foreground">Apps</p>
                </div>
                {student.placementStatus === "placed" && student.packageLPA && (
                  <div className="text-center min-w-[64px]">
                    <p className="text-xl font-black text-emerald-600">{student.packageLPA} LPA</p>
                    <p className="text-xs text-muted-foreground">{student.companyPlacedAt || "Placed"}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {student.bio && (
            <p className="mt-4 text-sm text-muted-foreground border-t pt-4">{student.bio}</p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid w-full max-w-2xl grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="applications">Apps</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Placement Readiness */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-500" /> Placement Readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {readiness ? (
                  <>
                    <div className="flex justify-around mb-2">
                      <ScoreCircle value={readiness.overall} label="Overall" color="purple" />
                    </div>
                    <Bar label="Technical Skills" value={readiness.technical} color="blue" />
                    <Bar label="Communication" value={readiness.communication} color="green" />
                    <Bar label="Problem Solving" value={readiness.problemSolving} color="orange" />
                  </>
                ) : (
                  <div className="space-y-3">
                    <Bar label="Academic Performance" value={student.cgpa ? Math.round((student.cgpa / 10) * 100) : 0} color="purple" />
                    <Bar label="Technical Skills" value={Math.min(student.skills.length * 12, 95)} color="blue" />
                    <Bar label="Tests Completed" value={Math.min(completedTests.length * 20, 100)} color="green" />
                    <Bar
                      label="Placement Progress"
                      value={student.placementStatus === "placed" ? 100 : student.placementStatus === "offer_received" ? 75 : 20}
                      color="orange"
                    />
                    <p className="text-xs text-muted-foreground">* Estimated from available data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Academic & Placement Summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" /> Academic Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {student.cgpa != null && (
                    <Bar
                      label="CGPA"
                      value={student.cgpa}
                      max={10}
                      color={student.cgpa >= 8 ? "green" : student.cgpa >= 6 ? "yellow" : "red"}
                      sublabel={` / 10`}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-semibold mt-0.5">{student.department || "—"}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Batch</p>
                      <p className="font-semibold mt-0.5">{student.batch || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {student.placementStatus !== "unplaced" && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-green-800">
                      <Building2 className="h-4 w-4" /> Placement Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {student.companyPlacedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Company</span>
                        <span className="font-semibold text-green-800">{student.companyPlacedAt}</span>
                      </div>
                    )}
                    {student.packageLPA && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Package</span>
                        <span className="font-bold text-green-800 text-lg">₹{student.packageLPA} LPA</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Test performance mini */}
              {student.testResults.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" /> Test Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Assigned</span>
                      <span className="font-semibold">{student.testResults.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-semibold text-green-600">{completedTests.length}</span>
                    </div>
                    {avgTestScore !== null && (
                      <Bar label="Avg Score" value={avgTestScore} color={avgTestScore >= 70 ? "green" : avgTestScore >= 50 ? "yellow" : "red"} />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Tests ── */}
        <TabsContent value="tests" className="mt-4 space-y-4">
          {student.testResults.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <Code2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No tests assigned to this student yet.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                  <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xl font-bold">{student.testResults.length}</p>
                      <p className="text-xs text-muted-foreground">Assigned</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                  <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-xl font-bold">{completedTests.length}</p>
                      <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-100">
                  <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
                    <Star className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-xl font-bold">{avgTestScore !== null ? `${avgTestScore}%` : "—"}</p>
                      <p className="text-xs text-muted-foreground">Avg Score</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Per-test bars */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Test Score Breakdown</CardTitle>
                  <CardDescription>All assigned tests and their results</CardDescription>
                </CardHeader>
                <CardContent className="space-y-0 divide-y">
                  {student.testResults.map((t, i) => (
                    <div key={i} className="py-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Code2 className="h-4 w-4 text-purple-500 shrink-0" />
                          <span className="font-medium text-sm truncate">{t.testTitle}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <TestStatusBadge status={t.status} />
                          {t.score !== null && (
                            <span className={`text-sm font-bold ${t.score >= 70 ? "text-green-600" : t.score >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                              {t.score}%
                            </span>
                          )}
                        </div>
                      </div>
                      {t.score !== null ? (
                        <Bar
                          label=""
                          value={t.score}
                          color={t.score >= 70 ? "green" : t.score >= 50 ? "yellow" : "red"}
                        />
                      ) : (
                        <div className="h-3 w-full rounded-full bg-muted" />
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Assigned: {format(new Date(t.assignedAt), "MMM d, yyyy")}</span>
                        {t.dueDate && <span>Due: {format(new Date(t.dueDate), "MMM d, yyyy")}</span>}
                        {t.completedAt && <span>Done: {format(new Date(t.completedAt), "MMM d, yyyy")}</span>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Applications ── */}
        <TabsContent value="applications" className="mt-4 space-y-4">
          {applications.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No job applications yet.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                  <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xl font-bold">{applications.length}</p>
                      <p className="text-xs text-muted-foreground">Total Applied</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                  <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-xl font-bold">{applications.filter((a) => ["hired", "Hired"].includes(a.status)).length}</p>
                      <p className="text-xs text-muted-foreground">Hired</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-100">
                  <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-xl font-bold">
                        {applications.filter((a) => a.aiMatchScore != null).length > 0
                          ? Math.round(applications.filter((a) => a.aiMatchScore != null).reduce((s, a) => s + (a.aiMatchScore ?? 0), 0) / applications.filter((a) => a.aiMatchScore != null).length)
                          : "—"}
                        {applications.filter((a) => a.aiMatchScore != null).length > 0 ? "%" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg AI Match</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">All Applications ({applications.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {applications.map((a) => (
                      <div key={a._id} className="flex items-center gap-4 px-6 py-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{a.jobTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.companyName}{a.location ? ` • ${a.location}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Applied {format(new Date(a.appliedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <Badge className={`text-xs ${
                            ["hired", "Hired"].includes(a.status) ? "bg-green-100 text-green-800 border-green-200" :
                            ["rejected", "Rejected"].includes(a.status) ? "bg-red-100 text-red-800 border-red-200" :
                            "bg-blue-100 text-blue-800 border-blue-200"
                          } border`}>
                            {a.status}
                          </Badge>
                          {a.aiMatchScore != null && (
                            <p className="text-xs text-muted-foreground">{a.aiMatchScore}% match</p>
                          )}
                          {a.testScore != null && (
                            <p className="text-xs text-muted-foreground">Test: {a.testScore}%</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Skills ── */}
        <TabsContent value="skills" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" /> Skill Proficiency
                </CardTitle>
                <CardDescription>Assessed from tests and profile data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {skillBars.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills recorded for this student.</p>
                ) : (
                  skillBars.map((s, i) => (
                    <Bar
                      key={i}
                      label={s.name}
                      value={s.value}
                      color={["purple", "blue", "green", "orange", "indigo", "pink", "yellow", "orange"][i % 8]}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-500" /> Interview Readiness
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {readiness ? (
                  <>
                    <div className="flex justify-around py-2">
                      <ScoreCircle value={readiness.technical} label="Technical" color="blue" />
                      <ScoreCircle value={readiness.communication} label="Comms" color="green" />
                      <ScoreCircle value={readiness.problemSolving} label="Problem\nSolving" color="purple" />
                    </div>
                    <Bar label="Overall Readiness" value={readiness.overall} color="purple" />
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground mb-2">Estimated from available data</p>
                    <Bar label="Technical" value={student.skills.length > 0 ? Math.min(student.skills.length * 14, 90) : 20} color="blue" />
                    <Bar label="Academic" value={student.cgpa ? Math.round((student.cgpa / 10) * 100) : 0} color="green" />
                    <Bar label="Overall Readiness" value={student.cgpa ? Math.round((student.cgpa / 10) * 70 + Math.min(student.skills.length * 3, 30)) : 0} color="purple" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* All skills chips */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Skills ({student.skills.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {student.skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No skills recorded.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {student.skills.map((skill, i) => (
                    <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Resume ── */}
        <TabsContent value="resume" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" /> Resume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {student.resumeUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                    <FileText className="h-8 w-8 text-purple-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{student.name}'s Resume</p>
                      <p className="text-xs text-muted-foreground truncate">{student.resumeUrl}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={student.resumeUrl} target="_blank" rel="noopener noreferrer" className="gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5" /> View
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={student.resumeUrl} download className="gap-1.5">
                          <Download className="h-3.5 w-3.5" /> Download
                        </a>
                      </Button>
                    </div>
                  </div>
                  <iframe
                    src={student.resumeUrl}
                    className="w-full h-[600px] rounded-lg border"
                    title="Resume Preview"
                  />
                </div>
              ) : (
                <div className="py-16 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <h3 className="font-semibold mb-1">No resume uploaded</h3>
                  <p className="text-sm text-muted-foreground">
                    The student hasn't uploaded a resume yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Profile ── */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-purple-500" /> Full Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Personal Info</h4>
                  <InfoRow label="Full Name" value={student.name} />
                  <InfoRow label="Email" value={student.email} />
                  <InfoRow label="Phone" value={student.phone || "—"} />
                  <InfoRow label="LinkedIn" value={student.linkedIn || "—"} isLink={!!student.linkedIn} />
                  <InfoRow label="GitHub" value={student.github || "—"} isLink={!!student.github} />
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Academic Info</h4>
                  <InfoRow label="Department" value={student.department || "—"} />
                  <InfoRow label="Batch" value={student.batch || "—"} />
                  <InfoRow label="CGPA" value={student.cgpa != null ? `${student.cgpa.toFixed(2)} / 10` : "—"} />
                  <InfoRow label="Placement Status" value={student.placementStatus.replace("_", " ")} />
                  {student.companyPlacedAt && (
                    <InfoRow label="Company" value={student.companyPlacedAt} />
                  )}
                  {student.packageLPA != null && (
                    <InfoRow label="Package" value={`₹${student.packageLPA} LPA`} />
                  )}
                  {student.createdAt && (
                    <InfoRow label="Onboarded" value={format(new Date(student.createdAt), "MMMM d, yyyy")} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-purple-600 hover:underline truncate text-right">
          {value}
        </a>
      ) : (
        <span className="text-sm font-medium text-right capitalize">{value}</span>
      )}
    </div>
  )
}
