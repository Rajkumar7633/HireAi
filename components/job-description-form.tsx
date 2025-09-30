"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, MapPin, DollarSign, Briefcase } from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback } from "react";

interface JobDescriptionFormData {
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  location: string;
  salary: string;
  employmentType: string;
  skills: string[];
  aiShortlistThreshold?: number;
  aiMinAtsScore?: number;
}

interface CompanyProfile {
  name?: string;
  logoUrl?: string;
  website?: string;
  description?: string;
}

interface JobDescriptionFormProps {
  initialData?: JobDescriptionFormData & { _id: string };
  onSave?: () => void;
}

const allSkillsOptions = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "react", label: "React" },
  { value: "nextjs", label: "Next.js" },
  { value: "nodejs", label: "Node.js" },
  { value: "express", label: "Express.js" },
  { value: "mongodb", label: "MongoDB" },
  { value: "sql", label: "SQL" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "aws", label: "AWS" },
  { value: "docker", label: "Docker" },
  { value: "kubernetes", label: "Kubernetes" },
  { value: "git", label: "Git" },
  { value: "agile", label: "Agile" },
  { value: "communication", label: "Communication" },
  { value: "problem-solving", label: "Problem Solving" },
];

export default function JobDescriptionForm({
  initialData,
  onSave,
}: JobDescriptionFormProps) {
  const [formData, setFormData] = useState<JobDescriptionFormData>(
    initialData || {
      title: "",
      description: "",
      requirements: [],
      responsibilities: [],
      location: "",
      salary: "",
      employmentType: "",
      skills: [],
      aiShortlistThreshold: undefined,
      aiMinAtsScore: undefined,
    }
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        requirements: initialData.requirements || [],
        responsibilities: initialData.responsibilities || [],
        skills: initialData.skills || [],
        aiShortlistThreshold: (initialData as any).aiShortlistThreshold ?? undefined,
        aiMinAtsScore: (initialData as any).aiMinAtsScore ?? undefined,
      });
    }
  }, [initialData]);

  // Loader to fetch current recruiter company; re-used by effect and refresh button
  const loadCompany = useCallback(async () => {
    try {
      const res = await fetch("/api/company/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCompany(data.company || null);
      }
    } catch (e) {
      // ignore non-critical errors
    }
  }, []);

  // Fetch current recruiter's company profile for read-only preview
  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleListChange = (
    id: keyof JobDescriptionFormData,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value.split("\n").filter(Boolean),
    }));
  };

  const handleSelectChange = (
    value: string,
    id: keyof JobDescriptionFormData
  ) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSkillsChange = (selectedSkills: string[]) => {
    setFormData((prev) => ({ ...prev, skills: selectedSkills }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const method = initialData ? "PUT" : "POST";
    const url = initialData
      ? `/api/job-descriptions/${initialData._id}`
      : "/api/job-descriptions";

    try {
      // Inline validation for critical fields
      if (!formData.title || !formData.description || !formData.location || !formData.employmentType) {
        toast({
          title: "Missing required fields",
          description: "Please fill Title, Description, Location, and Employment Type.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const payload = { ...formData } as any;
      // Coerce thresholds to numbers if present
      if (payload.aiShortlistThreshold !== undefined && payload.aiShortlistThreshold !== null) {
        payload.aiShortlistThreshold = Number(payload.aiShortlistThreshold);
      }
      if (payload.aiMinAtsScore !== undefined && payload.aiMinAtsScore !== null) {
        payload.aiMinAtsScore = Number(payload.aiMinAtsScore);
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: initialData ? "Job Updated" : "Job Posted",
          description: initialData
            ? "Job description updated successfully."
            : "New job description posted successfully.",
        });
        if (onSave) {
          onSave();
        } else {
          router.push("/dashboard/recruiter/job-descriptions");
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Operation Failed",
          description: errorData.message || "An error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Job description form error:", error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Job" : "Post New Job"}</CardTitle>
        <CardDescription>
          {initialData ? "Refine your posting with a clean, professional layout." : "Provide clear details to attract the right candidates."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Top Summary */}
        <div className="mb-6 rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div><span className="font-medium text-foreground">Title:</span> {formData.title || "—"}</div>
            <div><span className="font-medium text-foreground">Employment:</span> {formData.employmentType || "—"}</div>
            <div><span className="font-medium text-foreground">Location:</span> {formData.location || "—"}</div>
          </div>
        </div>

        {/* Info banner */}
        <div className="mb-6">
          <Alert>
            <AlertTitle>Company branding</AlertTitle>
            <AlertDescription>
              Manage your logo, company name and website in your Profile. Changes will reflect here.
              {" "}
              <Link href="/dashboard/recruiter/profile" className="underline font-medium">Go to Profile</Link>
              {" • "}
              <button type="button" onClick={loadCompany} className="underline font-medium">Refresh Company</button>
            </AlertDescription>
          </Alert>
        </div>

        {/* Live Preview */
        }
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-sm font-medium flex items-center justify-between">
              <span>Company Profile</span>
              <button type="button" onClick={loadCompany} className="text-xs underline">Refresh</button>
            </div>
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    {company?.logoUrl ? <AvatarImage src={company.logoUrl} alt="logo" /> : null}
                    <AvatarFallback>
                      {(company?.name || "?")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <div className="text-base font-semibold">{company?.name || "Your Company"}</div>
                    {company?.website ? (
                      <a href={company.website} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">
                        {company.website}
                      </a>
                    ) : (
                      <div className="text-xs text-muted-foreground">Company website</div>
                    )}
                  </div>
                </div>
              </CardHeader>
              {company?.description ? (
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {company.description}
                  </p>
                </CardContent>
              ) : null}
            </Card>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Preview</div>
            <Card className="border-muted">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      {company?.logoUrl ? <AvatarImage src={company.logoUrl} alt="logo" /> : null}
                      <AvatarFallback>
                        {(company?.name || "?")
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="leading-tight line-clamp-2">{formData.title || "Your Job Title"}</CardTitle>
                      <div className="text-xs text-muted-foreground mt-1">at <span className="font-medium text-foreground">{company?.name || "Your Company"}</span></div>
                    </div>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{formData.location || "Location"}</span>
                  </div>
                  {formData.salary && (
                    <>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{formData.salary}</span>
                      </div>
                    </>
                  )}
                  <Separator orientation="vertical" className="h-4" />
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    <span>{formData.employmentType || "Employment"}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {formData.description || "A short description of the role will appear here."}
                </p>
                {formData.skills && formData.skills.length > 0 ? (
                  <div>
                    <div className="text-sm font-medium mb-2">Skills:</div>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.slice(0, 6).map((skill, idx) => (
                        <span key={idx} className="inline-flex items-center rounded border px-2 py-0.5 text-xs">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Section: Job Basics */}
          <section>
            <h3 className="text-lg font-semibold">Job Basics</h3>
            <p className="text-sm text-muted-foreground mb-4">Start with the essentials that candidates see first.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input id="title" value={formData.title} onChange={handleChange} required />
                <p className="text-xs text-muted-foreground">Use a clear, searchable title (e.g., “Senior React Engineer”).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employmentType">Employment Type</Label>
                <Select value={formData.employmentType} onValueChange={(value) => handleSelectChange(value, "employmentType")}>
                  <SelectTrigger id="employmentType">
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Temporary">Temporary</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Choose the arrangement that best fits this role.</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section: Location & Compensation */}
          <section>
            <h3 className="text-lg font-semibold">Location & Compensation</h3>
            <p className="text-sm text-muted-foreground mb-4">Tell candidates where they will work and pay expectations.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={formData.location} onChange={handleChange} required />
                <p className="text-xs text-muted-foreground">City, region, or Remote/Hybrid if applicable.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Salary (Optional)</Label>
                <Input id="salary" value={formData.salary} onChange={handleChange} placeholder="$80,000 - $100,000" />
                <p className="text-xs text-muted-foreground">Share a range to boost conversion and transparency.</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section: Role Details */}
          <section>
            <h3 className="text-lg font-semibold">Role Details</h3>
            <p className="text-sm text-muted-foreground mb-4">Describe the work and what success looks like.</p>
            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={handleChange}
                rows={8}
                placeholder="Provide a concise summary, key objectives, and impact."
                required
              />
              <p className="text-xs text-muted-foreground">Tip: Lead with an overview, then responsibilities and impact.</p>
            </div>
          </section>

          <Separator />

          {/* Section: Requirements & Responsibilities */}
          <section>
            <h3 className="text-lg font-semibold">Requirements & Responsibilities</h3>
            <p className="text-sm text-muted-foreground mb-4">List the must-haves and day-to-day expectations.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements (one per line)</Label>
                <Textarea
                  id="requirements"
                  value={(formData.requirements || []).join("\n")}
                  onChange={(e) => handleListChange("requirements", e.target.value)}
                  rows={6}
                  placeholder="e.g. 5+ years in React\ne.g. Node.js experience"
                  required
                />
                <p className="text-xs text-muted-foreground">Only list must-have qualifications to broaden your candidate pool.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsibilities">Responsibilities (one per line)</Label>
                <Textarea
                  id="responsibilities"
                  value={(formData.responsibilities || []).join("\n")}
                  onChange={(e) => handleListChange("responsibilities", e.target.value)}
                  rows={6}
                  placeholder="e.g. Build UI components\ne.g. Collaborate with backend"
                  required
                />
                <p className="text-xs text-muted-foreground">Describe outcomes and collaboration rather than tasks only.</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Section: Skills */}
          <section>
            <h3 className="text-lg font-semibold">Skills</h3>
            <p className="text-sm text-muted-foreground mb-4">Choose the skills expected for this role.</p>
            <div className="space-y-2">
              <Label htmlFor="skills">Required Skills</Label>
              <MultiSelect options={allSkillsOptions} selected={formData.skills} onSelect={handleSkillsChange} placeholder="Select required skills..." />
              <p className="text-xs text-muted-foreground">Pick 5–10 skills to help us match great candidates.</p>
            </div>
          </section>

          <Separator />

          {/* Section: AI Screening Settings */}
          <section>
            <h3 className="text-lg font-semibold">AI Screening Settings</h3>
            <p className="text-sm text-muted-foreground mb-4">Fine-tune automated shortlisting for this job.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aiShortlistThreshold">AI Shortlist Threshold (%)</Label>
                <Input
                  id="aiShortlistThreshold"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={formData.aiShortlistThreshold ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aiShortlistThreshold: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                  placeholder="e.g., 75"
                />
                <p className="text-xs text-muted-foreground">Minimum overall match score to consider for shortlisting.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiMinAtsScore">Minimum ATS Score (%)</Label>
                <Input
                  id="aiMinAtsScore"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={formData.aiMinAtsScore ?? ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      aiMinAtsScore: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                  placeholder="e.g., 65"
                />
                <p className="text-xs text-muted-foreground">ATS compliance score minimum for a candidate to pass.</p>
              </div>
            </div>
          </section>

          {/* Sticky Action Bar */}
          <div className="sticky bottom-0 z-10 -mx-6 border-t bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/50">
            <div className="px-6 py-4 flex items-center justify-end gap-3">
              <Button type="submit" className="min-w-40" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {initialData ? "Update Job" : "Post Job"}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
