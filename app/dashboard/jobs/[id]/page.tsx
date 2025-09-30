"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  MapPin,
  DollarSign,
  Briefcase,
  CalendarDays,
} from "lucide-react";
import { format } from "date-fns";
import { useSession } from "@/hooks/use-session";

interface JobDescription {
  _id: string;
  recruiterId: string;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  location: string;
  salary?: string;
  employmentType: string;
  skills: string[];
  postedDate: string;
  companyId?: { name?: string; logoUrl?: string; description?: string; website?: string };
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { toast } = useToast();
  const { session, isLoading: sessionLoading } = useSession();

  const [job, setJob] = useState<JobDescription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (jobId) {
      fetchJobDetails();
    }
  }, [jobId]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/job-descriptions/${jobId}`);
      if (response.ok) {
        const data = await response.json();
        setJob(data.jobDescription);
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch job details.",
          variant: "destructive",
        });
        router.push("/dashboard/jobs"); // Redirect if job not found or error
      }
    } catch (error) {
      console.error("Error fetching job details:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to fetch job details.",
        variant: "destructive",
      });
      router.push("/dashboard/jobs"); // Redirect on network error
    } finally {
      setLoading(false);
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-muted-foreground">Job not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-3xl font-bold">{job.title}</CardTitle>
            <Avatar className="h-10 w-10">
              {job.companyId?.logoUrl ? (
                <AvatarImage src={job.companyId.logoUrl} alt="logo" />
              ) : null}
              <AvatarFallback>
                {(job.companyId?.name || "?")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <CardDescription className="flex flex-col gap-2 text-sm text-muted-foreground">
            {job.companyId?.name || job.companyId?.website ? (
              <div className="flex items-center gap-2">
                {job.companyId?.name ? (
                  <span className="font-medium text-foreground">{job.companyId.name}</span>
                ) : null}
                {job.companyId?.website ? (
                  <>
                    <span className="mx-1">•</span>
                    <a
                      href={job.companyId.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Visit website
                    </a>
                  </>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {job.location}
              </div>
              {job.salary && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" /> {job.salary}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Briefcase className="h-4 w-4" /> {job.employmentType}
              </div>
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Posted:{" "}
                {format(new Date(job.postedDate), "MMM dd, yyyy")}
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {job.companyId?.description ? (
            <div>
              <h2 className="text-xl font-semibold mb-2">About the Company</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {job.companyId.description}
              </p>
            </div>
          ) : null}
          <div>
            <h2 className="text-xl font-semibold mb-2">Job Description</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {job.companyId?.description ? job.description : job.description}
            </p>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mb-2">Requirements</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              {job.requirements?.map((req, idx) => (
                <li key={idx}>{req}</li>
              )) || (
                <li className="text-muted-foreground">
                  No requirements specified
                </li>
              )}
            </ul>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mb-2">Responsibilities</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              {job.responsibilities?.map((res, idx) => (
                <li key={idx}>{res}</li>
              )) || (
                <li className="text-muted-foreground">
                  No responsibilities specified
                </li>
              )}
            </ul>
          </div>

          <Separator />

          <div>
            <h2 className="text-xl font-semibold mb-2">Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.skills?.length > 0 ? (
                job.skills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground">
                  No specific skills required
                </p>
              )}
            </div>
          </div>

          {session?.role === "job_seeker" && (
            <div className="flex justify-end mt-6">
              <Button asChild>
                <Link href={`/dashboard/jobs/${job._id}/apply`}>Apply Now</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
