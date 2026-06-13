"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Users,
  Star,
  Zap,
  Building2,
  Globe,
  FileText,
  Settings,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Target,
  ShieldCheck,
  Gift,
  HelpCircle,
  X,
  Plus,
} from "lucide-react";

interface FormData {
  title: string;
  description: string;
  location: string;
  salary: string;
  employmentType: string;
  experienceLevel: string;
  remotePolicy: string;
  visaSponsorship: boolean;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  benefits: string[];
  screeningQuestions: string[];
  applicationMode: "resume_only" | "resume_plus_form" | "form_only";
  aiShortlistThreshold: number;
  aiMinAtsScore: number;
}

const STEPS = [
  { id: 1, label: "Basics", icon: Briefcase, description: "Title & overview" },
  { id: 2, label: "Location & Pay", icon: MapPin, description: "Location & compensation" },
  { id: 3, label: "Requirements", icon: FileText, description: "Skills & experience" },
  { id: 4, label: "Settings", icon: Settings, description: "Screening & AI config" },
];

const skillOptions = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "react", label: "React" },
  { value: "nextjs", label: "Next.js" },
  { value: "nodejs", label: "Node.js" },
  { value: "express", label: "Express.js" },
  { value: "mongodb", label: "MongoDB" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "sql", label: "SQL" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "golang", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "aws", label: "AWS" },
  { value: "gcp", label: "GCP" },
  { value: "azure", label: "Azure" },
  { value: "docker", label: "Docker" },
  { value: "kubernetes", label: "Kubernetes" },
  { value: "git", label: "Git" },
  { value: "agile", label: "Agile / Scrum" },
  { value: "communication", label: "Communication" },
  { value: "problem-solving", label: "Problem Solving" },
  { value: "leadership", label: "Leadership" },
  { value: "figma", label: "Figma" },
  { value: "graphql", label: "GraphQL" },
  { value: "redis", label: "Redis" },
  { value: "machine-learning", label: "Machine Learning" },
  { value: "data-analysis", label: "Data Analysis" },
];

