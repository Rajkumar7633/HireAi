"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Users, 
  TrendingUp, 
  FileText, 
  Upload, 
  BarChart3, 
  GraduationCap,
  Building2,
  Bell,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  X
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
  const [collegeProfile, setCollegeProfile] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch college analytics data
      const analyticsResponse = await fetch("/api/college/analytics")
      const analyticsData = await analyticsResponse.json()
      
      if (analyticsData.analytics) {
        setStats({
          totalStudents: analyticsData.analytics.overview.totalStudents || 0,
          placedStudents: analyticsData.analytics.overview.totalPlaced || 0,
          placementRate: analyticsData.analytics.overview.placementRate || 0,
          avgPackage: analyticsData.analytics.overview.averagePackage || 0,
          upcomingDrives: analyticsData.analytics.overview.totalDrives || 0,
          activeRecruiters: analyticsData.analytics.overview.activePartnerships || 0
        })
      }

      // Fetch recent activities from API
      const activitiesResponse = await fetch("/api/college/activities")
      const activitiesData = await activitiesResponse.json()
      setRecentActivities(activitiesData.activities || [])

      // Fetch notifications
      const notificationsResponse = await fetch("/api/college/notifications")
      const notificationsData = await notificationsResponse.json()
      setNotifications(notificationsData.notifications || [])
      setUnreadCount(notificationsData.unreadCount || 0)

      // Fetch college profile for departments
      const profileResponse = await fetch("/api/college/profile")
      const profileData = await profileResponse.json()
      if (profileData.profile) {
        setCollegeProfile(profileData.profile)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/college/notifications/${notificationId}/read`, { method: "PUT" })
      setNotifications(notifications.map(n => n._id === notificationId ? { ...n, read: true } : n))
      setUnreadCount(Math.max(0, unreadCount - 1))
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch("/api/college/notifications/read-all", { method: "PUT" })
      setNotifications(notifications.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500"
      case "high": return "bg-orange-500"
      case "medium": return "bg-yellow-500"
      case "low": return "bg-blue-500"
      default: return "bg-gray-500"
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
      title: "Manage Campus Drives",
      description: "Organize and manage campus recruitment drives",
      icon: Building2,
      color: "bg-orange-500",
      link: "/dashboard/college/campus-drives"
    },
    {
      title: "View Placements",
      description: "Track student placements and offers",
      icon: CheckCircle2,
      color: "bg-green-500",
      link: "/dashboard/college/placements"
    },
    {
      title: "Interview Schedule",
      description: "Manage interview schedules and results",
      icon: Bell,
      color: "bg-purple-500",
      link: "/dashboard/college/interviews"
    },
    {
      title: "Partnerships",
      description: "Manage company partnerships",
      icon: Building2,
      color: "bg-indigo-500",
      link: "/dashboard/college/partnerships"
    },
    {
      title: "Analytics Dashboard",
      description: "Comprehensive placement analytics",
      icon: BarChart3,
      color: "bg-pink-500",
      link: "/dashboard/college/analytics"
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
      title: "Campus Drives",
      description: "Manage campus recruitment drives and schedules",
      icon: Building2,
      link: "/dashboard/college/campus-drives",
      status: "active"
    },
    {
      title: "Student Placements",
      description: "Track all student placements and offers",
      icon: CheckCircle2,
      link: "/dashboard/college/placements",
      status: "active"
    },
    {
      title: "Interview Management",
      description: "Schedule and manage interviews",
      icon: Bell,
      link: "/dashboard/college/interviews",
      status: "active"
    },
    {
      title: "Company Partnerships",
      description: "Manage recruiter partnerships",
      icon: Users,
      link: "/dashboard/college/partnerships",
      status: "active"
    },
    {
      title: "Analytics Dashboard",
      description: "Comprehensive placement analytics and reporting",
      icon: BarChart3,
      link: "/dashboard/college/analytics",
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between p-2 border-b">
                    <span className="font-medium">Notifications</span>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No notifications</div>
                    ) : (
                      notifications.slice(0, 5).map((notification) => (
                        <DropdownMenuItem
                          key={notification._id}
                          className="p-3 cursor-pointer"
                          onClick={() => !notification.read && markAsRead(notification._id)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className={`h-2 w-2 rounded-full mt-2 ${getPriorityColor(notification.priority)}`} />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{notification.title}</div>
                              <div className="text-xs text-gray-600 mt-1">{notification.message}</div>
                              <div className="text-xs text-gray-400 mt-1">{new Date(notification.createdAt).toLocaleString()}</div>
                            </div>
                            {!notification.read && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
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

        {/* Departments Overview */}
        {collegeProfile && collegeProfile.departments && collegeProfile.departments.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Departments Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collegeProfile.departments.map((dept: any, index: number) => (
                <Card key={index} className="border-2 hover:border-blue-300 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                    <CardDescription>{dept.branches.length} branches</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {dept.branches.map((branch: string, bIndex: number) => (
                        <Badge key={bIndex} variant="secondary">{branch}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
