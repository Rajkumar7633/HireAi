"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Users,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast"; // Import useToast hook

interface JobDescription {
  _id: string;
  title: string;
  description: string;
  location: string;
  salary?: string;
  employmentType: string;
  skills: string[];
  postedDate: string;
  requirements: string[];
  responsibilities: string[];
}

const formatSafeDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "Date not available";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return format(date, "MMM dd, yyyy");
  } catch (error) {
    return "Invalid date";
  }
};

export default function RecruiterJobDescriptionsPage() {
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast(); // Declare useToast hook
  const { session, isLoading: sessionLoading } = useSession();

  useEffect(() => {
    if (!sessionLoading && session) {
      fetchJobs();
    }
  }, [session, sessionLoading]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/job-descriptions/my-jobs", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobDescriptions || []);
      } else if (response.status === 401) {
        setJobs([]);
        toast({
          title: "Session Expired",
          description: "Please login again to continue.",
          variant: "destructive",
        });
      } else {
        const errorData = await response.json();
        setJobs([]);
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch job descriptions.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching job descriptions:", error);
      setJobs([]);
      toast({
        title: "Error",
        description: "Network error. Failed to fetch job descriptions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this job? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/job-descriptions/${jobId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Job Deleted",
          description: "The job description has been successfully deleted.",
        });
        fetchJobs(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast({
          title: "Deletion Failed",
          description:
            errorData.message || "An error occurred while deleting the job.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Delete job error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading job descriptions...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-center text-muted-foreground">
          Please login to view your job descriptions.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Job Descriptions</h1>
        <Button asChild>
          <Link href="/dashboard/recruiter/job-descriptions/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Post New Job
          </Link>
        </Button>
      </div>

      {!jobs || jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You haven't posted any jobs yet. Create your first job posting to
            get started!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Card key={job._id}>
              <CardHeader>
                <CardTitle>{job.title}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Posted: {formatSafeDate(job.postedDate)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {job.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{job.location}</Badge>
                  <Badge variant="outline">{job.employmentType}</Badge>
                  {job.salary && <Badge variant="outline">{job.salary}</Badge>}
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Skills:</p>
                  <div className="flex flex-wrap gap-1">
                    {job.skills &&
                    Array.isArray(job.skills) &&
                    job.skills.length > 0 ? (
                      <>
                        {job.skills.slice(0, 3).map((skill, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{job.skills.length - 3} more
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        No skills specified
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex justify-between gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/dashboard/recruiter/job-descriptions/${job._id}/candidates`}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Candidates
                    </Link>
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        href={`/dashboard/recruiter/job-descriptions/${job._id}/edit`}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteJob(job._id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
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
