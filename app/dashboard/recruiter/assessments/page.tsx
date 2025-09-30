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
  Plus,
  Shield,
  Users,
  Clock,
  FileText,
  Eye,
  Edit,
  BarChart3,
  Settings,
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
  status: "Active" | "Draft" | "Archived";
  requiresProctoring: boolean;
  securityFeatures: string[];
  createdAt: string;
  candidatesAssigned: number;
  candidatesCompleted: number;
}

export default function AssessmentsManagementPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssessments();
  }, [refreshTrigger]);

  const fetchAssessments = async () => {
    try {
      const response = await fetch("/api/assessments");
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.assessments || []);
      } else {
        throw new Error("Failed to fetch assessments");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load assessments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshAssessments = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    const handleFocus = () => {
      refreshAssessments();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const getStatusColor = (status: Assessment["status"]) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Draft":
        return "bg-yellow-500";
      case "Archived":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getDifficultyColor = (difficulty: Assessment["difficulty"]) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 bg-green-50";
      case "Medium":
        return "text-yellow-600 bg-yellow-50";
      case "Hard":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const handlePreview = (assessmentId: string) => {
    window.open(
      `/dashboard/recruiter/assessments/${assessmentId}/preview`,
      "_blank"
    );
  };

  const handleEdit = (assessmentId: string) => {
    window.location.href = `/dashboard/recruiter/assessments/${assessmentId}/edit`;
  };

  const handleAnalytics = (assessmentId: string) => {
    window.location.href = `/dashboard/recruiter/assessments/${assessmentId}/analytics`;
  };

  const handleAssign = (assessmentId: string) => {
    sessionStorage.setItem("refreshAssessments", "true");
    window.location.href = `/dashboard/recruiter/assessments/${assessmentId}/assign`;
  };

  useEffect(() => {
    const shouldRefresh = sessionStorage.getItem("refreshAssessments");
    if (shouldRefresh === "true") {
      sessionStorage.removeItem("refreshAssessments");
      refreshAssessments();
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading assessments...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assessment Management</h1>
          <p className="text-muted-foreground">
            Create and manage AI-proctored assessments for your candidates
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshAssessments}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <Link href="/dashboard/recruiter/assessments/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Assessment
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Assessments
                </p>
                <p className="text-2xl font-bold">{assessments.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Assessments
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {assessments.filter((a) => a.status === "Active").length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Candidates
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {assessments.reduce(
                    (sum, a) => sum + (a.candidatesAssigned || 0),
                    0
                  )}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Completion Rate
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {(() => {
                    const totalAssigned = assessments.reduce(
                      (sum, a) => sum + (a.candidatesAssigned || 0),
                      0
                    );
                    const totalCompleted = assessments.reduce(
                      (sum, a) => sum + (a.candidatesCompleted || 0),
                      0
                    );
                    return totalAssigned > 0
                      ? Math.round((totalCompleted / totalAssigned) * 100)
                      : 0;
                  })()}
                  %
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              No Assessments Created
            </h3>
            <p className="text-muted-foreground mb-4">
              Create your first AI-proctored assessment to start evaluating
              candidates.
            </p>
            <Button asChild>
              <Link href="/dashboard/recruiter/assessments/create">
                Create Assessment
              </Link>
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
                    <CardDescription>{assessment.description}</CardDescription>
                    <div className="flex items-center gap-2">
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
                          className="text-blue-600 bg-blue-50"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          AI Proctored
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {assessment.candidatesCompleted || 0}/
                      {assessment.candidatesAssigned || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Completed
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <span>{assessment.totalPoints} points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{assessment.candidatesAssigned || 0} assigned</span>
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
                    Created on{" "}
                    {new Date(assessment.createdAt).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(assessment._id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAnalytics(assessment._id)}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(assessment._id)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssign(assessment._id)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Assign
                    </Button>
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
