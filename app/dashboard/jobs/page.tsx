"use client";

import { Separator } from "@/components/ui/separator";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Loader2,
  SearchIcon,
  MapPin,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  skills: string[]
  skillsRequired?: string[];
  postedDate: string;
  companyId?: { name?: string; logoUrl?: string; description?: string; website?: string };
}

export default function BrowseJobsPage() {
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      console.log("[v0] Fetching jobs for job seekers");

      const response = await fetch("/api/job-descriptions");
      if (response.ok) {
        const data = await response.json();

        console.log("[v0] Fetched jobs data:", data);

        setJobs(data.jobs || []);
      } else {
        const errorData = await response.json();
        console.error("[v0] Error response:", errorData);
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch job descriptions.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching job descriptions:", error);
      toast({
        title: "Error",
        description: "Network error. Failed to fetch job descriptions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.skills?.some((skill) =>
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      ) ||
      (job as any).skillsRequired?.some((skill: string) =>
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Browse Jobs</h1>
      <p className="text-muted-foreground mb-6">
        Find your next career opportunity from our latest job postings.
      </p>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search jobs by title, description, location, or skills..."
          className="pl-10 pr-4 py-2 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {jobs.length === 0
              ? "No jobs available at the moment. Check back later!"
              : "No jobs found matching your criteria."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <Card key={job._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
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
                    <div>
                      <CardTitle className="leading-tight line-clamp-2">{job.title}</CardTitle>
                      {job.companyId?.name || job.companyId?.website ? (
                        <div className="text-xs text-muted-foreground mt-1">
                          <span>at </span>
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
                    </div>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{job.location}</span>
                  </div>
                  {job.salary && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{job.salary}</span>
                      </div>
                    </>
                  )}
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{job.employmentType}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.companyId?.name ? (
                  <div className="text-sm">
                    <span className="font-medium">{job.companyId.name}</span>
                    {job.companyId.website && (
                      <>
                        <span className="mx-1 text-muted-foreground">•</span>
                        <a href={job.companyId.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                          Visit website
                        </a>
                      </>
                    )}
                  </div>
                ) : null}
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {job.companyId?.description || job.description}
                </p>
                {job.skills && job.skills.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Skills:</h3>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.slice(0, 6).map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills.length > 6 && (
                        <Badge variant="outline" className="text-xs">
                          +{job.skills.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    Posted {new Date(job.postedDate).toLocaleDateString()}
                  </span>
                  <Button asChild>
                    <Link href={`/dashboard/jobs/${job._id}`}>
                      View Details
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
