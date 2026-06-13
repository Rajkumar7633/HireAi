"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SkillBar } from "@/components/ui/charts"
import { Badge } from "@/components/ui/badge"
import { Loader2, BarChart3, TrendingUp, Users, Clock, Target, Award } from "lucide-react"

interface Analytics {
  overview: {
    totalJobs: number
    totalApplications: number
    activeJobs: number
    totalViews: number
  }
  funnel: {
    applied: number
    shortlisted: number
    test: number
    interview: number
    offer: number
    hired: number
    rejected: number
  }
  timeToHire: {
    average: number
  }
  conversionRates: {
    applicationToShortlist: string
    shortlistToInterview: string
    interviewToOffer: string
    offerToHire: string
    overallHireRate: string
  }
  byJob: Array<{
    jobTitle: string
    applications: number
    hired: number
    views: number
  }>
}

export default function AdvancedAnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [period, setPeriod] = useState("30d")
  const [metric, setMetric] = useState("applications")

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/analytics/advanced?recruiter-dashboard=true")
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
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
          Advanced Analytics Dashboard
        </h1>
        <p className="text-gray-600">Comprehensive analytics for data-driven hiring decisions</p>
      </div>

      {analytics && (
        <>
          {/* Overview Stats */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.overview.totalJobs}</div>
                <div className="text-sm text-gray-600">{analytics.overview.activeJobs} active</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.overview.totalApplications}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.overview.totalViews}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg Time to Hire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.timeToHire.average}</div>
                <div className="text-sm text-gray-600">days</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="funnel" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="funnel">Hiring Funnel</TabsTrigger>
              <TabsTrigger value="conversion">Conversion Rates</TabsTrigger>
              <TabsTrigger value="jobs">Job Performance</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="funnel" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Hiring Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Applied", value: analytics.funnel.applied, pct: 100, color: "#7c3aed" },
                      { label: "Shortlisted", value: analytics.funnel.shortlisted, pct: (analytics.funnel.shortlisted / analytics.funnel.applied) * 100, color: "#2563eb" },
                      { label: "Test", value: analytics.funnel.test, pct: (analytics.funnel.test / analytics.funnel.applied) * 100, color: "#0891b2" },
                      { label: "Interview", value: analytics.funnel.interview, pct: (analytics.funnel.interview / analytics.funnel.applied) * 100, color: "#f59e0b" },
                      { label: "Offer", value: analytics.funnel.offer, pct: (analytics.funnel.offer / analytics.funnel.applied) * 100, color: "#10b981" },
                      { label: "Hired", value: analytics.funnel.hired, pct: (analytics.funnel.hired / analytics.funnel.applied) * 100, color: "#16a34a" },
                    ].map((s) => (
                      <SkillBar key={s.label} label={`${s.label}: ${s.value}`} value={isNaN(s.pct) ? 0 : s.pct} color={s.color} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conversion" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    Conversion Rates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded">
                      <div className="text-sm text-gray-600">Application to Shortlist</div>
                      <div className="text-3xl font-bold">{analytics.conversionRates.applicationToShortlist}%</div>
                    </div>
                    <div className="p-4 border rounded">
                      <div className="text-sm text-gray-600">Shortlist to Interview</div>
                      <div className="text-3xl font-bold">{analytics.conversionRates.shortlistToInterview}%</div>
                    </div>
                    <div className="p-4 border rounded">
                      <div className="text-sm text-gray-600">Interview to Offer</div>
                      <div className="text-3xl font-bold">{analytics.conversionRates.interviewToOffer}%</div>
                    </div>
                    <div className="p-4 border rounded">
                      <div className="text-sm text-gray-600">Offer to Hire</div>
                      <div className="text-3xl font-bold">{analytics.conversionRates.offerToHire}%</div>
                    </div>
                    <div className="p-4 border rounded md:col-span-2 bg-blue-50">
                      <div className="text-sm text-gray-600">Overall Hire Rate</div>
                      <div className="text-4xl font-bold text-blue-600">{analytics.conversionRates.overallHireRate}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="jobs" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Job Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.byJob.map((job, idx) => (
                      <div key={idx} className="p-4 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{job.jobTitle}</div>
                          <Badge>{job.hired} hired</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">Applications</div>
                            <div className="font-semibold">{job.applications}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Views</div>
                            <div className="font-semibold">{job.views}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Hire Rate</div>
                            <div className="font-semibold text-green-600">
                              {job.applications > 0 ? ((job.hired / job.applications) * 100).toFixed(1) : 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Trends Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={metric} onValueChange={setMetric}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="applications">Applications</SelectItem>
                        <SelectItem value="views">Job Views</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Time series data visualization would be integrated here with a charting library like Recharts or Chart.js
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
