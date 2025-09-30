"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Clock, CheckCircle } from "lucide-react";

interface Assessment {
  _id: string;
  title: string;
  description: string;
  duration: number;
  totalPoints: number;
  questions: any[];
}

interface JobSeeker {
  _id: string;
  name: string;
  email: string;
  skills?: string[];
}

export default function AssignAssessmentPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [jobSeekers, setJobSeekers] = useState<JobSeeker[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [selectedJobSeekers, setSelectedJobSeekers] = useState<string[]>([]);
  const [expirationDays, setExpirationDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssessments();
    fetchJobSeekers();
  }, []);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/assessments", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAssessments(data.assessments || []);
      }
    } catch (error) {
      console.error("Error fetching assessments:", error);
      toast({
        title: "Error",
        description: "Failed to load assessments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchJobSeekers = async () => {
    try {
      const response = await fetch("/api/users/job-seekers", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setJobSeekers(data.jobSeekers || []);
      }
    } catch (error) {
      console.error("Error fetching job seekers:", error);
    }
  };

  const handleJobSeekerToggle = (jobSeekerId: string) => {
    setSelectedJobSeekers((prev) =>
      prev.includes(jobSeekerId)
        ? prev.filter((id) => id !== jobSeekerId)
        : [...prev, jobSeekerId]
    );
  };

  const handleAssignAssessment = async () => {
    if (!selectedAssessment || selectedJobSeekers.length === 0) {
      toast({
        title: "Error",
        description: "Please select an assessment and at least one job seeker",
        variant: "destructive",
      });
      return;
    }

    try {
      setAssignLoading(true);
      const response = await fetch("/api/assessments/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          assessmentId: selectedAssessment,
          jobSeekerIds: selectedJobSeekers,
          expirationDays: expirationDays,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message,
        });
        // Reset form
        setSelectedAssessment("");
        setSelectedJobSeekers([]);
        setExpirationDays(7);
      } else {
        throw new Error(data.message || "Failed to assign assessment");
      }
    } catch (error) {
      console.error("Error assigning assessment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign assessment",
        variant: "destructive",
      });
    } finally {
      setAssignLoading(false);
    }
  };

  const selectedAssessmentData = assessments.find(
    (a) => a._id === selectedAssessment
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Assign Assessment</h1>
        <p className="text-gray-600 mt-2">
          Assign assessments to job seekers and track their progress
        </p>
      </div>

      <div className="grid gap-6">
        {/* Assessment Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Select Assessment
            </CardTitle>
            <CardDescription>Choose which assessment to assign</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="assessment">Assessment</Label>
                <Select
                  value={selectedAssessment}
                  onValueChange={setSelectedAssessment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    {assessments.map((assessment) => (
                      <SelectItem key={assessment._id} value={assessment._id}>
                        {assessment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAssessmentData && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">
                    {selectedAssessmentData.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedAssessmentData.description}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {selectedAssessmentData.duration} min
                    </Badge>
                    <Badge variant="secondary">
                      {selectedAssessmentData.questions?.length || 0} questions
                    </Badge>
                    <Badge variant="secondary">
                      {selectedAssessmentData.totalPoints} points
                    </Badge>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="expiration">Expiration (days)</Label>
                <Input
                  id="expiration"
                  type="number"
                  min="1"
                  max="30"
                  value={expirationDays}
                  onChange={(e) =>
                    setExpirationDays(Number.parseInt(e.target.value) || 7)
                  }
                  className="w-32"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Seeker Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Job Seekers
            </CardTitle>
            <CardDescription>
              Choose job seekers to assign this assessment to (
              {selectedJobSeekers.length} selected)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {jobSeekers.map((jobSeeker) => (
                <div
                  key={jobSeeker._id}
                  className="flex items-center space-x-3 p-3 border rounded-lg"
                >
                  <Checkbox
                    id={jobSeeker._id}
                    checked={selectedJobSeekers.includes(jobSeeker._id)}
                    onCheckedChange={() => handleJobSeekerToggle(jobSeeker._id)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={jobSeeker._id}
                      className="font-medium cursor-pointer"
                    >
                      {jobSeeker.name}
                    </Label>
                    <p className="text-sm text-gray-600">{jobSeeker.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assignment Summary & Action */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Ready to assign?</p>
                <p className="text-sm text-gray-600">
                  {selectedJobSeekers.length} job seekers will receive the
                  assessment
                </p>
              </div>
              <Button
                onClick={handleAssignAssessment}
                disabled={
                  !selectedAssessment ||
                  selectedJobSeekers.length === 0 ||
                  assignLoading
                }
                size="lg"
              >
                {assignLoading && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Assign Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
