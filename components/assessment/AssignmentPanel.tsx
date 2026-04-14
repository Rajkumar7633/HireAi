"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Mail, Clock, User, Send } from "lucide-react";

interface AssignmentPanelProps {
  assessmentId: string;
  assessmentTitle: string;
  onAssign: (data: AssignmentData) => void;
  onScheduleInterview: (data: InterviewData) => void;
}

interface AssignmentData {
  candidateEmail: string;
  candidateName: string;
  scheduledDate?: string;
  testType: string;
}

interface InterviewData {
  candidateEmail: string;
  candidateName: string;
  interviewTitle: string;
  interviewDescription: string;
  scheduledDate: string;
  duration: number;
  interviewType: string;
  interviewerName: string;
  interviewerEmail: string;
  meetingLink?: string;
  company: string;
}

export function AssignmentPanel({ assessmentId, assessmentTitle, onAssign, onScheduleInterview }: AssignmentPanelProps) {
  const [activeTab, setActiveTab] = useState<"assessment" | "interview">("assessment");
  const [loading, setLoading] = useState(false);
  
  // Assessment assignment state
  const [assignmentData, setAssignmentData] = useState<AssignmentData>({
    candidateEmail: "",
    candidateName: "",
    scheduledDate: "",
    testType: "assessment"
  });
  
  // Interview scheduling state
  const [interviewData, setInterviewData] = useState<InterviewData>({
    candidateEmail: "",
    candidateName: "",
    interviewTitle: "",
    interviewDescription: "",
    scheduledDate: "",
    duration: 60,
    interviewType: "video",
    interviewerName: "",
    interviewerEmail: "",
    company: "HireAI"
  });

  const handleAssignAssessment = async () => {
    if (!assignmentData.candidateEmail || !assignmentData.candidateName) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignmentData)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Assessment assigned successfully! Email sent to ${assignmentData.candidateEmail}`);
        setAssignmentData({
          candidateEmail: "",
          candidateName: "",
          scheduledDate: "",
          testType: "assessment"
        });
        onAssign(result);
      } else {
        const error = await response.json();
        alert(`Failed to assign assessment: ${error.error}`);
      }
    } catch (error) {
      console.error("Error assigning assessment:", error);
      alert("Failed to assign assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleInterview = async () => {
    if (!interviewData.candidateEmail || !interviewData.candidateName || !interviewData.interviewTitle || !interviewData.scheduledDate) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/interviews/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(interviewData)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Interview scheduled successfully! Email sent to ${interviewData.candidateEmail}`);
        setInterviewData({
          candidateEmail: "",
          candidateName: "",
          interviewTitle: "",
          interviewDescription: "",
          scheduledDate: "",
          duration: 60,
          interviewType: "video",
          interviewerName: "",
          interviewerEmail: "",
          company: "HireAI"
        });
        onScheduleInterview(result);
      } else {
        const error = await response.json();
        alert(`Failed to schedule interview: ${error.error}`);
      }
    } catch (error) {
      console.error("Error scheduling interview:", error);
      alert("Failed to schedule interview. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Assign & Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Tab Selection */}
          <div className="flex space-x-4 border-b">
            <button
              onClick={() => setActiveTab("assessment")}
              className={`pb-2 px-4 font-medium transition-colors ${
                activeTab === "assessment"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Assign Assessment
              </div>
            </button>
            <button
              onClick={() => setActiveTab("interview")}
              className={`pb-2 px-4 font-medium transition-colors ${
                activeTab === "interview"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule Interview
              </div>
            </button>
          </div>

          {/* Assessment Assignment Form */}
          {activeTab === "assessment" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="candidateName">Candidate Name *</Label>
                  <Input
                    id="candidateName"
                    value={assignmentData.candidateName}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, candidateName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidateEmail">Candidate Email *</Label>
                  <Input
                    id="candidateEmail"
                    type="email"
                    value={assignmentData.candidateEmail}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, candidateEmail: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Scheduled Date (Optional)</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={assignmentData.scheduledDate}
                    onChange={(e) => setAssignmentData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testType">Test Type</Label>
                  <Select value={assignmentData.testType} onValueChange={(value) => setAssignmentData(prev => ({ ...prev, testType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assessment">Technical Assessment</SelectItem>
                      <SelectItem value="coding">Coding Challenge</SelectItem>
                      <SelectItem value="aptitude">Aptitude Test</SelectItem>
                      <SelectItem value="personality">Personality Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Assessment Details</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  <p><strong>Assessment:</strong> {assessmentTitle}</p>
                  <p><strong>Test Link:</strong> Will be generated and sent via email</p>
                  <p><strong>Security:</strong> AI proctoring enabled</p>
                </div>
              </div>

              <Button 
                onClick={handleAssignAssessment} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Assigning...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Assign Assessment & Send Email
                  </div>
                )}
              </Button>
            </div>
          )}

          {/* Interview Scheduling Form */}
          {activeTab === "interview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interviewCandidateName">Candidate Name *</Label>
                  <Input
                    id="interviewCandidateName"
                    value={interviewData.candidateName}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, candidateName: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interviewCandidateEmail">Candidate Email *</Label>
                  <Input
                    id="interviewCandidateEmail"
                    type="email"
                    value={interviewData.candidateEmail}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, candidateEmail: e.target.value }))}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interviewTitle">Interview Title *</Label>
                <Input
                  id="interviewTitle"
                  value={interviewData.interviewTitle}
                  onChange={(e) => setInterviewData(prev => ({ ...prev, interviewTitle: e.target.value }))}
                  placeholder="Senior Frontend Developer Interview"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interviewDescription">Interview Description</Label>
                <Textarea
                  id="interviewDescription"
                  value={interviewData.interviewDescription}
                  onChange={(e) => setInterviewData(prev => ({ ...prev, interviewDescription: e.target.value }))}
                  placeholder="Technical interview covering React, TypeScript, and system design..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduledDate">Date & Time *</Label>
                  <Input
                    id="scheduledDate"
                    type="datetime-local"
                    value={interviewData.scheduledDate}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="480"
                    value={interviewData.duration}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interviewType">Interview Type</Label>
                  <Select value={interviewData.interviewType} onValueChange={(value) => setInterviewData(prev => ({ ...prev, interviewType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video Interview</SelectItem>
                      <SelectItem value="phone">Phone Interview</SelectItem>
                      <SelectItem value="in-person">In-Person Interview</SelectItem>
                      <SelectItem value="technical">Technical Interview</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interviewerName">Interviewer Name *</Label>
                  <Input
                    id="interviewerName"
                    value={interviewData.interviewerName}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, interviewerName: e.target.value }))}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interviewerEmail">Interviewer Email *</Label>
                  <Input
                    id="interviewerEmail"
                    type="email"
                    value={interviewData.interviewerEmail}
                    onChange={(e) => setInterviewData(prev => ({ ...prev, interviewerEmail: e.target.value }))}
                    placeholder="jane@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link (Optional)</Label>
                <Input
                  id="meetingLink"
                  value={interviewData.meetingLink}
                  onChange={(e) => setInterviewData(prev => ({ ...prev, meetingLink: e.target.value }))}
                  placeholder="https://zoom.us/j/123456789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={interviewData.company}
                  onChange={(e) => setInterviewData(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="HireAI"
                />
              </div>

              <Button 
                onClick={handleScheduleInterview} 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Scheduling...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Schedule Interview & Send Email
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
