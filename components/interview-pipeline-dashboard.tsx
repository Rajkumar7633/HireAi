"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Clock,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  TrendingUp,
  Star,
} from "lucide-react";
import { format } from "date-fns";

interface InterviewStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  missed: number;
  averageRating: number;
  completionRate: number;
}

interface InterviewPipelineProps {
  userRole: "recruiter" | "job_seeker";
}

export function InterviewPipelineDashboard({
  userRole,
}: InterviewPipelineProps) {
  const [stats, setStats] = useState<InterviewStats>({
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    missed: 0,
    averageRating: 0,
    completionRate: 0,
  });
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);
  const [recentInterviews, setRecentInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviewData();
  }, []);

  const fetchInterviewData = async () => {
    try {
      const response = await fetch("/api/video-interviews");
      if (response.ok) {
        const data = await response.json();
        const interviews = data.interviews || [];

        if (!Array.isArray(interviews)) {
          console.warn("Invalid interviews data received:", interviews);
          return;
        }

        const computeStatus = (i: any) => {
          const now = Date.now();
          const start = new Date(i.scheduledDate).getTime();
          const durationMs = (i.duration || 60) * 60 * 1000;
          const graceMs = 15 * 60 * 1000; // match list page
          const endWindow = start + durationMs + graceMs;
          const hasHost = !!i.hostJoinedAt;
          const hasCand = !!i.candidateJoinedAt;
          const started = !!i.startedAt || hasHost || hasCand;
          const ended = !!i.endedAt;
          if (ended) return "completed";
          if (started && now < endWindow) return "in-progress";
          if (now < start && !started) return "scheduled";
          if (now >= endWindow && !started) return "missed";
          if (now >= endWindow && started && !ended) return "expired";
          return i.status || "scheduled";
        };

        const normalized = interviews.map((i: any) => ({ ...i, status: computeStatus(i) }));

        const total = normalized.length;
        const scheduled = normalized.filter((i: any) => i.status === "scheduled").length;
        const inProgress = normalized.filter((i: any) => i.status === "in-progress").length;
        const completed = normalized.filter((i: any) => i.status === "completed").length;
        const cancelled = normalized.filter((i: any) => i.status === "cancelled").length;
        const missed = normalized.filter((i: any) => i.status === "missed").length;

        const completedWithRating = normalized.filter(
          (i: any) => i.status === "completed" && i.rating
        );
        const averageRating =
          completedWithRating.length > 0
            ? completedWithRating.reduce(
                (sum: number, i: any) => sum + i.rating,
                0
              ) / completedWithRating.length
            : 0;

        const completionRate = total > 0 ? (completed / total) * 100 : 0;

        setStats({
          total,
          scheduled,
          inProgress,
          completed,
          cancelled,
          missed,
          averageRating,
          completionRate,
        });

        const now = new Date();
        const upcoming = normalized
          .filter(
            (i: any) =>
              new Date(i.scheduledDate) > now && i.status === "scheduled"
          )
          .sort(
            (a: any, b: any) =>
              new Date(a.scheduledDate).getTime() -
              new Date(b.scheduledDate).getTime()
          )
          .slice(0, 5);

        const recent = normalized
          .filter(
            (i: any) =>
              i.status === "completed" ||
              i.status === "cancelled" ||
              i.status === "missed" ||
              i.status === "expired"
          )
          .sort(
            (a: any, b: any) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
          .slice(0, 5);

        setUpcomingInterviews(upcoming);
        setRecentInterviews(recent);
      } else {
        console.error("Failed to fetch interviews:", response.status);
      }
    } catch (error) {
      console.error("Error fetching interview data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Calendar className="w-4 h-4" />;
      case "in-progress":
        return <Play className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      case "missed":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "missed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Interviews
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <Video className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.scheduled}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Success Rate
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.completionRate.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <Progress value={stats.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Rating (for recruiters) */}
      {userRole === "recruiter" && stats.averageRating > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Interview Rating
                </p>
                <div className="flex items-center mt-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-5 h-5 ${
                          star <= stats.averageRating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-2 text-lg font-semibold">
                    {stats.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Interviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Upcoming Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingInterviews.length > 0 ? (
              <div className="space-y-4">
                {upcomingInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {userRole === "recruiter"
                          ? interview.candidateName
                          : interview.position}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {format(
                          new Date(interview.scheduledDate),
                          "MMM dd, yyyy 'at' hh:mm a"
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {interview.duration} minutes
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(interview.status)}>
                        {getStatusIcon(interview.status)}
                        <span className="ml-1">{interview.status}</span>
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Video className="w-4 h-4 mr-1" />
                        Join
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No upcoming interviews scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Interviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Interviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentInterviews.length > 0 ? (
              <div className="space-y-4">
                {recentInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {userRole === "recruiter"
                          ? interview.candidateName
                          : interview.position}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {format(
                          new Date(interview.scheduledDate),
                          "MMM dd, yyyy"
                        )}
                      </p>
                      {interview.rating && (
                        <div className="flex items-center mt-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= interview.rating
                                    ? "text-yellow-400 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="ml-1 text-xs text-gray-600">
                            {interview.rating}/5
                          </span>
                        </div>
                      )}
                    </div>
                    <Badge className={getStatusColor(interview.status)}>
                      {getStatusIcon(interview.status)}
                      <span className="ml-1">{interview.status}</span>
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No recent interviews</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
