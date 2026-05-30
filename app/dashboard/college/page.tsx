"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  TrendingUp, 
  FileText, 
  Upload, 
  BarChart3, 
  GraduationCap,
  Building2,
  Settings,
  Bell,
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

export default function CollegeDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalStudents: 0,
    placedStudents: 0,
    placementRate: 0,
    avgPackage: 0,
    upcomingDrives: 0,
    activeRecruiters: 0
  })
  const [recentActivities, setRecentActivities] = useState<any[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch analytics data
      const analyticsResponse = await fetch("/api/placement-analytics")
      const analyticsData = await analyticsResponse.json()
      
      if (analyticsData.analytics) {
        setStats({
          totalStudents: analyticsData.analytics.totalStudents || 0,
          placedStudents: analyticsData.analytics.placedStudents || 0,
          placementRate: analyticsData.analytics.placementRate || 0,
          avgPackage: analyticsData.analytics.avgPackage || 0,
          upcomingDrives: analyticsData.analytics.upcomingDrives || 0,
          activeRecruiters: analyticsData.analytics.activeRecruiters || 0
        })
      }

      // Mock recent activities
      setRecentActivities([
        { id: 1, type: "placement", message: "Google Drive - 15 students selected", time: "2 hours ago", status: "success" },
        { id: 2, type: "alert", message: "3 students below 6 CGPA identified", time: "5 hours ago", status: "warning" },
        { id: 3, type: "upload", message: "50 new students imported via CSV", time: "1 day ago", status: "success" },
        { id: 4, type: "drive", message: "Microsoft campus drive scheduled for next week", time: "2 days ago", status: "info" }
      ])
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: "Add New Student",
      description: "Register a new student to the placement cell",
      icon: Users,
      color: "bg-blue-500",
      link: "/dashboard/college/student-tracking"
    },
    {
      title: "Import Students",
      description: "Bulk import students from CSV file",
      icon: Upload,
      color: "bg-green-500",
      link: "/dashboard/college/bulk-operations"
    },
    {
      title: "View Analytics",
      description: "Check placement statistics and trends",
      icon: BarChart3,
      color: "bg-purple-500",
      link: "/dashboard/college/placement-analytics"
    },
    {
      title: "Schedule Drive",
      description: "Organize a new campus recruitment drive",
      icon: Building2,
      color: "bg-orange-500",
      link: "/dashboard/college/drives"
    }
  ]

  const features = [
    {
      title: "Student Tracking",
      description: "Track student progress from 1st year through placement",
      icon: GraduationCap,
      link: "/dashboard/college/student-tracking",
      status: "active"
    },
    {
      title: "Placement Analytics",
      description: "Comprehensive analytics for data-driven decisions",
      icon: TrendingUp,
      link: "/dashboard/college/placement-analytics",
      status: "active"
    },
    {
      title: "Bulk Operations",
      description: "Import, filter, and manage students in bulk",
      icon: FileText,
      link: "/dashboard/college/bulk-operations",
      status: "active"
    },
    {
      title: "Referral Program",
      description: "Manage employee referrals and bonuses",
      icon: Users,
      link: "/dashboard/referrals",
      status: "active"
    },
    {
      title: "Calendar Integration",
      description: "Sync drives and interviews with your calendar",
      icon: Bell,
      link: "/dashboard/calendar",
      status: "active"
    },
    {
      title: "Export Reports",
      description: "Export data in CSV or PDF format",
      icon: FileText,
      link: "/dashboard/export",
      status: "active"
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                C
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">College Dashboard</h1>
                <p className="text-sm text-gray-600">Placement Cell Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                C
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Placement Cell Dashboard</h2>
          <p className="text-gray-600">Manage your college's placement activities efficiently</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-blue-100 mt-1">Registered students</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Placed Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.placedStudents}</div>
              <p className="text-xs text-green-100 mt-1">Successfully placed</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Placement Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.placementRate}%</div>
              <p className="text-xs text-purple-100 mt-1">Overall placement</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-100">Avg Package</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">₹{stats.avgPackage}L</div>
              <p className="text-xs text-orange-100 mt-1">Average package</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-pink-100">Upcoming Drives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.upcomingDrives}</div>
              <p className="text-xs text-pink-100 mt-1">Scheduled drives</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-indigo-100">Active Recruiters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.activeRecruiters}</div>
              <p className="text-xs text-indigo-100 mt-1">Partner companies</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.link}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-300">
                  <CardHeader>
                    <div className={`${action.color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-2`}>
                      <action.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Placement Cell Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <Link key={index} href={feature.link}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="bg-blue-100 p-3 rounded-xl group-hover:bg-blue-200 transition-colors">
                        <feature.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <Badge variant={feature.status === "active" ? "default" : "secondary"}>
                        {feature.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-blue-600 text-sm font-medium group-hover:underline">
                      Access Feature <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activities</h3>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className={`p-2 rounded-full ${
                      activity.status === "success" ? "bg-green-100" :
                      activity.status === "warning" ? "bg-yellow-100" :
                      "bg-blue-100"
                    }`}>
                      {activity.status === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : activity.status === "warning" ? (
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <Bell className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{activity.message}</p>
                      <p className="text-sm text-gray-600">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
