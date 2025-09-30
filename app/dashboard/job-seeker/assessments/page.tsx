"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Shield,
  Camera,
  Mic,
  Monitor,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  FileText,
  Brain,
  Target,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface Assessment {
  _id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  totalPoints: number;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "Available" | "In Progress" | "Completed" | "Expired";
  score?: number;
  completedAt?: string;
  jobTitle: string;
  companyName: string;
  requiresProctoring: boolean;
  securityFeatures: string[];
  applicationId?: string;
  assignedAt?: string;
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssessments();
    const interval = setInterval(() => fetchAssessments(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAssessments = async (showRefreshing = true) => {
    try {
      if (showRefreshing) setRefreshing(true);
      setError(null);

      const response = await fetch("/api/assessments/my-assessments", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[v0] Fetched assessments:", data);
        // Rely solely on backend status to avoid false 'Completed' states
        setAssessments(data.assessments || []);

        if (showRefreshing && data.assessments?.length > 0) {
          toast({
            title: "Assessments Updated",
            description: `Found ${data.assessments.length} assessment(s)`,
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch assessments");
      }
    } catch (error) {
      console.error("[v0] Error fetching assessments:", error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to load assessments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAssessments(true);
  };

  const getStatusColor = (status: Assessment["status"]) => {
    switch (status) {
      case "Available":
        return "bg-green-500 text-white";
      case "In Progress":
        return "bg-blue-500 text-white";
      case "Completed":
        return "bg-gray-500 text-white";
      case "Expired":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getDifficultyColor = (difficulty: Assessment["difficulty"]) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 bg-green-50 border-green-200";
      case "Medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "Hard":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading assessments...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Assessments</h1>
          <p className="text-muted-foreground">
            Take secure, AI-proctored assessments for your job applications
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/job-seeker/applications">
              View Applications
            </Link>
          </Button>
        </div>
      </div>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Shield className="h-5 w-5" />
            Secure Assessment Environment
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-700">
          <p className="mb-3">
            Our assessments use advanced AI proctoring to ensure fairness and
            integrity:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span>Webcam monitoring</span>
            </div>
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span>Audio detection</span>
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span>Screen recording</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No Assessments Available
            </h3>
            <p className="text-muted-foreground mb-4">
              You don't have any assessments assigned yet. Apply for jobs to
              receive assessment invitations.
            </p>
            <Button asChild>
              <Link href="/dashboard/jobs">Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {assessments.map((assessment) => (
            <Card
              key={assessment._id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="text-xl">
                      {assessment.title}
                    </CardTitle>
                    <CardDescription>
                      {assessment.jobTitle} at {assessment.companyName}
                    </CardDescription>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getStatusColor(assessment.status)}>
                        {assessment.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={getDifficultyColor(assessment.difficulty)}
                      >
                        {assessment.difficulty}
                      </Badge>
                      {assessment.requiresProctoring && (
                        <Badge
                          variant="outline"
                          className="text-blue-600 bg-blue-50 border-blue-200"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Proctored
                        </Badge>
                      )}
                      {assessment.assignedAt && (
                        <Badge
                          variant="outline"
                          className="text-gray-600 bg-gray-50"
                        >
                          Assigned {getTimeAgo(assessment.assignedAt)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {assessment.score && (
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {assessment.score}%
                      </div>
                      <div className="text-sm text-muted-foreground">Score</div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {assessment.description}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{assessment.durationMinutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{assessment.totalQuestions} questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span>{assessment.totalPoints} points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                    <span>{assessment.difficulty}</span>
                  </div>
                </div>

                {assessment.securityFeatures.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Security Features
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {assessment.securityFeatures.map((feature, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    {assessment.status === "Completed" &&
                      assessment.completedAt && (
                        <span>
                          Completed on{" "}
                          {new Date(
                            assessment.completedAt
                          ).toLocaleDateString()}
                        </span>
                      )}
                    {assessment.status === "Available" && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Ready to start
                      </span>
                    )}
                    {assessment.status === "Expired" && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        Assessment expired
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {assessment.status === "Available" && (
                      <Button
                        asChild
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        <Link
                          href={`/dashboard/job-seeker/assessments/${assessment._id}/take`}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Assessment
                        </Link>
                      </Button>
                    )}
                    {assessment.status === "In Progress" && (
                      <Button asChild variant="outline">
                        <Link
                          href={`/dashboard/job-seeker/assessments/${assessment._id}/take`}
                        >
                          Continue Assessment
                        </Link>
                      </Button>
                    )}
                    {assessment.status === "Completed" && (
                      <Button asChild variant="outline">
                        <Link
                          href={`/dashboard/job-seeker/assessments/${assessment._id}/results`}
                        >
                          View Results
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
