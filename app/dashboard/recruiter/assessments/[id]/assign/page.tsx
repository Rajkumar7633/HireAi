"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, ArrowLeft } from "lucide-react";

interface Candidate {
  _id: string;
  jobSeekerId: {
    _id: string;
    name: string;
    email: string;
  };
  jobDescriptionId: {
    _id: string;
    title: string;
  };
  status: string;
  applicationDate: string;
}

export default function AssignAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;
  const { toast } = useToast();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [assessment, setAssessment] = useState<any>(null);

  useEffect(() => {
    if (assessmentId) {
      fetchAssessment();
      fetchCandidates();
    }
  }, [assessmentId]);

  const fetchAssessment = async () => {
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`);
      if (response.ok) {
        const data = await response.json();
        setAssessment(data.assessment);
      }
    } catch (error) {
      console.error("Error fetching assessment:", error);
    }
  };

  const fetchCandidates = async () => {
    try {
      const response = await fetch("/api/applications/unassigned");
      if (response.ok) {
        const data = await response.json();
        setCandidates(data.applications || []);
      } else {
        throw new Error("Failed to fetch candidates");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load candidates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateSelect = (candidateId: string, checked: boolean) => {
    if (checked) {
      setSelectedCandidates([...selectedCandidates, candidateId]);
    } else {
      setSelectedCandidates(
        selectedCandidates.filter((id) => id !== candidateId)
      );
    }
  };

  const handleAssignAssessment = async () => {
    if (selectedCandidates.length === 0) {
      toast({
        title: "No Candidates Selected",
        description:
          "Please select at least one candidate to assign the assessment.",
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch("/api/assessments/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentId,
          applicationIds: selectedCandidates,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Assessment Assigned",
          description: `Assessment assigned to ${data.assignedCount} candidates successfully.`,
        });
        sessionStorage.setItem("refreshAssessments", "true");
        router.push("/dashboard/recruiter/assessments");
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to assign assessment");
      }
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to assign assessment",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading candidates...</p>
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
          <h1 className="text-3xl font-bold">Assign Assessment</h1>
          <p className="text-muted-foreground">
            {assessment
              ? `Assign "${assessment.title}" to candidates`
              : "Select candidates for assessment"}
          </p>
        </div>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No Candidates Available
            </h3>
            <p className="text-muted-foreground">
              There are no candidates available for assessment assignment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Available Candidates ({candidates.length})</span>
                <Badge variant="outline">
                  {selectedCandidates.length} selected
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidates.map((candidate) => (
                <div
                  key={candidate._id}
                  className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedCandidates.includes(candidate._id)}
                    onCheckedChange={(checked) =>
                      handleCandidateSelect(candidate._id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {candidate.jobSeekerId.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {candidate.jobSeekerId.email}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Applied for: {candidate.jobDescriptionId.title}
                    </div>
                  </div>
                  <Badge variant="outline">{candidate.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignAssessment}
              disabled={selectedCandidates.length === 0 || assigning}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
            >
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                `Assign to ${selectedCandidates.length} Candidate${
                  selectedCandidates.length !== 1 ? "s" : ""
                }`
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
