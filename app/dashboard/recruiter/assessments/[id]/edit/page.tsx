"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Edit, Save } from "lucide-react";
import { useSession } from "@/hooks/use-session";

export default function EditAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;
  const { toast } = useToast();
  const { hasSession, isLoading: sessionLoading, sessionRole } = useSession();

  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      console.log("[v0] Fetching assessment for edit:", assessmentId);
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
        console.log("[v0] Assessment data received for edit:", data);
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
        description: "Failed to load assessment for editing.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log("[v0] Saving assessment:", assessment);
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(assessment),
      });

      console.log("[v0] Assessment save response status:", response.status);

      if (response.ok) {
        toast({
          title: "Assessment Updated",
          description: "Your assessment has been updated successfully.",
        });
        router.push("/dashboard/recruiter/assessments");
      } else {
        const errorData = await response.json();
        console.log("[v0] Assessment save error:", errorData);
        throw new Error(errorData.message || "Failed to update assessment");
      }
    } catch (error) {
      console.error("[v0] Assessment save error:", error);
      toast({
        title: "Error",
        description: "Failed to update assessment.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
        <p className="ml-2">Loading assessment...</p>
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
              The assessment you're trying to edit doesn't exist or you don't
              have permission to edit it.
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
            <Edit className="h-8 w-8" />
            Edit Assessment
          </h1>
          <p className="text-muted-foreground">
            Modify assessment details and settings
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assessment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={assessment.title || ""}
              onChange={(e) =>
                setAssessment({ ...assessment, title: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={assessment.description || ""}
              onChange={(e) =>
                setAssessment({ ...assessment, description: e.target.value })
              }
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={assessment.durationMinutes || 90}
                onChange={(e) =>
                  setAssessment({
                    ...assessment,
                    durationMinutes: Number.parseInt(e.target.value) || 90,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                value={assessment.passingScore || 70}
                onChange={(e) =>
                  setAssessment({
                    ...assessment,
                    passingScore: Number.parseInt(e.target.value) || 70,
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