const TEMPLATES = [
  {
    id: "software-engineer",
    label: "Software Engineer",
    icon: "💻",
    title: "Senior Software Engineer",
    description: "We are looking for a talented and experienced Senior Software Engineer to join our growing engineering team. You will design, build, and maintain high-quality software solutions while mentoring junior engineers and collaborating with cross-functional teams to deliver exceptional products.",
    requirements: [
      "Bachelor's degree in Computer Science or equivalent",
      "5+ years of professional software development experience",
      "Strong proficiency in JavaScript/TypeScript and modern frameworks",
      "Experience with cloud platforms (AWS/GCP/Azure)",
      "Solid understanding of software design patterns and best practices",
    ],
    responsibilities: [
      "Design and develop scalable, maintainable software systems",
      "Lead technical discussions and code reviews",
      "Collaborate with product and design teams on feature development",
      "Mentor junior developers and promote engineering best practices",
      "Contribute to architectural decisions and technical roadmap",
    ],
    skills: ["javascript", "typescript", "react", "nodejs", "aws", "docker"],
    employmentType: "Full-time",
    experienceLevel: "Senior",
    benefits: ["Competitive salary + equity", "Health, dental & vision insurance", "Remote-friendly work environment", "Learning & development budget", "401(k) with company match"],
  },
  {
    id: "product-manager",
    label: "Product Manager",
    icon: "🎯",
    title: "Product Manager",
    description: "We are seeking a strategic Product Manager to own the product vision and roadmap for our core product. You will work closely with engineering, design, and business stakeholders to deliver user-centric features that drive growth and delight customers.",
    requirements: [
      "3+ years of product management experience",
      "Strong analytical and data-driven decision making skills",
      "Excellent communication and stakeholder management",
      "Experience with agile methodologies and sprint planning",
      "Proven track record of shipping successful products",
    ],
    responsibilities: [
      "Define and own the product strategy and roadmap",
      "Gather and prioritize product requirements from stakeholders",
      "Work with engineering to deliver features on time",
      "Analyze user feedback and market trends",
      "Define success metrics and track product performance",
    ],
    skills: ["agile", "communication", "problem-solving", "leadership", "data-analysis"],
    employmentType: "Full-time",
    experienceLevel: "Mid",
    benefits: ["Competitive compensation", "Comprehensive health benefits", "Flexible PTO policy", "Learning budget", "Stock options"],
  },
  {
    id: "data-scientist",
    label: "Data Scientist",
    icon: "📊",
    title: "Data Scientist",
    description: "Join our data team to unlock insights from our rich datasets and build predictive models that power business decisions. You will work on challenging ML problems and collaborate with product and engineering to bring data-driven features to life.",
    requirements: [
      "Master's or PhD in Data Science, Statistics, or related field",
      "3+ years of experience in data science or machine learning",
      "Strong proficiency in Python and ML frameworks (scikit-learn, TensorFlow, PyTorch)",
      "Experience with SQL and large-scale data processing",
      "Excellent statistical knowledge and analytical skills",
    ],
    responsibilities: [
      "Build and deploy predictive machine learning models",
      "Analyze large datasets to identify trends and opportunities",
      "Collaborate with engineering to productize ML models",
      "Present findings and insights to leadership",
      "Define and track key performance metrics",
    ],
    skills: ["python", "sql", "machine-learning", "data-analysis", "aws"],
    employmentType: "Full-time",
    experienceLevel: "Mid",
    benefits: ["Top-tier salary", "Health & wellness benefits", "Conference & training budget", "Flexible schedule", "Cutting-edge ML infrastructure"],
  },
  {
    id: "ux-designer",
    label: "UX Designer",
    icon: "🎨",
    title: "Senior UX/UI Designer",
    description: "We are looking for a talented Senior UX/UI Designer who is passionate about creating beautiful, intuitive product experiences. You will own the end-to-end design process from discovery to delivery, working closely with product and engineering.",
    requirements: [
      "5+ years of UX/UI design experience",
      "Strong portfolio demonstrating user-centered design",
      "Proficiency in Figma and modern design tools",
      "Experience with user research and usability testing",
      "Knowledge of accessibility standards (WCAG)",
    ],
    responsibilities: [
      "Lead UX research and translate insights into design solutions",
      "Create wireframes, prototypes, and high-fidelity designs",
      "Build and maintain the company design system",
      "Collaborate with engineers to ensure pixel-perfect implementation",
      "Champion accessibility and inclusive design practices",
    ],
    skills: ["figma", "communication", "problem-solving"],
    employmentType: "Full-time",
    experienceLevel: "Senior",
    benefits: ["Competitive salary", "Creative work environment", "Design tool budget", "Flexible hours", "Remote options"],
  },
];

const defaultForm: FormData = {
  title: "",
  description: "",
  location: "",
  salary: "",
  employmentType: "",
  experienceLevel: "",
  remotePolicy: "",
  visaSponsorship: false,
  requirements: [],
  responsibilities: [],
  skills: [],
  benefits: [],
  screeningQuestions: [],
  applicationMode: "resume_plus_form",
  aiShortlistThreshold: 70,
  aiMinAtsScore: 60,
};

