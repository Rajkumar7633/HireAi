"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface AssessmentStats {
  totalAssigned: number;
  completed: number;
  inProgress: number;
  pending: number;
  averageScore: number;
  completionRate: number;
}

interface RecentActivity {
  id: string;
  type: "assignment" | "completion" | "start";
  candidateName: string;
  assessmentTitle: string;
  timestamp: string;
  score?: number;
}

export default function AssessmentStatusTracker() {
  const [stats, setStats] = useState<AssessmentStats>({
    totalAssigned: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    averageScore: 0,
    completionRate: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();

    // Set up real-time updates
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentActivity();
    }, 15000); // Update every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/assessments/stats", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch("/api/assessments/activity", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activity || []);
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  };

  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "assignment":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "completion":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "start":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assigned
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssigned}</div>
            <p className="text-xs text-muted-foreground">
              Assessments assigned to candidates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completionRate.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Currently taking assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Across all completed assessments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Progress</CardTitle>
          <CardDescription>
            Real-time overview of assessment completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Completion Progress</span>
                <span>
                  {stats.completed}/{stats.totalAssigned}
                </span>
              </div>
              <Progress value={stats.completionRate} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.inProgress}
                </div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {stats.pending}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Live updates on assessment activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No recent activity
              </p>
            ) : (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {activity.candidateName}
                      {activity.type === "assignment" && " was assigned "}
                      {activity.type === "completion" && " completed "}
                      {activity.type === "start" && " started "}
                      {activity.assessmentTitle}
                    </p>
                    {activity.score && (
                      <p className="text-xs text-muted-foreground">
                        Score: {activity.score}%
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
