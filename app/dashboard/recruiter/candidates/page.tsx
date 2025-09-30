"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  User,
  FileText,
  Calendar,
  TestTube,
  Search,
  Filter,
} from "lucide-react";
import { format } from "date-fns";

interface Application {
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
  resumeId: {
    _id: string;
    filename: string;
    originalName: string;
  };
  testId?: {
    _id: string;
    title: string;
  };
  status: string;
  applicationDate: string;
  testScore?: number;
  testCompletedAt?: string;
}

export default function CandidatesOverviewPage() {
  const { toast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<
    Application[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"all" | "shortlisted">("all");

  useEffect(() => {
    fetchAllCandidates();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter]);

  const fetchAllCandidates = async () => {
    try {
      console.log("[v0] Fetching candidates from /api/applications/recruiter");

      const response = await fetch("/api/applications/recruiter", {
        method: "GET",
        credentials: "include", // Include cookies for authentication
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("[v0] Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(
          "[v0] Applications fetched successfully:",
          data.applications?.length || 0
        );
        // Normalize possible variations from backend (ids vs populated docs)
        const normalized = (data.applications || []).map((a: any) => {
          const js = a.jobSeekerId;
          const jobSeekerObj = js && typeof js === "object"
            ? js
            : { _id: js || "", name: a.candidateName || "Candidate", email: a.candidateEmail || "-" };
          const jd = a.jobDescriptionId;
          const jobDescObj = jd && typeof jd === "object"
            ? jd
            : { _id: jd || "", title: a.jobTitle || "Job" };
          const res = a.resumeId;
          const resumeObj = res && typeof res === "object"
            ? res
            : { _id: res || "", filename: a.resumeFilename || "", originalName: a.resumeOriginalName || "Resume" };
          return { ...a, jobSeekerId: jobSeekerObj, jobDescriptionId: jobDescObj, resumeId: resumeObj } as Application;
        });
        setApplications(normalized);
      } else {
        const errorData = await response.json();
        console.error("[v0] API Error:", errorData);
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch candidates.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("[v0] Network error fetching candidates:", error);
      toast({
        title: "Network Error",
        description:
          "Failed to fetch candidates. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    let source = applications;
    if (viewMode === "shortlisted") {
      source = applications.filter((a: any) => a.status === "Shortlisted" || (a as any).shortlisted === true);
    }
    let filtered = source;

    // Filter by search term
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter((app: any) => {
        const name = app.jobSeekerId?.name?.toLowerCase?.() || "";
        const email = app.jobSeekerId?.email?.toLowerCase?.() || "";
        const title = app.jobDescriptionId?.title?.toLowerCase?.() || "";
        return name.includes(q) || email.includes(q) || title.includes(q);
      });
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    setFilteredApplications(filtered);
  };

  const handleStatusUpdate = async (
    applicationId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: "Status Updated",
          description: "Application status has been updated successfully.",
        });
        fetchAllCandidates(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Update Failed",
          description: errorData.message || "Failed to update status.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Status update error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "secondary";
      case "Under Review":
        return "default";
      case "Shortlisted":
        return "default";
      case "Test Assigned":
        return "outline";
      case "Test Passed":
        return "default";
      case "Test Failed":
        return "destructive";
      case "Interview Scheduled":
        return "default";
      case "Hired":
        return "default";
      case "Rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading candidates...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">All Candidates</h1>
        <p className="text-muted-foreground mt-2">
          Manage all candidate applications across your job postings
        </p>
      </div>

      {/* Actions & Filters */}
      <div className="mb-6 flex gap-4 flex-wrap items-center">
        <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates or jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Under Review">Under Review</SelectItem>
            <SelectItem value="Shortlisted">Shortlisted</SelectItem>
            <SelectItem value="Test Assigned">Test Assigned</SelectItem>
            <SelectItem value="Test Passed">Test Passed</SelectItem>
            <SelectItem value="Test Failed">Test Failed</SelectItem>
            <SelectItem value="Interview Scheduled">
              Interview Scheduled
            </SelectItem>
            <SelectItem value="Hired">Hired</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          Showing {filteredApplications.length} of {viewMode === "shortlisted" ? applications.filter((a: any) => a.status === "Shortlisted" || (a as any).shortlisted === true).length : applications.length}
        </div>
      </div>

      {filteredApplications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {applications.length === 0
              ? "No applications received yet."
              : "No candidates match your search criteria."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <Card key={application._id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {application.jobSeekerId?.name || "Candidate"}
                    </CardTitle>
                    <CardDescription>
                      {application.jobSeekerId?.email || "-"}
                    </CardDescription>
                    <div className="mt-1 text-sm font-medium text-muted-foreground">
                      Applied for: {application.jobDescriptionId?.title || "Job"}
                    </div>
                  </div>
                  <Badge variant={getStatusColor(application.status)}>
                    {application.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    Resume: {application.resumeId?.originalName || "Resume"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Applied:{" "}
                    {format(
                      new Date(application.applicationDate),
                      "MMM dd, yyyy"
                    )}
                  </div>
                  {((application as any).aiMatchScore != null || (application as any).atsScore != null) && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">AI Match: {(application as any).aiMatchScore ?? "-"}%</Badge>
                      <Badge variant="outline">ATS: {(application as any).atsScore ?? "-"}%</Badge>
                    </div>
                  )}
                </div>

                {application.testId && (
                  <div className="flex items-center gap-2 text-sm">
                    <TestTube className="h-4 w-4" />
                    <span>Test: {application.testId.title}</span>
                    {application.testScore !== undefined && (
                      <Badge
                        variant={
                          application.testScore >= 60
                            ? "default"
                            : "destructive"
                        }
                      >
                        Score: {application.testScore}%
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Select
                    value={application.status}
                    onValueChange={(value) =>
                      handleStatusUpdate(application._id, value)
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Under Review">Under Review</SelectItem>
                      <SelectItem value="Test Assigned">
                        Test Assigned
                      </SelectItem>
                      <SelectItem value="Interview Scheduled">
                        Interview Scheduled
                      </SelectItem>
                      <SelectItem value="Hired">Hired</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/dashboard/recruiter/candidates/${application.jobSeekerId?._id || application._id}`}
                    >
                      View Profile
                    </Link>
                  </Button>

                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/dashboard/recruiter/job-descriptions/${application.jobDescriptionId._id}/candidates`}
                    >
                      View Job Candidates
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
