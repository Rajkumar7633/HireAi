"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Eye, Clock, FileText, Shield } from "lucide-react";
import { useSession } from "@/hooks/use-session";

interface Assessment {
  _id: string;
  title: string;
  description: string;
  durationMinutes: number;
  questions: any[];
  securityFeatures: string[];
  difficulty: string;
  totalPoints: number;
}

export default function PreviewAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;
  const { toast } = useToast();
  const { hasSession, isLoading: sessionLoading, sessionRole } = useSession();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionLoading && !hasSession) {
      router.push("/auth/login");
      return;
    }

    if (!sessionLoading && hasSession && sessionRole !== "recruiter") {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }

    if (assessmentId && hasSession && sessionRole === "recruiter") {
      fetchAssessment();
    }
  }, [assessmentId, hasSession, sessionLoading, sessionRole]);

  const fetchAssessment = async () => {
    try {
      console.log("[v0] Fetching assessment:", assessmentId);
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      console.log("[v0] Assessment fetch response status:", response.status);
      console.log(
        "[v0] Assessment fetch response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (response.ok) {
        const data = await response.json();
        console.log("[v0] Assessment data received:", data);
        if (data.success && data.assessment) {
          setAssessment(data.assessment);
        } else {
          throw new Error("Invalid assessment data structure");
        }
      } else {
        const errorData = await response.json();
        console.log("[v0] Assessment fetch error:", errorData);
        throw new Error(errorData.message || "Failed to fetch assessment");
      }
    } catch (error) {
      console.error("[v0] Assessment fetch error:", error);
      toast({
        title: "Error",
        description: "Failed to load assessment preview.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Checking authentication...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading assessment preview...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Assessment Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The assessment you're looking for doesn't exist or you don't have
              permission to view it.
            </p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Eye className="h-8 w-8" />
            Assessment Preview
          </h1>
          <p className="text-muted-foreground">
            Preview how candidates will see this assessment
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{assessment.title}</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">{assessment.difficulty}</Badge>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {assessment.durationMinutes} minutes
            </Badge>
            <Badge variant="outline">
              <FileText className="h-3 w-3 mr-1" />
              {assessment.questions.length} questions
            </Badge>
            <Badge variant="outline">{assessment.totalPoints} points</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{assessment.description}</p>
          </div>

          {assessment.securityFeatures.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Security Features
              </h3>
              <div className="flex flex-wrap gap-2">
                {assessment.securityFeatures.map((feature, index) => (
                  <Badge key={index} variant="secondary">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-4">Questions Preview</h3>
            <div className="space-y-4">
              {assessment.questions.map((question, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Q{index + 1}</Badge>
                      <Badge variant="secondary">
                        {question.type?.replace("_", " ")}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {question.points} pts
                      </span>
                    </div>
                    <p className="font-medium mb-3">{question.questionText}</p>
                    {question.type === "multiple_choice" &&
                      question.options && (
                        <div className="space-y-2">
                          {question.options.map(
                            (option: string, optionIndex: number) => (
                              <div
                                key={optionIndex}
                                className="flex items-center gap-2"
                              >
                                <div className="w-4 h-4 border border-gray-300 rounded-full"></div>
                                <span>{option}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    {question.type === "short_answer" && (
                      <div className="border border-gray-300 rounded p-3 bg-gray-50">
                        <p className="text-sm text-muted-foreground">
                          Text input area for candidate response
                        </p>
                      </div>
                    )}
                    {question.type === "code_snippet" && (
                      <div className="border border-gray-300 rounded p-3 bg-gray-900 text-green-400 font-mono">
                        <p className="text-sm">
                          // Code editor area for candidate response
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
