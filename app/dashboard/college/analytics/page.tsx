"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SkillBar } from "@/components/ui/charts"
import { Loader2, BarChart3, TrendingUp, Users, DollarSign, Calendar, Download, Building2 } from "lucide-react"

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any>(null)
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")

  useEffect(() => {
    fetchAnalytics()
  }, [selectedYear, selectedDepartment])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedYear !== "all") params.append("year", selectedYear)
      if (selectedDepartment !== "all") params.append("department", selectedDepartment)

      const response = await fetch(`/api/college/analytics?${params}`)
      const data = await response.json()
      if (data.analytics) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedYear !== "all") params.append("year", selectedYear)
      if (selectedDepartment !== "all") params.append("department", selectedDepartment)

      const response = await fetch(`/api/college/analytics/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'college-analytics.csv'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error("Failed to export analytics:", error)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Placement Analytics
          </h1>
          <p className="text-gray-600">Comprehensive placement statistics and insights</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Academic Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                  <SelectItem value="5">5th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Computer Science">Computer Science</SelectItem>
                  <SelectItem value="Electronics">Electronics</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Mechanical">Mechanical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {analytics && (
        <>
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-100">Total Students</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.overview.totalStudents}</div>
                <p className="text-xs text-blue-100 mt-1">Registered students</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-100">Total Placed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.overview.totalPlaced}</div>
                <p className="text-xs text-green-100 mt-1">Successfully placed</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-100">Placement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{analytics.overview.placementRate}%</div>
                <p className="text-xs text-purple-100 mt-1">Success rate</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-100">Avg Package</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">₹{analytics.overview.averagePackage}L</div>
                <p className="text-xs text-orange-100 mt-1">Average package</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="placement">Placement Status</TabsTrigger>
              <TabsTrigger value="readiness">Readiness</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      By Department
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analytics.byDepartment).map(([dept, count]) => (
                        <div key={dept} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{dept}</span>
                            <span className="text-gray-600">{count} students</span>
                          </div>
                          <SkillBar label="" value={(count / analytics.overview.totalStudents) * 100} color="#7c3aed" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      By Branch
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(analytics.byBranch).map(([branch, count]) => (
                        <div key={branch} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{branch}</span>
                            <span className="text-gray-600">{count} students</span>
                          </div>
                          <SkillBar label="" value={(count / analytics.overview.totalStudents) * 100} color="#7c3aed" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="placement" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Placement Status Distribution</CardTitle>
                </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{analytics.placementStatus.placed}</div>
                    <div className="text-sm text-gray-600">Placed</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600">{analytics.placementStatus.inProcess}</div>
                    <div className="text-sm text-gray-600">In Process</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl font-bold text-gray-600">{analytics.placementStatus.notPlaced}</div>
                    <div className="text-sm text-gray-600">Not Placed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="readiness" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Placement Readiness Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{analytics.readinessDistribution.high}</div>
                      <div className="text-sm text-gray-600">High Readiness</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-3xl font-bold text-yellow-600">{analytics.readinessDistribution.medium}</div>
                      <div className="text-sm text-gray-600">Medium Readiness</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-3xl font-bold text-red-600">{analytics.readinessDistribution.low}</div>
                      <div className="text-sm text-gray-600">Low Readiness</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">At-Risk Students</CardTitle>
                  <CardDescription>Students who need immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.atRiskStudents.slice(0, 10).map((student, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <div className="font-medium">Student ID: {student.studentId}</div>
                          <div className="text-sm text-gray-600">{student.department} - {student.branch}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-red-600">CGPA: {student.cgpa}</div>
                          <div className="text-sm text-gray-600">Readiness: {student.readiness}%</div>
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
                    <TrendingUp className="h-5 w-5" />
                    Monthly Placement Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.trends.monthlyPlacements.map((trend, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{trend.month}</span>
                          <span className="text-gray-600">{trend.count} placements</span>
                        </div>
                        <SkillBar label="" value={(trend.count / (analytics.overview.totalPlaced || 1)) * 100} color="#16a34a" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Monthly Drive Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.trends.monthlyDrives.map((trend, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{trend.month}</span>
                          <span className="text-gray-600">{trend.count} drives</span>
                        </div>
                        <SkillBar label="" value={(trend.count / (analytics.overview.totalDrives || 1)) * 100} color="#2563eb" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Top Packages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.topPackages.slice(0, 10).map((pkg, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <div className="font-medium">{pkg.studentName}</div>
                          <div className="text-sm text-gray-600">{pkg.company} - {pkg.jobTitle}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">₹{pkg.package}L</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Drive Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.drivePerformance.map((drive, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <div className="font-medium">{drive.title}</div>
                          <div className="text-sm text-gray-600">{new Date(drive.date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">{drive.registeredCount} registered</div>
                          <div className="text-sm font-medium text-green-600">{drive.selectedCount} selected ({drive.placementRate}%)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
