"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, Plus, Shield, Users, Clock, FileText,
  Eye, Edit, BarChart3, UserPlus, Search, CheckCircle2,
  Circle, Archive, Zap, TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Assessment {
  _id: string
  title: string
  description: string
  durationMinutes: number
  totalQuestions: number
  totalPoints: number
  difficulty: "Easy" | "Medium" | "Hard"
  status: "Active" | "Draft" | "Archived"
  requiresProctoring: boolean
  securityFeatures: string[]
  createdAt: string
  candidatesAssigned: number
  candidatesCompleted: number
}

const STATUS_TABS = ["All", "Active", "Draft", "Archived"] as const
type StatusTab = typeof STATUS_TABS[number]

const DIFF_COLOR: Record<string, string> = {
  Easy: "bg-green-100 text-green-700 border-green-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Hard: "bg-red-100 text-red-700 border-red-200",
}

const STATUS_COLOR: Record<string, string> = {
  Active: "bg-green-500",
  Draft: "bg-amber-500",
  Archived: "bg-slate-400",
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  Active: <CheckCircle2 className="h-3 w-3" />,
  Draft: <Circle className="h-3 w-3" />,
  Archived: <Archive className="h-3 w-3" />,
}

export default function AssessmentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusTab, setStatusTab] = useState<StatusTab>("All")

  useEffect(() => {
    loadAssessments()
    const onFocus = () => loadAssessments()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem("refreshAssessments") === "true") {
      sessionStorage.removeItem("refreshAssessments")
      loadAssessments()
    }
  }, [])

  const loadAssessments = async () => {
    try {
      const res = await fetch("/api/assessments")
      if (res.ok) {
        const data = await res.json()
        setAssessments(data.assessments || [])
      }
    } catch {
      toast({ title: "Failed to load assessments", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let list = assessments
    if (statusTab !== "All") list = list.filter((a) => a.status === statusTab)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)
      )
    }
    return list
  }, [assessments, statusTab, search])

  const stats = useMemo(() => {
    const totalAssigned = assessments.reduce((s, a) => s + (a.candidatesAssigned || 0), 0)
    const totalCompleted = assessments.reduce((s, a) => s + (a.candidatesCompleted || 0), 0)
    return {
      total: assessments.length,
      active: assessments.filter((a) => a.status === "Active").length,
      assigned: totalAssigned,
      completionRate: totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0,
    }
  }, [assessments])

  const tabCount = (tab: StatusTab) =>
    tab === "All" ? assessments.length : assessments.filter((a) => a.status === tab).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        <span className="ml-3 text-muted-foreground">Loading assessments…</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assessments</h1>
          <p className="text-sm text-muted-foreground">Create and manage AI-proctored tests for your candidates</p>
        </div>
        <Button
          asChild
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white gap-2"
        >
          <Link href="/dashboard/recruiter/assessments/create">
            <Plus className="h-4 w-4" />
            New Assessment
          </Link>
        </Button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, icon: <FileText className="h-5 w-5 text-blue-500" />, color: "text-blue-700" },
          { label: "Active", value: stats.active, icon: <Zap className="h-5 w-5 text-green-500" />, color: "text-green-700" },
          { label: "Candidates Assigned", value: stats.assigned, icon: <Users className="h-5 w-5 text-purple-500" />, color: "text-purple-700" },
          { label: "Completion Rate", value: `${stats.completionRate}%`, icon: <TrendingUp className="h-5 w-5 text-orange-500" />, color: "text-orange-700" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex border rounded-lg overflow-hidden">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
                statusTab === tab
                  ? "bg-blue-600 text-white"
                  : "bg-white text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {tab}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                statusTab === tab ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              }`}>
                {tabCount(tab)}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assessments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-lg mb-1">
              {search || statusTab !== "All" ? "No matching assessments" : "No assessments yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              {search || statusTab !== "All"
                ? "Try adjusting your filters"
                : "Create your first assessment to start evaluating candidates."}
            </p>
            {!search && statusTab === "All" && (
              <Button asChild>
                <Link href="/dashboard/recruiter/assessments/create">Create Assessment</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const completionPct =
              a.candidatesAssigned > 0
                ? Math.round((a.candidatesCompleted / a.candidatesAssigned) * 100)
                : 0

            return (
              <Card key={a._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base truncate">{a.title}</h3>
                        <Badge className={`${STATUS_COLOR[a.status]} text-white text-xs flex items-center gap-1`}>
                          {STATUS_ICON[a.status]}
                          {a.status}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${DIFF_COLOR[a.difficulty]}`}>
                          {a.difficulty}
                        </Badge>
                        {a.requiresProctoring && (
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">
                            <Shield className="h-3 w-3 mr-1" />
                            Proctored
                          </Badge>
                        )}
                      </div>

                      {a.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{a.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />{a.durationMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />{a.totalQuestions} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3.5 w-3.5" />{a.totalPoints} pts
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />{a.candidatesAssigned || 0} assigned
                        </span>
                        {a.candidatesAssigned > 0 && (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />{completionPct}% done
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/dashboard/recruiter/assessments/${a._id}/preview`, "_blank")}
                        className="h-8 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Preview
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/recruiter/assessments/${a._id}/analytics`)}
                        className="h-8 text-xs"
                      >
                        <BarChart3 className="h-3.5 w-3.5 mr-1" />
                        Analytics
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/recruiter/assessments/${a._id}/edit`)}
                        className="h-8 text-xs"
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          sessionStorage.setItem("refreshAssessments", "true")
                          router.push(`/dashboard/recruiter/assessments/${a._id}/assign`)
                        }}
                        className="h-8 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Assign
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
