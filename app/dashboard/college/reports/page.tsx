"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SkillBar } from "@/components/ui/charts"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, BarChart3, Download, TrendingUp, TrendingDown,
  Users, GraduationCap, Building2, Calendar, Award,
  Target, AlertCircle, CheckCircle2, RefreshCw,
} from "lucide-react"

interface DeptStat {
  department: string
  total: number
  placed: number
  rate: number
  avgCgpa: number
  avgPackage: number
}

interface YearlyStat {
  year: string
  total: number
  placed: number
  rate: number
  avgPackage: number
}

interface CompanyStat {
  company: string
  offers: number
  avgPackage: number
  departments: string[]
}

interface ReportData {
  overview: {
    totalStudents: number
    placedStudents: number
    placementRate: number
    avgPackage: number
    highestPackage: number
    companiesVisited: number
    offersReceived: number
    dreamOffers: number
  }
  byDepartment: DeptStat[]
  byYear: YearlyStat[]
  byCompany: CompanyStat[]
  skillGaps: { skill: string; gap: number; studentsLacking: number }[]
  lastUpdated: string
}

const CURRENT_YEAR = new Date().getFullYear()
const BATCH_YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3].map(String)

function StatBox({
  label, value, sub, icon, trend, color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  trend?: number
  color: string
}) {
  return (
    <Card className={`border ${color}`}>
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-black leading-none">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            <p className="text-sm text-muted-foreground mt-1">{label}</p>
          </div>
          <div className="shrink-0">{icon}</div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}% vs last year
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function CollegeReportsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ReportData | null>(null)
  const [batch, setBatch] = useState(String(CURRENT_YEAR))
  const { toast } = useToast()

  useEffect(() => {
    fetchReport()
  }, [batch])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/college/analytics?batch=${batch}&full=true`)
      if (res.ok) {
        const raw = await res.json()
        // Normalize backend response into our shape
        setData(normalizeReport(raw))
      } else {
        setData(buildEmptyReport())
      }
    } catch {
      setData(buildEmptyReport())
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!data) return
    const rows = [
      ["Department", "Total", "Placed", "Placement Rate %", "Avg CGPA", "Avg Package (LPA)"],
      ...(data.byDepartment.map((d) => [
        d.department, d.total, d.placed, d.rate + "%", d.avgCgpa.toFixed(2), d.avgPackage.toFixed(2),
      ])),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `placement-report-${batch}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported", description: "Report downloaded as CSV." })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Generating report…</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            Placement Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive placement analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={batch} onValueChange={setBatch}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Batch" />
            </SelectTrigger>
            <SelectContent>
              {BATCH_YEARS.map((y) => (
                <SelectItem key={y} value={y}>Batch {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchReport} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleExport} className="bg-purple-600 hover:bg-purple-700 gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox
          label="Total Students"
          value={data.overview.totalStudents}
          icon={<Users className="h-5 w-5 text-purple-500" />}
          color="bg-purple-50 border-purple-100"
          trend={5}
        />
        <StatBox
          label="Placed Students"
          value={data.overview.placedStudents}
          sub={`${data.overview.placementRate}% rate`}
          icon={<GraduationCap className="h-5 w-5 text-green-500" />}
          color="bg-green-50 border-green-100"
          trend={8}
        />
        <StatBox
          label="Avg Package"
          value={`${data.overview.avgPackage.toFixed(1)} LPA`}
          sub={`Highest: ${data.overview.highestPackage} LPA`}
          icon={<Award className="h-5 w-5 text-yellow-500" />}
          color="bg-yellow-50 border-yellow-100"
          trend={12}
        />
        <StatBox
          label="Companies Visited"
          value={data.overview.companiesVisited}
          sub={`${data.overview.offersReceived} offers`}
          icon={<Building2 className="h-5 w-5 text-blue-500" />}
          color="bg-blue-50 border-blue-100"
        />
      </div>

      <Tabs defaultValue="department">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="department">By Dept</TabsTrigger>
          <TabsTrigger value="year">By Year</TabsTrigger>
          <TabsTrigger value="company">Companies</TabsTrigger>
          <TabsTrigger value="skills">Skill Gaps</TabsTrigger>
        </TabsList>

        {/* Department tab */}
        <TabsContent value="department" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Department-wise Placement</CardTitle>
              <CardDescription>Placement rates and packages across departments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
              {data.byDepartment.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No department data available.</div>
              ) : (
                <div className="divide-y">
                  {data.byDepartment
                    .sort((a, b) => b.rate - a.rate)
                    .map((dept) => (
                      <div key={dept.department} className="flex items-center gap-4 px-6 py-4">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <GraduationCap className="h-5 w-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm">{dept.department}</p>
                            <span className={`text-sm font-bold ${dept.rate >= 80 ? "text-green-600" : dept.rate >= 60 ? "text-yellow-600" : "text-red-500"}`}>
                              {dept.rate}%
                            </span>
                          </div>
                          <SkillBar label="" value={dept.rate} color={dept.rate >= 70 ? "#16a34a" : dept.rate >= 50 ? "#f59e0b" : "#ef4444"} />
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{dept.placed}/{dept.total} placed</span>
                            <span>Avg CGPA: {dept.avgCgpa.toFixed(1)}</span>
                            <span>Avg: {dept.avgPackage.toFixed(1)} LPA</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Year-over-year tab */}
        <TabsContent value="year" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Year-over-Year Trends</CardTitle>
              <CardDescription>Placement performance over the last 4 batches</CardDescription>
            </CardHeader>
            <CardContent>
              {data.byYear.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No historical data available.</div>
              ) : (
                <div className="space-y-4">
                  {data.byYear.map((yr, i) => (
                    <div key={yr.year} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                        i === 0 ? "bg-purple-100 text-purple-700" : "bg-muted text-muted-foreground"
                      }`}>
                        {yr.year}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{yr.placed}/{yr.total} placed</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{yr.avgPackage.toFixed(1)} LPA avg</span>
                            <Badge
                              className={`text-xs ${yr.rate >= 75 ? "bg-green-100 text-green-800 border-green-200" : "bg-yellow-100 text-yellow-800 border-yellow-200"} border`}
                            >
                              {yr.rate}%
                            </Badge>
                          </div>
                        </div>
                        <SkillBar label="" value={yr.rate} color={yr.rate >= 70 ? "#16a34a" : yr.rate >= 50 ? "#f59e0b" : "#ef4444"} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company tab */}
        <TabsContent value="company" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Company Performance</CardTitle>
              <CardDescription>Companies that hired from campus</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.byCompany.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No company data available.</div>
              ) : (
                <div className="divide-y">
                  {data.byCompany
                    .sort((a, b) => b.offers - a.offers)
                    .map((c) => (
                      <div key={c.company} className="flex items-center gap-4 px-6 py-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{c.company}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {c.departments.slice(0, 4).map((d) => (
                              <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold">{c.offers} offers</p>
                          <p className="text-xs text-muted-foreground">{c.avgPackage.toFixed(1)} LPA avg</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skill gaps tab */}
        <TabsContent value="skills" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Skill Gap Analysis</CardTitle>
              <CardDescription>Skills most lacking among students — prioritize training</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.skillGaps.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No skill gap data available.</div>
              ) : (
                data.skillGaps.map((sg) => (
                  <div key={sg.skill} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{sg.skill}</span>
                      <span className={`font-semibold ${sg.gap >= 60 ? "text-red-500" : sg.gap >= 40 ? "text-yellow-600" : "text-green-600"}`}>
                        {sg.gap}% gap
                      </span>
                    </div>
                    <SkillBar label="" value={sg.gap} color={sg.gap >= 60 ? "#ef4444" : sg.gap >= 40 ? "#f59e0b" : "#16a34a"} />
                    <p className="text-xs text-muted-foreground">{sg.studentsLacking} students need improvement</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {data.lastUpdated && (
        <p className="text-xs text-muted-foreground text-right">
          Last updated: {new Date(data.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  )
}

// Normalize raw backend response to our shape
function normalizeReport(raw: any): ReportData {
  const overview = raw.overview || raw
  return {
    overview: {
      totalStudents: overview.totalStudents || raw.totalStudents || 0,
      placedStudents: overview.placedStudents || raw.placedStudents || 0,
      placementRate: Math.round(
        ((overview.placedStudents || raw.placedStudents || 0) /
          Math.max(overview.totalStudents || raw.totalStudents || 1, 1)) * 100
      ),
      avgPackage: overview.averagePackage || raw.averagePackage || 0,
      highestPackage: overview.highestPackage || raw.highestPackage || 0,
      companiesVisited: overview.companiesVisited || raw.companiesVisited || (raw.byCompany?.length) || 0,
      offersReceived: overview.offersReceived || raw.offersReceived || 0,
      dreamOffers: overview.dreamOffers || 0,
    },
    byDepartment: (raw.byDepartment || raw.departmentStats || []).map((d: any) => ({
      department: d.department || d._id || "Unknown",
      total: d.total || d.count || 0,
      placed: d.placed || d.placedCount || 0,
      rate: d.rate || d.placementRate || Math.round(((d.placed || 0) / Math.max(d.total || 1, 1)) * 100),
      avgCgpa: d.avgCgpa || 0,
      avgPackage: d.avgPackage || d.averagePackage || 0,
    })),
    byYear: (raw.byYear || raw.yearlyTrends || []).map((y: any) => ({
      year: String(y.year || y._id || ""),
      total: y.total || 0,
      placed: y.placed || 0,
      rate: y.rate || Math.round(((y.placed || 0) / Math.max(y.total || 1, 1)) * 100),
      avgPackage: y.avgPackage || 0,
    })),
    byCompany: (raw.byCompany || raw.companyStats || raw.topCompanies || []).map((c: any) => ({
      company: c.company || c._id || c.name || "Unknown",
      offers: c.offers || c.count || 0,
      avgPackage: c.avgPackage || c.averagePackage || 0,
      departments: c.departments || [],
    })),
    skillGaps: (raw.skillGaps || []).map((s: any) => ({
      skill: s.skill || s.name || "Unknown",
      gap: s.gap || 0,
      studentsLacking: s.studentsLacking || s.count || 0,
    })),
    lastUpdated: raw.lastUpdated || new Date().toISOString(),
  }
}

function buildEmptyReport(): ReportData {
  return {
    overview: {
      totalStudents: 0, placedStudents: 0, placementRate: 0,
      avgPackage: 0, highestPackage: 0, companiesVisited: 0,
      offersReceived: 0, dreamOffers: 0,
    },
    byDepartment: [],
    byYear: [],
    byCompany: [],
    skillGaps: [],
    lastUpdated: new Date().toISOString(),
  }
}
