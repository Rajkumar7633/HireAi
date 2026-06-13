"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SkillBar } from "@/components/ui/charts"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, GraduationCap, Building2, Mail, Phone, Globe,
  CheckCircle2, Clock, Code2, Award, Target, ExternalLink,
  BookOpen, TrendingUp, Trophy, ArrowRight, AlertCircle,
} from "lucide-react"
import { format } from "date-fns"

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
  cgpa: number | null
  placementStatus: string
  companyPlacedAt: string
  packageLPA: number | null
  skills: string[]
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

export default function MyCollegePage() {
  const [college, setCollege] = useState<CollegeInfo | null>(null)
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null)
  const [tests, setTests] = useState<CollegeTest[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/college/my-college")
      if (res.ok) {
        const data = await res.json()
        setCollege(data.college)
        setStudentInfo(data.studentInfo)
        setTests(data.tests || [])
      }
    } catch {
      toast({ title: "Error", description: "Failed to load college info.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Loading college info…</p>
      </div>
    )
  }

  if (!college) {
    return (
      <div className="p-6 w-full">
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold mb-2">No College Linked</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              You are not onboarded through a college placement cell. If you think this is a mistake, contact your placement officer.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingTests = tests.filter((t) => t.status !== "completed")
  const completedTests = tests.filter((t) => t.status === "completed")
  const avgScore =
    completedTests.length > 0
      ? Math.round(completedTests.reduce((s, t) => s + (t.score ?? 0), 0) / completedTests.length)
      : null

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-purple-600" /> My College
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Your placement cell and assigned activities</p>
      </div>

      {/* College profile card */}
      <Card className="overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600" />
        <CardContent className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-xl bg-white shadow-lg ring-4 ring-white flex items-center justify-center overflow-hidden shrink-0">
              {college.logo ? (
                <img src={college.logo} alt={college.name} className="w-full h-full object-cover" />
              ) : (
                <GraduationCap className="h-8 w-8 text-purple-600" />
              )}
            </div>
            <div className="pb-1">
              <h2 className="text-xl font-bold">{college.name}</h2>
              {college.location && (
                <p className="text-sm text-muted-foreground">{college.location}</p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            {college.email && (
              <a href={`mailto:${college.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-4 w-4 shrink-0" />{college.email}
              </a>
            )}
            {college.phone && (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />{college.phone}
              </span>
            )}
            {college.website && (
              <a href={college.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-600 hover:underline">
                <Globe className="h-4 w-4 shrink-0" />Website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My academic info */}
      {studentInfo && (
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Department</p>
              <p className="font-bold mt-0.5">{studentInfo.department || "—"}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Batch</p>
              <p className="font-bold mt-0.5">{studentInfo.batch || "—"}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">CGPA</p>
              <p className="font-bold mt-0.5">{studentInfo.cgpa?.toFixed(2) ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className={`border ${studentInfo.placementStatus === "placed" ? "bg-green-50 border-green-200" : "bg-gray-50"}`}>
            <CardContent className="pt-4 pb-4 px-4">
              <p className="text-xs text-muted-foreground">Placement</p>
              <p className={`font-bold mt-0.5 capitalize ${studentInfo.placementStatus === "placed" ? "text-green-700" : ""}`}>
                {studentInfo.placementStatus?.replace("_", " ") || "Unplaced"}
              </p>
              {studentInfo.companyPlacedAt && (
                <p className="text-xs text-green-600">{studentInfo.companyPlacedAt}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Assigned tests */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-purple-500" />
                  Tests Assigned by Placement Cell
                </CardTitle>
                <CardDescription>{tests.length} total • {completedTests.length} completed</CardDescription>
              </div>
              {avgScore !== null && (
                <div className="text-right">
                  <p className={`text-2xl font-black ${avgScore >= 70 ? "text-green-600" : avgScore >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                    {avgScore}%
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-0 p-0">
            {tests.length === 0 ? (
              <div className="py-12 text-center px-6">
                <Code2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">No tests assigned yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Your placement cell will assign tests here.</p>
              </div>
            ) : (
              <div className="divide-y">
                {tests.map((t) => (
                  <div key={t.assignmentId} className="flex items-center gap-4 px-6 py-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      t.status === "completed" ? "bg-green-100" : "bg-purple-100"
                    }`}>
                      {t.status === "completed"
                        ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                        : <Code2 className="h-5 w-5 text-purple-600" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{t.testTitle}</p>
                      <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>Assigned {format(new Date(t.assignedAt), "MMM d, yyyy")}</span>
                        {t.dueDate && (
                          <span className={`flex items-center gap-1 ${new Date(t.dueDate) < new Date() && t.status !== "completed" ? "text-red-500 font-medium" : ""}`}>
                            <Clock className="h-3 w-3" />
                            Due {format(new Date(t.dueDate), "MMM d")}
                          </span>
                        )}
                        {t.completedAt && (
                          <span className="text-green-600">Done {format(new Date(t.completedAt), "MMM d")}</span>
                        )}
                      </div>
                      {t.score !== null && (
                        <div className="mt-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-muted">
                              <div
                                className={`h-1.5 rounded-full ${t.score >= 70 ? "bg-green-500" : t.score >= 50 ? "bg-yellow-500" : "bg-red-400"}`}
                                style={{ width: `${t.score}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${t.score >= 70 ? "text-green-600" : t.score >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                              {t.score}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0">
                      {t.status === "completed" ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200 border text-xs">Completed</Badge>
                      ) : (
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 h-8 text-xs gap-1" asChild>
                          <Link href={`/dashboard/job-seeker/tests/${t.testId}`}>
                            Start <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tip card */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardContent className="py-4 px-5 flex items-start gap-3">
          <Trophy className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-purple-900">Boost your placement chances</p>
            <p className="text-xs text-purple-700 mt-0.5">
              Complete your profile, upload a resume, add skills, and complete all assigned tests to improve your readiness score and visibility to recruiters.
            </p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button size="sm" variant="outline" className="h-7 text-xs border-purple-300 text-purple-700" asChild>
                <Link href="/dashboard/job-seeker/resume-builder">Build Resume</Link>
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-purple-300 text-purple-700" asChild>
                <Link href="/dashboard/job-seeker/skill-gap">Skill Gap Analyzer</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
