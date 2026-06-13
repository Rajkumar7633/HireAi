"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SkillBar, DonutChart, ScoreRing } from "@/components/ui/charts"
import { Badge } from "@/components/ui/badge"
import { Loader2, BarChart3, TrendingUp, Users, Award, AlertTriangle } from "lucide-react"

interface Overview {
  totalStudents: number
  readyForPlacement: number
  needImprovement: number
  notReady: number
  averageReadinessScore: number
  skillGaps: Record<string, { required: number; missing: number }>
  topPerformers: Array<{ name: string; cgpa: number; readiness: number }>
  atRiskStudents: Array<{ name: string; cgpa: number; readiness: number }>
}

interface Heatmap {
  byYear: Record<string, Record<string, { beginner: number; intermediate: number; advanced: number }>>
  byBranch: Record<string, Record<string, { beginner: number; intermediate: number; advanced: number }>>
  overall: Record<string, { beginner: number; intermediate: number; advanced: number }>
}

export default function PlacementAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [heatmap, setHeatmap] = useState<Heatmap | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [funnel, setFunnel] = useState<any>(null)
  const [companyPerformance, setCompanyPerformance] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [overviewRes, heatmapRes, leaderboardRes, funnelRes, companyRes] = await Promise.all([
        fetch(`/api/placement-analytics?overview=true`),
        fetch(`/api/placement-analytics?skills-heatmap=true`),
        fetch(`/api/placement-analytics?leaderboard=true`),
        fetch(`/api/placement-analytics?placement-funnel=true`),
        fetch(`/api/placement-analytics?company-performance=true`)
      ])

      const [overviewData, heatmapData, leaderboardData, funnelData, companyData] = await Promise.all([
        overviewRes.json(),
        heatmapRes.json(),
        leaderboardRes.json(),
        funnelRes.json(),
        companyRes.json()
      ])

      if (overviewData.success) setOverview(overviewData.overview)
      if (heatmapData.success) setHeatmap(heatmapData.heatmap)
      if (leaderboardData.success) setLeaderboard(leaderboardData.leaderboard)
      if (funnelData.success) setFunnel(funnelData.funnel)
      if (companyData.success) setCompanyPerformance(companyData.companyPerformance)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          Placement Readiness Analytics
        </h1>
        <p className="text-gray-600">Comprehensive analytics for placement cell decision-making</p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <ScoreRing value={overview.totalStudents} max={Math.max(overview.totalStudents, 1)} size={64} stroke={6} color="#7c3aed" />
              <p className="text-xs text-muted-foreground text-center">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <ScoreRing value={overview.readyForPlacement} max={Math.max(overview.totalStudents, 1)} size={64} stroke={6} color="#16a34a" />
              <p className="text-xs text-muted-foreground text-center">Ready</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <ScoreRing value={overview.needImprovement} max={Math.max(overview.totalStudents, 1)} size={64} stroke={6} color="#d97706" />
              <p className="text-xs text-muted-foreground text-center">Need Improvement</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <ScoreRing value={overview.notReady} max={Math.max(overview.totalStudents, 1)} size={64} stroke={6} color="#dc2626" />
              <p className="text-xs text-muted-foreground text-center">Not Ready</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <ScoreRing value={overview.averageReadinessScore} size={64} stroke={6} label="Avg" sublabel="Ready" />
              <p className="text-xs text-muted-foreground text-center">Avg Readiness</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills Heatmap</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="funnel">Placement Funnel</TabsTrigger>
          <TabsTrigger value="companies">Company Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {overview && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-yellow-600" />
                      Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overview.topPerformers.length === 0 ? (
                      <p className="text-sm text-gray-600">No top performers yet</p>
                    ) : (
                      <div className="space-y-2">
                        {overview.topPerformers.slice(0, 5).map((student, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium text-sm">{student.name}</div>
                              <div className="text-xs text-gray-600">CGPA: {student.cgpa?.toFixed(2)}</div>
                            </div>
                            <Badge variant="outline">{student.readiness}%</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      At-Risk Students
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overview.atRiskStudents.length === 0 ? (
                      <p className="text-sm text-gray-600">No at-risk students</p>
                    ) : (
                      <div className="space-y-2">
                        {overview.atRiskStudents.slice(0, 5).map((student, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                            <div>
                              <div className="font-medium text-sm">{student.name}</div>
                              <div className="text-xs text-gray-600">CGPA: {student.cgpa?.toFixed(2)}</div>
                            </div>
                            <Badge variant="destructive">{student.readiness}%</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {overview && Object.keys(overview.skillGaps).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Skill Gaps Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(overview.skillGaps).map(([skill, data]) => (
                    <div key={skill} className="space-y-1">
                      <SkillBar
                        label={skill}
                        value={(data.required / (data.required + data.missing)) * 100}
                        color={(data.required / (data.required + data.missing)) >= 0.7 ? "#10b981" : (data.required / (data.required + data.missing)) >= 0.5 ? "#f59e0b" : "#ef4444"}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="skills" className="space-y-4 mt-4">
          {heatmap && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Overall Skills Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(heatmap.overall).slice(0, 10).map(([skill, levels]) => (
                      <div key={skill} className="p-3 border rounded">
                        <div className="font-medium capitalize mb-2">{skill}</div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="text-gray-600">Beginner</div>
                            <div className="font-semibold">{levels.beginner}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Intermediate</div>
                            <div className="font-semibold">{levels.intermediate}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Advanced</div>
                            <div className="font-semibold">{levels.advanced}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Skills by Year</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(heatmap.byYear).map(([year, skills]) => (
                      <div key={year}>
                    <div className="font-medium mb-2">Year {year}</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(skills).slice(0, 5).map(([skill, levels]) => (
                        <Badge key={skill} variant="outline">
                          {skill} ({levels.advanced} adv)
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Student Leaderboard
              </CardTitle>
              <CardDescription>Ranked by CGPA and readiness</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-gray-600">No leaderboard data available</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((student, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium">{student.name}</div>
                          <div className="text-sm text-gray-600">{student.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{student.cgpa?.toFixed(2)}</div>
                        <div className="text-xs text-gray-600">{student.readiness}% readiness</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4 mt-4">
          {funnel && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Placement Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Total Students", value: funnel.totalStudents, pct: 100,          color: "#7c3aed" },
                      { label: "Eligible",       value: funnel.eligible,      pct: (funnel.eligible      / funnel.totalStudents) * 100, color: "#2563eb" },
                      { label: "Applied",        value: funnel.applied,       pct: (funnel.applied       / funnel.totalStudents) * 100, color: "#0891b2" },
                      { label: "Shortlisted",    value: funnel.shortlisted,   pct: (funnel.shortlisted   / funnel.totalStudents) * 100, color: "#d97706" },
                      { label: "Interviewed",    value: funnel.interviewed,   pct: (funnel.interviewed   / funnel.totalStudents) * 100, color: "#f59e0b" },
                      { label: "Offered",        value: funnel.offered,       pct: (funnel.offered       / funnel.totalStudents) * 100, color: "#10b981" },
                      { label: "Placed",         value: funnel.placed,        pct: (funnel.placed        / funnel.totalStudents) * 100, color: "#16a34a" },
                    ].map(step => (
                      <div key={step.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{step.label}</span>
                          <span className="text-muted-foreground font-semibold">{step.value}</span>
                        </div>
                        <SkillBar label="" value={Math.min(step.pct, 100)} color={step.color} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversion Rates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(funnel.conversionRates || {}).map(([stage, rate]) => (
                      <div key={stage} className="p-3 border rounded">
                        <div className="text-sm text-gray-600 capitalize">{stage.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="text-2xl font-bold">{String(rate)}%</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="companies" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Company Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companyPerformance.length === 0 ? (
                <p className="text-sm text-gray-600">No company performance data available</p>
              ) : (
                <div className="space-y-3">
                  {companyPerformance.map((company, idx) => (
                    <div key={idx} className="p-4 border rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">{company.companyId}</div>
                        <Badge>{company.accepted} placed</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <div className="text-gray-600">Offers</div>
                          <div className="font-semibold">{company.offers}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Accepted</div>
                          <div className="font-semibold text-green-600">{company.accepted}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Rejected</div>
                          <div className="font-semibold text-red-600">{company.rejected}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Avg Package</div>
                          <div className="font-semibold">${company.averagePackage}L</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