function ListEditor({
  label,
  icon: Icon,
  items,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState("");

  const addItem = () => {
    const trimmed = draft.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setDraft("");
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addItem(); }
          }}
          placeholder={placeholder}
          className="text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="shrink-0">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1.5 mt-1">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 group rounded-lg border bg-muted/30 px-3 py-2 text-sm"
            >
              <span className="flex-1 leading-snug">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-muted-foreground hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CreateJobPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const applyTemplate = (templateId: string) => {
    const t = TEMPLATES.find((t) => t.id === templateId);
    if (!t) return;
    setForm((prev) => ({
      ...prev,
      title: t.title,
      description: t.description,
      requirements: t.requirements,
      responsibilities: t.responsibilities,
      skills: t.skills,
      employmentType: t.employmentType,
      experienceLevel: t.experienceLevel,
      benefits: t.benefits,
    }));
    toast({ title: "Template applied", description: `"${t.label}" template loaded. Customize as needed.` });
  };

  const isStep1Valid = form.title.trim() && form.description.trim() && form.employmentType;
  const isStep2Valid = form.location.trim();
  const isStep3Valid = form.requirements.length > 0 && form.responsibilities.length > 0;

  const canNext = step === 1 ? isStep1Valid : step === 2 ? isStep2Valid : step === 3 ? isStep3Valid : true;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          location: form.location,
          salary: form.salary,
          employmentType: form.employmentType,
          experienceLevel: form.experienceLevel || undefined,
          remotePolicy: form.remotePolicy || undefined,
          visaSponsorship: form.visaSponsorship,
          requirements: form.requirements,
          responsibilities: form.responsibilities,
          skills: form.skills,
          benefits: form.benefits,
          screeningQuestions: form.screeningQuestions,
          applicationMode: form.applicationMode,
          aiShortlistThreshold: form.aiShortlistThreshold,
          aiMinAtsScore: form.aiMinAtsScore,
        }),
      });
      if (res.ok) {
        toast({ title: "Job posted!", description: "Your job is now live and attracting candidates." });
        router.push("/dashboard/recruiter/job-descriptions");
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Failed to post job", description: err.message || "Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Please check your connection.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const completedSteps = [
    !!isStep1Valid,
    !!isStep2Valid,
    !!isStep3Valid,
    true,
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/dashboard/recruiter" className="hover:text-foreground transition-colors">Dashboard</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/dashboard/recruiter/job-descriptions" className="hover:text-foreground transition-colors">Jobs</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Create</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Post a New Job</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fill in the details below to create a compelling job posting</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          className="shrink-0"
        >
          {showPreview ? <EyeOff className="mr-2 h-3.5 w-3.5" /> : <Eye className="mr-2 h-3.5 w-3.5" />}
          {showPreview ? "Hide Preview" : "Live Preview"}
        </Button>
      </div>

      <div className={`grid gap-6 ${showPreview ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        {/* Left: Form */}
        <div className="space-y-6">
          {/* Step Indicator */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => {
                const isActive = step === s.id;
                const isDone = completedSteps[i] && step > s.id;
                return (
                  <div
                    key={s.id}
                    className={`flex-1 flex flex-col items-center gap-1.5 cursor-pointer group ${i < STEPS.length - 1 ? "relative" : ""}`}
                    onClick={() => {
                      if (s.id < step || (s.id === step + 1 && canNext)) setStep(s.id);
                    }}
                  >
                    {/* Connector line */}
                    {i < STEPS.length - 1 && (
                      <div className={`absolute left-1/2 top-4 w-full h-0.5 -z-0 transition-colors ${isDone ? "bg-violet-500" : "bg-muted"}`} />
                    )}
                    {/* Circle */}
                    <div
                      className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all border-2 ${
                        isDone
                          ? "bg-violet-600 border-violet-600 text-white"
                          : isActive
                          ? "bg-white border-violet-600 text-violet-600 shadow-md shadow-violet-100"
                          : "bg-white border-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-medium ${isActive ? "text-violet-700" : "text-muted-foreground"}`}>{s.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Templates (Step 1 only) */}
          {step === 1 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Quick-start templates
                </CardTitle>
                <CardDescription className="text-xs">Choose a template to pre-fill the form, then customize</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t.id)}
                      className="flex items-center gap-2.5 rounded-lg border bg-muted/30 hover:bg-violet-50 hover:border-violet-200 px-3 py-2.5 text-left transition-all group"
                    >
                      <span className="text-lg">{t.icon}</span>
                      <div>
                        <p className="text-xs font-semibold group-hover:text-violet-700 transition-colors">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.employmentType}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step Content */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                {(() => {
                  const StepIcon = STEPS[step - 1].icon;
                  return (
                    <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center">
                      <StepIcon className="h-4.5 w-4.5 text-violet-600" />
                    </div>
                  );
                })()}
                <div>
                  <CardTitle className="text-base">Step {step}: {STEPS[step - 1].label}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">{STEPS[step - 1].description}</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* STEP 1: Basics */}
              {step === 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Job Title <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="e.g. Senior Software Engineer"
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Use a clear, specific title that candidates search for</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-sm font-medium">
                      Job Description <span className="text-rose-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      rows={7}
                      placeholder="Describe the role, your team, and what makes this opportunity exciting..."
                      className="text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {form.description.length} characters — aim for 300+ for best results
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Employment Type <span className="text-rose-500">*</span>
                      </Label>
                      <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v)}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Temporary">Temporary</SelectItem>
                          <SelectItem value="Internship">Internship</SelectItem>
                          <SelectItem value="Freelance">Freelance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Experience Level</Label>
                      <Select value={form.experienceLevel} onValueChange={(v) => set("experienceLevel", v)}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Intern">Intern</SelectItem>
                          <SelectItem value="Junior">Junior (0–2 yrs)</SelectItem>
                          <SelectItem value="Mid">Mid-level (2–5 yrs)</SelectItem>
                          <SelectItem value="Senior">Senior (5+ yrs)</SelectItem>
                          <SelectItem value="Lead">Lead / Staff</SelectItem>
                          <SelectItem value="Manager">Manager / Director</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}

              {/* STEP 2: Location & Compensation */}
              {step === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="location" className="text-sm font-medium">
                        Location <span className="text-rose-500">*</span>
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          id="location"
                          value={form.location}
                          onChange={(e) => set("location", e.target.value)}
                          placeholder="e.g. San Francisco, CA"
                          className="pl-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Remote Policy</Label>
                      <Select value={form.remotePolicy} onValueChange={(v) => set("remotePolicy", v)}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select policy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Onsite">
                            <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />Onsite</span>
                          </SelectItem>
                          <SelectItem value="Hybrid">
                            <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />Hybrid</span>
                          </SelectItem>
                          <SelectItem value="Remote">
                            <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />Fully Remote</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="salary" className="text-sm font-medium">Salary / Compensation</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        id="salary"
                        value={form.salary}
                        onChange={(e) => set("salary", e.target.value)}
                        placeholder="e.g. $120,000 – $160,000 / year"
                        className="pl-8 text-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Jobs with salary ranges receive 40% more applications on average</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Visa Sponsorship</Label>
                    <div className="flex gap-3">
                      {[
                        { value: false, label: "Not offered", desc: "No visa sponsorship" },
                        { value: true, label: "Available", desc: "We sponsor work visas" },
                      ].map((opt) => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() => set("visaSponsorship", opt.value)}
                          className={`flex-1 rounded-lg border px-3 py-2.5 text-left transition-all text-sm ${
                            form.visaSponsorship === opt.value
                              ? "border-violet-500 bg-violet-50"
                              : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <p className="font-medium text-xs">{opt.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <ListEditor
                    label="Benefits & Perks"
                    icon={Gift}
                    items={form.benefits}
                    onChange={(v) => set("benefits", v)}
                    placeholder="e.g. Health insurance, 401(k) match, Unlimited PTO"
                    hint="Great benefits attract better candidates — be specific"
                  />
                </>
              )}

              {/* STEP 3: Requirements & Skills */}
              {step === 3 && (
                <>
                  <ListEditor
                    label="Requirements"
                    icon={ShieldCheck}
                    items={form.requirements}
                    onChange={(v) => set("requirements", v)}
                    placeholder="e.g. 5+ years of Python experience"
                    hint="List qualifications candidates must have. Press Enter to add each one."
                  />

                  <ListEditor
                    label="Responsibilities"
                    icon={Target}
                    items={form.responsibilities}
                    onChange={(v) => set("responsibilities", v)}
                    placeholder="e.g. Lead architecture decisions for the platform"
                    hint="Describe day-to-day activities and key deliverables"
                  />

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Required Skills</Label>
                    <p className="text-xs text-muted-foreground">These are used for AI matching — select all relevant skills</p>
                    <MultiSelect
                      options={skillOptions}
                      selected={form.skills}
                      onSelect={(v) => set("skills", v)}
                      placeholder="Search and select skills..."
                    />
                    {form.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.skills.map((s, i) => (
                          <Badge key={i} className="bg-violet-100 text-violet-700 border-0 text-xs gap-1.5">
                            {skillOptions.find((o) => o.value === s)?.label || s}
                            <button type="button" onClick={() => set("skills", form.skills.filter((_, idx) => idx !== i))}>
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* STEP 4: Settings */}
              {step === 4 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Application Mode</Label>
                    <p className="text-xs text-muted-foreground">Choose how candidates apply to this role</p>
                    <div className="space-y-2 mt-2">
                      {[
                        {
                          value: "resume_only",
                          label: "Resume only",
                          desc: "Candidates submit their resume. Fast and simple.",
                          icon: FileText,
                        },
                        {
                          value: "resume_plus_form",
                          label: "Resume + Application form",
                          desc: "Recommended — resume plus custom screening questions.",
                          icon: Star,
                          recommended: true,
                        },
                        {
                          value: "form_only",
                          label: "Application form only",
                          desc: "Custom questions only, no resume required.",
                          icon: HelpCircle,
                        },
                      ].map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          onClick={() => set("applicationMode", mode.value as FormData["applicationMode"])}
                          className={`w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all ${
                            form.applicationMode === mode.value
                              ? "border-violet-500 bg-violet-50"
                              : "border-muted hover:border-muted-foreground/30"
                          }`}
                        >
                          <mode.icon className={`h-4 w-4 shrink-0 ${form.applicationMode === mode.value ? "text-violet-600" : "text-muted-foreground"}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{mode.label}</p>
                              {mode.recommended && (
                                <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Recommended</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{mode.desc}</p>
                          </div>
                          {form.applicationMode === mode.value && (
                            <CheckCircle2 className="h-4 w-4 text-violet-600 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ListEditor
                    label="Screening Questions"
                    icon={HelpCircle}
                    items={form.screeningQuestions}
                    onChange={(v) => set("screeningQuestions", v)}
                    placeholder="e.g. Describe a complex technical problem you solved"
                    hint="Optional — candidates answer these when applying"
                  />

                  {/* AI Settings */}
                  <div className="rounded-xl border bg-gradient-to-br from-violet-50 to-indigo-50 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-violet-600" />
                      <p className="text-sm font-semibold text-violet-800">AI Screening Settings</p>
                    </div>
                    <p className="text-xs text-violet-600/80">Configure how the AI auto-screens and scores candidates for this job</p>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-violet-800">Auto-shortlist threshold</Label>
                          <span className="text-sm font-bold text-violet-700">{form.aiShortlistThreshold}%</span>
                        </div>
                        <input
                          type="range"
                          min={40}
                          max={95}
                          step={5}
                          value={form.aiShortlistThreshold}
                          onChange={(e) => set("aiShortlistThreshold", Number(e.target.value))}
                          className="w-full accent-violet-600"
                        />
                        <div className="flex justify-between text-xs text-violet-500">
                          <span>40% (more candidates)</span>
                          <span>95% (very selective)</span>
                        </div>
                        <p className="text-xs text-violet-600/70">
                          Candidates scoring above this threshold are automatically shortlisted
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-violet-800">Minimum ATS score</Label>
                          <span className="text-sm font-bold text-violet-700">{form.aiMinAtsScore}%</span>
                        </div>
                        <input
                          type="range"
                          min={30}
                          max={90}
                          step={5}
                          value={form.aiMinAtsScore}
                          onChange={(e) => set("aiMinAtsScore", Number(e.target.value))}
                          className="w-full accent-violet-600"
                        />
                        <div className="flex justify-between text-xs text-violet-500">
                          <span>30% (inclusive)</span>
                          <span>90% (strict)</span>
                        </div>
                        <p className="text-xs text-violet-600/70">
                          Candidates below this ATS score are auto-filtered out
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : router.push("/dashboard/recruiter/job-descriptions")}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {step === 1 ? "Cancel" : "Back"}
            </Button>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${
                    step === s.id ? "w-6 bg-violet-600" : completedSteps[i] ? "w-3 bg-violet-300" : "w-3 bg-muted"
                  }`}
                />
              ))}
            </div>

            {step < 4 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canNext}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !isStep1Valid || !isStep2Valid || !isStep3Valid}
                className="bg-violet-600 hover:bg-violet-700 gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Post Job
              </Button>
            )}
          </div>

          {/* Validation hints */}
          {step < 4 && !canNext && (
            <p className="text-xs text-amber-600 text-center">
              {step === 1 && "Please fill in the job title, description, and employment type to continue"}
              {step === 2 && "Please enter a location to continue"}
              {step === 3 && "Add at least one requirement and one responsibility to continue"}
            </p>
          )}
        </div>

        {/* Right: Live Preview */}
        {showPreview && (
          <div className="lg:sticky lg:top-6 space-y-4 self-start">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Live Preview</h3>
              <Badge variant="outline" className="text-xs">As candidates see it</Badge>
            </div>

            <Card className="border shadow-sm overflow-hidden">
              {/* Preview Header */}
              <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white">
                <h2 className="text-lg font-bold">{form.title || "Job Title"}</h2>
                <div className="flex flex-wrap gap-3 mt-2 text-white/80 text-sm">
                  {form.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />{form.location}
                    </span>
                  )}
                  {form.employmentType && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />{form.employmentType}
                    </span>
                  )}
                  {form.salary && (
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />{form.salary}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {form.experienceLevel && (
                    <Badge className="bg-white/20 text-white border-0 text-xs">{form.experienceLevel}</Badge>
                  )}
                  {form.remotePolicy && (
                    <Badge className="bg-white/20 text-white border-0 text-xs">{form.remotePolicy}</Badge>
                  )}
                  {form.visaSponsorship && (
                    <Badge className="bg-white/20 text-white border-0 text-xs">Visa Sponsorship</Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-5 space-y-5">
                {form.description && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">About this role</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{form.description}</p>
                  </div>
                )}

                {form.requirements.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-violet-500" />Requirements
                    </h4>
                    <ul className="space-y-1.5">
                      {form.requirements.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Star className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {form.responsibilities.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />Responsibilities
                    </h4>
                    <ul className="space-y-1.5">
                      {form.responsibilities.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ArrowRight className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {form.skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {form.skills.map((s, i) => (
                        <Badge key={i} className="bg-violet-100 text-violet-700 border-0 text-xs">
                          {skillOptions.find((o) => o.value === s)?.label || s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {form.benefits.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Gift className="h-4 w-4 text-emerald-500" />Benefits
                    </h4>
                    <ul className="space-y-1">
                      {form.benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {form.screeningQuestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-orange-500" />Application Questions
                    </h4>
                    <ol className="space-y-1.5 list-decimal list-inside">
                      {form.screeningQuestions.map((q, i) => (
                        <li key={i} className="text-sm text-muted-foreground">{q}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <Button className="w-full bg-violet-600 hover:bg-violet-700 text-sm" disabled>
                  Apply Now
                </Button>
              </CardContent>
            </Card>

            {/* Completeness indicator */}
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold">Posting completeness</p>
                  <span className="text-xs text-violet-600 font-bold">
                    {Math.round(
                      ([
                        !!form.title,
                        !!form.description,
                        !!form.employmentType,
                        !!form.location,
                        !!form.salary,
                        form.requirements.length > 0,
                        form.responsibilities.length > 0,
                        form.skills.length > 0,
                        form.benefits.length > 0,
                      ].filter(Boolean).length / 9) * 100
                    )}%
                  </span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "Job title", done: !!form.title },
                    { label: "Description", done: !!form.description },
                    { label: "Employment type", done: !!form.employmentType },
                    { label: "Location", done: !!form.location },
                    { label: "Salary range", done: !!form.salary },
                    { label: "Requirements", done: form.requirements.length > 0 },
                    { label: "Responsibilities", done: form.responsibilities.length > 0 },
                    { label: "Skills", done: form.skills.length > 0 },
                    { label: "Benefits", done: form.benefits.length > 0 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      {item.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                      )}
                      <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
