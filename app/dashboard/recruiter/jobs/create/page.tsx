"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Briefcase, MapPin, DollarSign, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CreateJobPage() {
  console.log("[v0] CreateJobPage component is rendering");

  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    salary: "",
    employmentType: "",
    experience: "",
    skills: [] as string[],
    requirements: [] as string[],
    responsibilities: [] as string[],
  });
  const [newSkill, setNewSkill] = useState("");
  const [newRequirement, setNewRequirement] = useState("");
  const [newResponsibility, setNewResponsibility] = useState("");

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData((prev) => ({
        ...prev,
        requirements: [...prev.requirements, newRequirement.trim()],
      }));
      setNewRequirement("");
    }
  };

  const removeRequirement = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((_, i) => i !== index),
    }));
  };

  const addResponsibility = () => {
    if (newResponsibility.trim()) {
      setFormData((prev) => ({
        ...prev,
        responsibilities: [...prev.responsibilities, newResponsibility.trim()],
      }));
      setNewResponsibility("");
    }
  };

  const removeResponsibility = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create job");
      }

      const data = await response.json();
      toast({
        title: "Success!",
        description: "Job posted successfully and sent to all job seekers.",
      });

      router.push("/dashboard/recruiter/jobs");
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create job",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div style={{ backgroundColor: "red", padding: "10px", color: "white" }}>
        DEBUG: Create Job Page is rendering
      </div>

      <div className="flex items-center gap-2">
        <Briefcase className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Create New Job Posting</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential job details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Senior Software Engineer"
                  required
                />
              </div>

              <div>
                <Label htmlFor="location">Location *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    placeholder="e.g. San Francisco, CA / Remote"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="salary">Salary Range</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="salary"
                    value={formData.salary}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        salary: e.target.value,
                      }))
                    }
                    placeholder="e.g. $80,000 - $120,000"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="employmentType">Employment Type *</Label>
                <Select
                  value={formData.employmentType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, employmentType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="experience">Experience Level *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="experience"
                    value={formData.experience}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        experience: e.target.value,
                      }))
                    }
                    placeholder="e.g. 3-5 years"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Required Skills</CardTitle>
              <CardDescription>
                Add skills required for this position
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill"
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addSkill())
                  }
                />
                <Button type="button" onClick={addSkill} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {skill}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeSkill(skill)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
            <CardDescription>Detailed description of the role</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe the role, company culture, and what makes this opportunity unique..."
              rows={6}
              required
            />
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
            <CardDescription>
              List the key requirements for this position
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                placeholder="Add a requirement"
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addRequirement())
                }
              />
              <Button type="button" onClick={addRequirement} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-2">
              {formData.requirements.map((req, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded"
                >
                  <span className="flex-1">• {req}</span>
                  <X
                    className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                    onClick={() => removeRequirement(index)}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Responsibilities */}
        <Card>
          <CardHeader>
            <CardTitle>Responsibilities</CardTitle>
            <CardDescription>
              What will the candidate be responsible for?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newResponsibility}
                onChange={(e) => setNewResponsibility(e.target.value)}
                placeholder="Add a responsibility"
                onKeyPress={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addResponsibility())
                }
              />
              <Button type="button" onClick={addResponsibility} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-2">
              {formData.responsibilities.map((resp, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded"
                >
                  <span className="flex-1">• {resp}</span>
                  <X
                    className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                    onClick={() => removeResponsibility(index)}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Creating Job..." : "Post Job"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
