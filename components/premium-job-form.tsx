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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
  Save,
  Eye,
  Sparkles,
  Building2,
  MapPin,
  DollarSign,
  Users,
  Clock,
  Star,
} from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface JobDescriptionFormData {
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  location: string;
  salary: string;
  employmentType: string;
  skills: string[];
  experienceLevel?: string;
  remotePolicy?: string;
  visaSponsorship?: boolean;
  benefits?: string[];
  screeningQuestions?: string[];
  applicationMode?: "resume_only" | "resume_plus_form" | "form_only";
}

interface PremiumJobFormProps {
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

const jobTemplates = [
  {
    id: "software-engineer",
    title: "Software Engineer",
    description:
      "We are seeking a talented Software Engineer to join our dynamic team...",
    requirements: [
      "Bachelor's degree in Computer Science",
      "3+ years of experience",
      "Strong problem-solving skills",
    ],
    responsibilities: [
      "Develop and maintain software applications",
      "Collaborate with cross-functional teams",
      "Write clean, maintainable code",
    ],
    skills: ["javascript", "react", "nodejs"],
  },
  {
    id: "product-manager",
    title: "Product Manager",
    description:
      "Join our product team to drive innovation and deliver exceptional user experiences...",
    requirements: [
      "MBA or equivalent experience",
      "5+ years in product management",
      "Strong analytical skills",
    ],
    responsibilities: [
      "Define product strategy and roadmap",
      "Work with engineering and design teams",
      "Analyze market trends and user feedback",
    ],
    skills: ["agile", "communication", "problem-solving"],
  },
  {
    id: "data-scientist",
    title: "Data Scientist",
    description:
      "We're looking for a Data Scientist to help us make data-driven decisions...",
    requirements: [
      "Master's degree in Data Science or related field",
      "Experience with machine learning",
      "Strong statistical background",
    ],
    responsibilities: [
      "Build predictive models",
      "Analyze large datasets",
      "Present insights to stakeholders",
    ],
    skills: ["python", "sql", "aws"],
  },
];

export default function PremiumJobForm({
  initialData,
  onSave,
}: PremiumJobFormProps) {
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
      experienceLevel: "",
      remotePolicy: "",
      visaSponsorship: false,
      benefits: [],
      screeningQuestions: [],
      applicationMode: "resume_plus_form",
    }
  );
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        requirements: initialData.requirements || [],
        responsibilities: initialData.responsibilities || [],
        skills: initialData.skills || [],
      });
    }
  }, [initialData]);

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

  const handleBooleanSelect = (id: keyof JobDescriptionFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value === "yes" }));
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

  const handleTemplateSelect = (templateId: string) => {
    const template = jobTemplates.find((t) => t.id === templateId);
    if (template) {
      setFormData({
        title: template.title,
        description: template.description,
        requirements: template.requirements,
        responsibilities: template.responsibilities,
        location: formData.location,
        salary: formData.salary,
        employmentType: formData.employmentType,
        skills: template.skills,
      });
      setSelectedTemplate(templateId);
      toast({
        title: "Template Applied",
        description: `${template.title} template has been applied to your form.`,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const method = initialData ? "PUT" : "POST";
    const url = initialData
      ? `/api/job-descriptions/${initialData._id}`
      : "/api/job-descriptions";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: initialData ? "Job Updated" : "Job Posted Successfully",
          description: initialData
            ? "Job description updated successfully."
            : "Your premium job posting is now live and attracting top talent.",
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

  const JobPreview = () => (
    <Card className="premium-card">
      <CardHeader className="premium-gradient text-primary-foreground">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <CardTitle className="text-xl">
            {formData.title || "Job Title"}
          </CardTitle>
        </div>
        <CardDescription className="text-primary-foreground/80 flex items-center gap-4">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {formData.location || "Location"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formData.employmentType || "Employment Type"}
          </span>
          {formData.salary && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {formData.salary}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <div>
          <h3 className="font-semibold text-lg mb-3 text-card-foreground">
            Job Description
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            {formData.description || "Job description will appear here..."}
          </p>
        </div>

        {formData.requirements.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 text-card-foreground">
              Requirements
            </h3>
            <ul className="space-y-2">
              {formData.requirements.map((req, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <Star className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {formData.responsibilities.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 text-card-foreground">
              Responsibilities
            </h3>
            <ul className="space-y-2">
              {formData.responsibilities.map((resp, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  {resp}
                </li>
              ))}
            </ul>
          </div>
        )}

        {formData.skills.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 text-card-foreground">
              Required Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="bg-accent/10 text-accent border-accent/20"
                >
                  {allSkillsOptions.find((s) => s.value === skill)?.label ||
                    skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {(formData.benefits && formData.benefits.length > 0) && (
          <div>
            <h3 className="font-semibold text-lg mb-3 text-card-foreground">
              Benefits
            </h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              {formData.benefits!.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          </div>
        )}

        {formData.applicationMode && (
          <div className="text-sm text-muted-foreground">
            Application Mode: <span className="font-medium text-card-foreground">{formData.applicationMode}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
      {/* Form Section */}
      <div className="space-y-6">
        {/* Template Selection */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Quick Start Templates
            </CardTitle>
            <CardDescription>
              Choose from our premium templates to get started quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {jobTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant={
                    selectedTemplate === template.id ? "default" : "outline"
                  }
                  className="justify-start h-auto p-4"
                  onClick={() => handleTemplateSelect(template.id)}
                  type="button"
                >
                  <div className="text-left">
                    <div className="font-medium">{template.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {template.description.substring(0, 60)}...
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <Card className="premium-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {initialData
                ? "Edit Job Description"
                : "Create Premium Job Posting"}
            </CardTitle>
            <CardDescription>
              {initialData
                ? "Update the details of your job posting."
                : "Create a compelling job posting that attracts top talent."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">
                  Job Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="premium-input"
                  placeholder="e.g. Senior Software Engineer"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Job Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  className="premium-input"
                  placeholder="Provide a compelling description that showcases your company culture and the exciting opportunities this role offers..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="premium-input"
                    placeholder="e.g. San Francisco, CA (Remote)"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-sm font-medium">
                    Salary Range
                  </Label>
                  <Input
                    id="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    className="premium-input"
                    placeholder="e.g. $120,000 - $150,000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employmentType" className="text-sm font-medium">
                  Employment Type
                </Label>
                <Select
                  value={formData.employmentType}
                  onValueChange={(value) =>
                    handleSelectChange(value, "employmentType")
                  }
                >
                  <SelectTrigger id="employmentType" className="premium-input">
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
              </div>

              {/* Advanced Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Experience Level</Label>
                  <Select
                    value={formData.experienceLevel || ""}
                    onValueChange={(v) => handleSelectChange(v, "experienceLevel")}
                  >
                    <SelectTrigger className="premium-input">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Intern">Intern</SelectItem>
                      <SelectItem value="Junior">Junior</SelectItem>
                      <SelectItem value="Mid">Mid</SelectItem>
                      <SelectItem value="Senior">Senior</SelectItem>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Remote Policy</Label>
                  <Select
                    value={formData.remotePolicy || ""}
                    onValueChange={(v) => handleSelectChange(v, "remotePolicy")}
                  >
                    <SelectTrigger className="premium-input">
                      <SelectValue placeholder="Select policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Onsite">Onsite</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="Remote">Remote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Visa Sponsorship</Label>
                  <Select
                    value={formData.visaSponsorship ? "yes" : "no"}
                    onValueChange={(v) => handleBooleanSelect("visaSponsorship", v)}
                  >
                    <SelectTrigger className="premium-input">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements" className="text-sm font-medium">
                  Requirements (one per line)
                </Label>
                <Textarea
                  id="requirements"
                  value={formData.requirements.join("\n")}
                  onChange={(e) =>
                    handleListChange("requirements", e.target.value)
                  }
                  rows={4}
                  className="premium-input"
                  placeholder="• Bachelor's degree in Computer Science&#10;• 3+ years of experience&#10;• Strong problem-solving skills"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="responsibilities"
                  className="text-sm font-medium"
                >
                  Key Responsibilities (one per line)
                </Label>
                <Textarea
                  id="responsibilities"
                  value={formData.responsibilities.join("\n")}
                  onChange={(e) =>
                    handleListChange("responsibilities", e.target.value)
                  }
                  rows={4}
                  className="premium-input"
                  placeholder="• Lead development of new features&#10;• Mentor junior developers&#10;• Collaborate with product team"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills" className="text-sm font-medium">
                  Required Skills
                </Label>
                <MultiSelect
                  options={allSkillsOptions}
                  selected={formData.skills}
                  onSelect={handleSkillsChange}
                  placeholder="Select required skills..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Benefits (one per line)</Label>
                <Textarea
                  id="benefits"
                  value={(formData.benefits || []).join("\n")}
                  onChange={(e) => handleListChange("benefits", e.target.value)}
                  rows={4}
                  className="premium-input"
                  placeholder="• Health insurance\n• 401(k)\n• Learning stipend"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Screening Questions (one per line)</Label>
                <Textarea
                  id="screeningQuestions"
                  value={(formData.screeningQuestions || []).join("\n")}
                  onChange={(e) => handleListChange("screeningQuestions", e.target.value)}
                  rows={4}
                  className="premium-input"
                  placeholder="• Why are you a good fit?\n• Describe a recent project relevant to this role."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Application Mode</Label>
                <Select
                  value={formData.applicationMode || "resume_plus_form"}
                  onValueChange={(v) => handleSelectChange(v, "applicationMode")}
                >
                  <SelectTrigger className="premium-input">
                    <SelectValue placeholder="Choose application mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resume_only">Resume only</SelectItem>
                    <SelectItem value="resume_plus_form">Resume + Form (recommended)</SelectItem>
                    <SelectItem value="form_only">Form only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1 premium-gradient"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  {initialData ? "Update Job" : "Post Premium Job"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                  className="lg:hidden"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {showPreview ? "Hide" : "Preview"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      <div className="space-y-6">
        <div className="sticky top-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-semibold">Live Preview</h3>
          </div>
          <div className={`${showPreview ? "block" : "hidden"} lg:block`}>
            <JobPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
