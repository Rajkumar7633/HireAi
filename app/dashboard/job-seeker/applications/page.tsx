"use client";

import { CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface JobApplication {
  _id: string;
  jobSeekerId: string;
  jobDescriptionId: {
    _id: string;
    title: string;
    location: string;
    recruiterId: string;
  };
  resumeId: {
    _id: string;
    filename: string;
  };
  applicationDate: string;
  status:
    | "Pending"
    | "Reviewed"
    | "Interview Scheduled"
    | "Test Assigned"
    | "Assessment Assigned"
    | "Rejected"
    | "Hired";
  testScore?: number;
  interviewDate?: string;
}

export default function MyApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    interviews: 0,
    hired: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/applications/my-applications");
      if (response.ok) {
        const data = await response.json();
        const apps = data.applications || [];
        setApplications(apps);

        setStats({
          total: apps.length,
          pending: apps.filter(
            (app: JobApplication) => app.status === "Pending"
          ).length,
          interviews: apps.filter(
            (app: JobApplication) => app.status === "Interview Scheduled"
          ).length,
          hired: apps.filter((app: JobApplication) => app.status === "Hired")
            .length,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch applications.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to fetch applications.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: JobApplication["status"]) => {
    switch (status) {
      case "Pending":
        return "secondary";
      case "Reviewed":
        return "outline";
      case "Interview Scheduled":
        return "default";
      case "Test Assigned":
        return "default";
      case "Assessment Assigned":
        return "default";
      case "Rejected":
        return "destructive";
      case "Hired":
        return "default";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: JobApplication["status"]) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "Reviewed":
        return <CheckCircle className="h-4 w-4" />;
      case "Interview Scheduled":
        return <CheckCircle className="h-4 w-4" />;
      case "Test Assigned":
        return <AlertCircle className="h-4 w-4" />;
      case "Assessment Assigned":
        return <AlertCircle className="h-4 w-4" />;
      case "Rejected":
        return <XCircle className="h-4 w-4" />;
      case "Hired":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading applications...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Job Applications</h1>
          <p className="text-muted-foreground">
            Track your application progress and manage your job search
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs">Browse More Jobs</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Applications
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Loader2 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Interviews
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.interviews}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Hired
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.hired}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't applied for any jobs yet. Browse available jobs to get
              started!
            </p>
            <Button asChild>
              <Link href="/dashboard/jobs">Browse Jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {applications.map((app) => (
            <Card key={app._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="line-clamp-2">
                    {app.jobDescriptionId.title}
                  </span>
                  <Badge
                    variant={getStatusVariant(app.status)}
                    className="flex items-center gap-1 ml-2"
                  >
                    {getStatusIcon(app.status)}
                    {app.status}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Applied with: {app.resumeId.filename}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {app.jobDescriptionId.location}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Applied{" "}
                    {format(new Date(app.applicationDate), "MMM dd, yyyy")}
                  </p>
                  {app.testScore && (
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Test Score: {app.testScore}%
                    </p>
                  )}
                  {app.interviewDate && (
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Interview:{" "}
                      {format(
                        new Date(app.interviewDate),
                        "MMM dd, yyyy 'at' h:mm a"
                      )}
                    </p>
                  )}
                </div>
                <Separator />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/jobs/${app.jobDescriptionId._id}`}>
                      View Job
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  {(app.status === "Test Assigned" ||
                    app.status === "Assessment Assigned") && (
                    <Button variant="default" size="sm" asChild>
                      <Link href={`/dashboard/job-seeker/assessments`}>
                        Take Test
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {app.status === "Interview Scheduled" && (
                    <Button variant="default" size="sm" asChild>
                      <Link
                        href={`/dashboard/job-seeker/interviews/${app._id}`}
                      >
                        View Interview
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
