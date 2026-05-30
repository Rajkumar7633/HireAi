"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Users, TrendingUp, AlertTriangle, CheckCircle, GraduationCap } from "lucide-react"

interface StudentTracking {
  _id: string
  studentId: { _id: string; name: string; email: string }
  academicInfo: {
    currentYear: number
    branch: string
    cgpa: number
    batch: string
  }
  placementReadiness: {
    interviewReadiness: {
      technical: number
      communication: number
      problemSolving: number
      overall: number
    }
  }
  alerts: Array<{ type: string; message: string; severity: string; resolved: boolean }>
  recommendations: Array<{ category: string; action: string; priority: string; status: string }>
}

interface Analytics {
  totalStudents: number
  byYear: Record<string, number>
  byBranch: Record<string, number>
  averageCGPA: number
  placementRate: number
  readinessDistribution: { high: number; medium: number; low: number }
  atRiskStudents: Array<{ name: string; cgpa: number; readiness: number }>
}

export default function StudentTrackingPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<StudentTracking[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [selectedYear, setSelectedYear] = useState<string>("all")
  const [selectedBranch, setSelectedBranch] = useState<string>("all")

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedBranch])

  const fetchData = async () => {
    setLoading(true)
    try {
      const collegeId = "your-college-id" // Replace with actual college ID from session
      const params = new URLSearchParams()
      if (selectedYear !== "all") params.append("year", selectedYear)
      if (selectedBranch !== "all") params.append("branch", selectedBranch)

      const [studentsRes, analyticsRes] = await Promise.all([
        fetch(`/api/student-tracking?collegeId=${collegeId}&${params}`),
        fetch(`/api/student-tracking?collegeId=${collegeId}&analytics=true`)
      ])

      const studentsData = await studentsRes.json()
      const analyticsData = await analyticsRes.json()

      if (studentsData.success) {
        setStudents(studentsData.trackingRecords)
      }

      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getReadinessColor = (score: number) => {
    if (score >= 70) return "text-green-600"
    if (score >= 50) return "text-yellow-600"
    return "text-red-600"
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical": return "bg-red-100 text-red-800"
      case "Warning": return "bg-yellow-100 text-yellow-800"
      case "Info": return "bg-blue-100 text-blue-800"
      default: return "bg-gray-100 text-gray-800"
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
          <GraduationCap className="w-8 h-8 text-blue-600" />
          Multi-Year Student Tracking
        </h1>
        <p className="text-gray-600">Track student progress from 1st year through placement</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Academic Year</Label>
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
              <Label htmlFor="branch">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  <SelectItem value="CSE">Computer Science</SelectItem>
                  <SelectItem value="ECE">Electronics</SelectItem>
                  <SelectItem value="EEE">Electrical</SelectItem>
                  <SelectItem value="MECH">Mechanical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Average CGPA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.averageCGPA}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Placement Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{analytics.placementRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">At-Risk Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{analytics.atRiskStudents.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="at-risk">At-Risk Students</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Student List</CardTitle>
              <CardDescription>View and manage student tracking records</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <Alert>
                  <AlertDescription>No students found matching the criteria</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {students.map((student) => (
                    <div key={student._id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium">{student.studentId.name}</div>
                          <div className="text-sm text-gray-600">{student.studentId.email}</div>
                        </div>
                        <div className="flex gap-2">
                          <Badge>Year {student.academicInfo.currentYear}</Badge>
                          <Badge variant="outline">{student.academicInfo.branch}</Badge>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">CGPA</div>
                          <div className="font-semibold">{student.academicInfo.cgpa?.toFixed(2) || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">Readiness Score</div>
                          <div className={`font-semibold ${getReadinessColor(student.placementReadiness?.interviewReadiness?.overall || 0)}`}>
                            {student.placementReadiness?.interviewReadiness?.overall || 0}%
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Active Alerts</div>
                          <div className="font-semibold">
                            {student.alerts.filter(a => !a.resolved).length}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          {analytics && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Readiness Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>High Readiness (70%+)</span>
                      <span className="font-semibold">{analytics.readinessDistribution.high}</span>
                    </div>
                    <Progress value={(analytics.readinessDistribution.high / analytics.totalStudents) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Medium Readiness (50-70%)</span>
                      <span className="font-semibold">{analytics.readinessDistribution.medium}</span>
                    </div>
                    <Progress value={(analytics.readinessDistribution.medium / analytics.totalStudents) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Low Readiness (&lt;50%)</span>
                      <span className="font-semibold">{analytics.readinessDistribution.low}</span>
                    </div>
                    <Progress value={(analytics.readinessDistribution.low / analytics.totalStudents) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution by Year</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.byYear).map(([year, count]) => (
                      <div key={year} className="flex items-center justify-between">
                        <span>Year {year}</span>
                        <Badge>{count} students</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Distribution by Branch</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.byBranch).map(([branch, count]) => (
                      <div key={branch} className="flex items-center justify-between">
                        <span>{branch}</span>
                        <Badge>{count} students</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="at-risk" className="space-y-4 mt-4">
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  At-Risk Students
                </CardTitle>
                <CardDescription>Students requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.atRiskStudents.length === 0 ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>No at-risk students found</AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {analytics.atRiskStudents.map((student, idx) => (
                      <div key={idx} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{student.name}</div>
                          <Badge variant="destructive">Critical</Badge>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600">CGPA</div>
                            <div className="font-semibold text-red-600">{student.cgpa?.toFixed(2) || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Readiness</div>
                            <div className="font-semibold text-red-600">{student.readiness}%</div>
                          </div>
                          <div>
                            <div className="text-gray-600">Critical Alerts</div>
                            <div className="font-semibold text-red-600">{student.criticalAlerts}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
