"use client";

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
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Minus,
  Save,
  FileText,
  Zap,
  Download,
  Eye,
  EyeOff,
  Wand2,
  ArrowUp,
  ArrowDown,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { ResumePreview } from "@/components/resume-preview";
import { TemplateSelector } from "@/components/template-selector";
import { exportToPDF, exportToHTML } from "@/utils/pdf-export";
import { exportToDoc } from "@/utils/doc-export";
import { format, parseISO } from "date-fns";
import { Switch } from "@/components/ui/switch";

interface PersonalInfo {
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  address?: string;
}

interface Experience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  description: string[];
}

interface Education {
  degree: string;
  major?: string;
  institution: string;
  location?: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
}

interface Project {
  title: string;
  description?: string;
  technologies?: string[];
  url?: string;
}

interface Certification {
  name: string;
  issuer?: string;
  issueDate?: string;
}

interface Award {
  name: string;
  date?: string;
  description?: string;
}

interface StructuredResume {
  personalInfo: PersonalInfo;
  summary?: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications: Certification[];
  awards: Award[];
  languages?: string[];
  interests?: string[];
}

const defaultResume: StructuredResume = {
  personalInfo: { name: "", email: "", phone: "" },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  awards: [],
  languages: [],
  interests: [],
};

const faangSkillsOptions = [
  // Programming Languages
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "cpp", label: "C++" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },

  // Frontend
  { value: "react", label: "React" },
  { value: "nextjs", label: "Next.js" },
  { value: "vue", label: "Vue.js" },
  { value: "angular", label: "Angular" },
  { value: "html", label: "HTML5" },
  { value: "css", label: "CSS3" },
  { value: "tailwind", label: "Tailwind CSS" },

  // Backend
  { value: "nodejs", label: "Node.js" },
  { value: "express", label: "Express.js" },
  { value: "django", label: "Django" },
  { value: "flask", label: "Flask" },
  { value: "spring", label: "Spring Boot" },
  { value: "graphql", label: "GraphQL" },
  { value: "rest", label: "REST APIs" },

  // Databases
  { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" },
  { value: "mongodb", label: "MongoDB" },
  { value: "redis", label: "Redis" },
  { value: "elasticsearch", label: "Elasticsearch" },

  // Cloud & DevOps
  { value: "aws", label: "AWS" },
  { value: "gcp", label: "Google Cloud Platform" },
  { value: "azure", label: "Microsoft Azure" },
  { value: "docker", label: "Docker" },
  { value: "kubernetes", label: "Kubernetes" },
  { value: "terraform", label: "Terraform" },
  { value: "jenkins", label: "Jenkins" },
  { value: "github-actions", label: "GitHub Actions" },

  // Data & ML
  { value: "tensorflow", label: "TensorFlow" },
  { value: "pytorch", label: "PyTorch" },
  { value: "pandas", label: "Pandas" },
  { value: "numpy", label: "NumPy" },
  { value: "scikit-learn", label: "Scikit-learn" },
  { value: "spark", label: "Apache Spark" },

  // Tools & Others
  { value: "git", label: "Git" },
  { value: "linux", label: "Linux" },
  { value: "agile", label: "Agile/Scrum" },
  { value: "system-design", label: "System Design" },
  { value: "algorithms", label: "Data Structures & Algorithms" },
  { value: "microservices", label: "Microservices" },
  { value: "ci-cd", label: "CI/CD" },
  { value: "testing", label: "Unit Testing" },
];

const faangTips = [
  "Quantify your impact with specific metrics (e.g., 'Improved performance by 40%')",
  "Use action verbs like 'Built', 'Designed', 'Optimized', 'Led', 'Implemented'",
  "Highlight system design and scalability achievements",
  "Include relevant side projects and open-source contributions",
  "Emphasize leadership and cross-functional collaboration",
  "Show progression in responsibility and technical complexity",
  "Include specific technologies used in each role",
  "Demonstrate problem-solving with concrete examples",
];

export default function ResumeBuilderPage() {
  const [resume, setResume] = useState<StructuredResume>(defaultResume);
  const [selectedTemplate, setSelectedTemplate] = useState("faang");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showFAANGTips, setShowFAANGTips] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [themeAccent, setThemeAccent] = useState<string>("#7c3aed");
  const [themeFont, setThemeFont] = useState<string>("");
  const [jobDesc, setJobDesc] = useState<string>("");
  const [sections, setSections] = useState({
    summary: true,
    skills: true,
    experience: true,
    projects: true,
    education: true,
    certifications: true,
    awards: true,
    languages: true,
    interests: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    // Try restore from localStorage first
    const saved = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderData") : null;
    const savedTemplate = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderTemplate") : null;
    const savedScale = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderScale") : null;
    const savedSections = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderSections") : null;
    const savedAccent = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderAccent") : null;
    const savedFont = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderFont") : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setResume(parsed);
        if (savedTemplate) setSelectedTemplate(savedTemplate);
        if (savedScale) setFontScale(parseFloat(savedScale));
        if (savedSections) setSections(JSON.parse(savedSections));
        if (savedAccent) setThemeAccent(savedAccent);
        if (savedFont) setThemeFont(savedFont);
        setLoading(false);
        return;
      } catch {}
    }
    fetchResume();
  }, []);

  // Autosave (debounced)
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem("resumeBuilderData", JSON.stringify(resume));
        localStorage.setItem("resumeBuilderTemplate", selectedTemplate);
        localStorage.setItem("resumeBuilderScale", String(fontScale));
        localStorage.setItem("resumeBuilderSections", JSON.stringify(sections));
        localStorage.setItem("resumeBuilderAccent", themeAccent);
        localStorage.setItem("resumeBuilderFont", themeFont);
      } catch {}
    }, 800);
    return () => clearTimeout(t);
  }, [resume, selectedTemplate, fontScale, sections, themeAccent, themeFont, loading]);

  const fetchResume = async () => {
    setLoading(true);
    try {
      // Simulated API call - replace with your actual API
      const response = await fetch("/api/structured-resume/my-resume");
      if (response.ok) {
        const data = await response.json();
        // Format dates for form inputs
        const formattedData = {
          ...data,
          experience:
            data.experience?.map((exp: Experience) => ({
              ...exp,
              startDate: exp.startDate
                ? format(parseISO(exp.startDate), "yyyy-MM")
                : "",
              endDate: exp.endDate
                ? format(parseISO(exp.endDate), "yyyy-MM")
                : "",
            })) || [],
          education:
            data.education?.map((edu: Education) => ({
              ...edu,
              startDate: edu.startDate
                ? format(parseISO(edu.startDate), "yyyy-MM")
                : "",
              endDate: edu.endDate
                ? format(parseISO(edu.endDate), "yyyy-MM")
                : "",
            })) || [],
          certifications:
            data.certifications?.map((cert: Certification) => ({
              ...cert,
              issueDate: cert.issueDate
                ? format(parseISO(cert.issueDate), "yyyy-MM-dd")
                : "",
            })) || [],
          awards:
            data.awards?.map((award: Award) => ({
              ...award,
              date: award.date
                ? format(parseISO(award.date), "yyyy-MM-dd")
                : "",
            })) || [],
        };

  const tailorBulletsFromJD = (index: number) => {
    const jd = jobDesc.toLowerCase();
    const want = (kw: string) => jd.includes(kw.toLowerCase());
    const exp = resume.experience[index];
    const tech = resume.skills.slice(0, 8);
    const picked = tech.filter((t) => want(t));
    const techLine = (picked.length ? picked : tech).slice(0, 5).join(", ");
    const role = exp.title || "Engineer";
    const bullets = [
      `${role} experience aligning with JD: ${techLine}.` ,
      want("scale") || want("scalable")
        ? "Designed and scaled services to handle high traffic with robust monitoring and alerting."
        : "Delivered reliable features with strong testing and review practices.",
      want("performance")
        ? "Optimized performance (p95 latency and throughput), improving user experience measurably."
        : "Streamlined workflows to improve developer velocity and quality.",
      want("lead") || want("leadership")
        ? "Led cross-functional collaboration and mentored teammates to hit deadlines."
        : "Collaborated with PM/Design to deliver on-time releases.",
    ];
    setResume((prev) => {
      const next = [...prev.experience];
      next[index] = { ...next[index], description: bullets } as Experience;
      return { ...prev, experience: next };
    });
  };

  const getValidationIssues = (): string[] => {
    const issues: string[] = [];
    if (!resume.personalInfo.name?.trim()) issues.push("Full Name is required");
    if (!resume.personalInfo.email?.trim()) issues.push("Email is required");
    resume.experience.forEach((e, i) => {
      if (!e.title?.trim()) issues.push(`Experience #${i + 1}: title`);
      if (!e.company?.trim()) issues.push(`Experience #${i + 1}: company`);
      if (!e.startDate?.trim()) issues.push(`Experience #${i + 1}: start date`);
    });
    resume.education.forEach((e, i) => {
      if (!e.degree?.trim()) issues.push(`Education #${i + 1}: degree`);
      if (!e.institution?.trim()) issues.push(`Education #${i + 1}: institution`);
    });
    return issues;
  };
        setResume(formattedData);
      } else if (response.status === 404) {
        setResume(defaultResume);
      }
    } catch (error) {
      console.error("Error fetching resume:", error);
      setResume(defaultResume);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResume = async () => {
    setSaving(true);
    try {
      const issues = getValidationIssues();
      if (issues.length) {
        toast({
          title: "Some required info is missing",
          description: issues.join("; "),
          variant: "destructive",
        });
      }
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "Resume Saved",
        description: "Your FAANG-optimized resume has been successfully saved.",
      });
    } catch (error) {
      console.error("Save resume error:", error);
      toast({
        title: "Resume Saved",
        description: "Your resume has been saved locally.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const issues = getValidationIssues();
      if (issues.length) {
        toast({
          title: "Validation warnings",
          description: "Fix required fields before applying to jobs: " + issues.slice(0, 3).join("; ") + (issues.length > 3 ? " …" : ""),
          variant: "destructive",
        });
      }
      const success = await exportToPDF(
        "resume-preview",
        `${resume.personalInfo.name || "resume"}.pdf`
      );
      if (success) {
        toast({
          title: "Print Dialog Opened",
          description:
            "Use your browser's print dialog to save as PDF or print your resume.",
        });
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description:
          "There was an error opening the print dialog. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportHTML = async () => {
    try {
      const issues = getValidationIssues();
      if (issues.length) {
        toast({
          title: "Validation warnings",
          description: "Some required fields are missing: " + issues.join(", "),
          variant: "destructive",
        });
      }
      const success = exportToHTML(
        "resume-preview",
        `${resume.personalInfo.name || "resume"}.html`
      );
      if (success) {
        toast({
          title: "HTML Downloaded",
          description:
            "Your resume has been downloaded as an HTML file. You can open it in any browser and print to PDF.",
        });
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description:
          "There was an error exporting your resume. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updatePersonalInfo = (field: keyof PersonalInfo, value: string) => {
    setResume((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value },
    }));
  };

  const addExperience = () => {
    setResume((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { title: "", company: "", startDate: "", description: [""] },
      ],
    }));
  };

  const updateExperience = (
    index: number,
    field: keyof Experience,
    value: string | string[]
  ) => {
    setResume((prev) => {
      const newExperience = [...prev.experience];
      if (field === "description" && typeof value === "string") {
        newExperience[index][field] = value
          .split("\n")
          .filter((line) => line.trim() !== "");
      } else {
        (newExperience[index] as any)[field] = value;
      }
      return { ...prev, experience: newExperience };
    });
  };

  // Reorder helpers
  const moveItem = <T,>(arr: T[], from: number, to: number) => {
    const copy = [...arr];
    if (to < 0 || to >= copy.length) return copy;
    const [it] = copy.splice(from, 1);
    copy.splice(to, 0, it);
    return copy;
  };
  const moveExperience = (from: number, to: number) =>
    setResume((prev) => ({ ...prev, experience: moveItem(prev.experience, from, to) }));
  const moveProject = (from: number, to: number) =>
    setResume((prev) => ({ ...prev, projects: moveItem(prev.projects, from, to) }));
  const moveEducation = (from: number, to: number) =>
    setResume((prev) => ({ ...prev, education: moveItem(prev.education, from, to) }));

  // Smart bullet generator (heuristic, local)
  const generateBulletsForExperience = (index: number) => {
    const exp = resume.experience[index];
    const techHint = resume.skills.slice(0, 6).join(", ");
    const company = exp.company || "the company";
    const role = exp.title || "Engineer";
    const bullets = [
      `Built and shipped features in ${role} role using ${techHint}, improving key KPIs by 15-30%.`,
      `Led cross-functional collaboration with product/design to deliver on-time releases across ${company}.`,
      `Optimized performance and reliability (p95 latency, error rate), cutting costs and boosting UX.`,
      `Implemented automated testing/CI, raising coverage to 85%+ and reducing regressions.`,
    ];
    setResume((prev) => {
      const next = [...prev.experience];
      next[index] = { ...next[index], description: bullets } as Experience;
      return { ...prev, experience: next };
    });
  };

  const refineBulletsForExperience = (index: number) => {
    const exp = resume.experience[index];
    const verbs = ["Built", "Led", "Implemented", "Optimized", "Designed", "Automated", "Migrated", "Improved", "Launched"];
    const ensureVerb = (s: string) => {
      const t = s.trim().replace(/^[-•\s]+/, "");
      const cap = t.charAt(0).toUpperCase() + t.slice(1);
      const hasVerb = verbs.some((v) => cap.startsWith(v + " "));
      return hasVerb ? cap : `${verbs[0]} ${cap}`;
    };
    const quantified = exp.description.map((d) => {
      const base = ensureVerb(d).replace(/\.+$/g, "");
      const hasNumber = /\d/.test(base);
      return hasNumber ? `${base}.` : `${base} (result: +20% perf / -30% costs).`;
    });
    setResume((prev) => {
      const next = [...prev.experience];
      next[index] = { ...next[index], description: quantified } as Experience;
      return { ...prev, experience: next };
    });
  };

  const removeExperience = (index: number) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  const addEducation = () => {
    setResume((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { degree: "", institution: "", startDate: "" },
      ],
    }));
  };

  const updateEducation = (
    index: number,
    field: keyof Education,
    value: string
  ) => {
    setResume((prev) => {
      const newEducation = [...prev.education];
      (newEducation[index] as any)[field] = value;
      return { ...prev, education: newEducation };
    });
  };

  const removeEducation = (index: number) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  const addProject = () => {
    setResume((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { title: "", description: "", technologies: [] },
      ],
    }));
  };

  const updateProject = (
    index: number,
    field: keyof Project,
    value: string | string[]
  ) => {
    setResume((prev) => {
      const newProjects = [...prev.projects];
      (newProjects[index] as any)[field] = value;
      return { ...prev, projects: newProjects };
    });
  };

  const removeProject = (index: number) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  const addCertification = () => {
    setResume((prev) => ({
      ...prev,
      certifications: [...prev.certifications, { name: "" }],
    }));
  };

  const updateCertification = (
    index: number,
    field: keyof Certification,
    value: string
  ) => {
    setResume((prev) => {
      const newCerts = [...prev.certifications];
      (newCerts[index] as any)[field] = value;
      return { ...prev, certifications: newCerts };
    });
  };

  const removeCertification = (index: number) => {
    setResume((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const addAward = () => {
    setResume((prev) => ({
      ...prev,
      awards: [...prev.awards, { name: "" }],
    }));
  };

  const updateAward = (index: number, field: keyof Award, value: string) => {
    setResume((prev) => {
      const newAwards = [...prev.awards];
      (newAwards[index] as any)[field] = value;
      return { ...prev, awards: newAwards };
    });
  };

  const removeAward = (index: number) => {
    setResume((prev) => ({
      ...prev,
      awards: prev.awards.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading FAANG resume builder...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Left Panel - Form */}
        <div
          className={`${
            showPreview ? "w-1/2" : "w-full"
          } p-6 space-y-6 overflow-y-auto max-h-screen`}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <FileText className="h-8 w-8 text-purple-600" />
                FAANG Resume Builder
              </h1>
              <p className="text-muted-foreground mt-2">
                Build a resume optimized for top tech companies like Google,
                Apple, Facebook, Amazon, Netflix
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2"
              >
                {showPreview ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showPreview ? "Hide" : "Show"} Preview
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFAANGTips(!showFAANGTips)}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                FAANG Tips
              </Button>
              {/* Zoom controls */}
              <div className="hidden sm:flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setFontScale((s) => Math.max(0.85, parseFloat((s - 0.05).toFixed(2))))}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs w-10 text-center">{Math.round(fontScale * 100)}%</span>
                <Button variant="outline" size="icon" onClick={() => setFontScale((s) => Math.min(1.25, parseFloat((s + 0.05).toFixed(2))))}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={handleExportPDF}
                disabled={exporting}
                variant="outline"
              >
                {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Download className="mr-2 h-4 w-4" />
                Print/PDF
              </Button>
              <Button onClick={handleExportHTML} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export HTML
              </Button>
              <Button onClick={() => exportToDoc("resume-preview", `${resume.personalInfo.name || "resume"}.doc`)} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export DOC
              </Button>
              <Button onClick={handleSaveResume} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>

          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Resume Template</CardTitle>
              <CardDescription>
                Choose a template optimized for your target companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateSelector
                selectedTemplate={selectedTemplate}
                onTemplateSelect={setSelectedTemplate}
              />
            </CardContent>
          </Card>

          {/* Theme */}
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Customize accent color and font family</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <Label className="mb-1 block">Accent Color</Label>
                <Input type="color" value={themeAccent} onChange={(e) => setThemeAccent(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="mb-1 block">Font Family</Label>
                <select
                  value={themeFont}
                  onChange={(e) => setThemeFont(e.target.value)}
                  className="w-full border rounded-md h-9 px-3 text-sm bg-white"
                >
                  <option value="">System Default</option>
                  <option value="Inter, ui-sans-serif, system-ui, -apple-system">Inter</option>
                  <option value="Georgia, 'Times New Roman', serif">Serif (Georgia)</option>
                  <option value="'Segoe UI', Roboto, Helvetica, Arial, sans-serif">Segoe/Roboto</option>
                  <option value="'Source Sans Pro', Arial, sans-serif">Source Sans</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Section Toggles */}
          <Card>
            <CardHeader>
              <CardTitle>Sections</CardTitle>
              <CardDescription>Show or hide sections in your resume and preview</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(sections).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between border rounded-md p-2">
                  <span className="capitalize text-sm">{key}</span>
                  <Switch checked={val as boolean} onCheckedChange={(v) => setSections((s) => ({ ...s, [key]: v }))} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* FAANG Tips */}
          {showFAANGTips && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  FAANG Resume Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {faangTips.map((tip, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-blue-700"
                    >
                      <span className="text-blue-500 mt-1">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your contact details and professional profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={resume.personalInfo.name}
                  onChange={(e) => updatePersonalInfo("name", e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={resume.personalInfo.email}
                  onChange={(e) => updatePersonalInfo("email", e.target.value)}
                  placeholder="john.doe@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={resume.personalInfo.phone || ""}
                  onChange={(e) => updatePersonalInfo("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Location</Label>
                <Input
                  id="address"
                  value={resume.personalInfo.address || ""}
                  onChange={(e) =>
                    updatePersonalInfo("address", e.target.value)
                  }
                  placeholder="San Francisco, CA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn Profile</Label>
                <Input
                  id="linkedin"
                  value={resume.personalInfo.linkedin || ""}
                  onChange={(e) =>
                    updatePersonalInfo("linkedin", e.target.value)
                  }
                  placeholder="linkedin.com/in/johndoe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="github">GitHub Profile</Label>
                <Input
                  id="github"
                  value={resume.personalInfo.github || ""}
                  onChange={(e) => updatePersonalInfo("github", e.target.value)}
                  placeholder="github.com/johndoe"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="portfolio">Portfolio Website</Label>
                <Input
                  id="portfolio"
                  value={resume.personalInfo.portfolio || ""}
                  onChange={(e) =>
                    updatePersonalInfo("portfolio", e.target.value)
                  }
                  placeholder="www.johndoe.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Professional Summary */}
          {sections.summary && (
          <Card>
            <CardHeader>
              <CardTitle>Professional Summary</CardTitle>
              <CardDescription>
                A compelling 2-3 sentence overview highlighting your key
                achievements and value proposition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Results-driven Software Engineer with 5+ years of experience building scalable systems at high-growth startups. Led development of microservices architecture serving 10M+ users, improving system performance by 40%. Passionate about solving complex technical challenges and mentoring engineering teams."
                value={resume.summary || ""}
                onChange={(e) =>
                  setResume({ ...resume, summary: e.target.value })
                }
                rows={4}
              />
            </CardContent>
          </Card>
          )}

          {/* Technical Skills */}
          {sections.skills && (
          <Card>
            <CardHeader>
              <CardTitle>Technical Skills</CardTitle>
              <CardDescription>
                Select skills relevant to your target role. Focus on
                technologies mentioned in job descriptions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MultiSelect
                options={faangSkillsOptions}
                selected={resume.skills}
                onSelect={(selectedSkills) =>
                  setResume({ ...resume, skills: selectedSkills })
                }
                placeholder="Select your technical skills..."
              />
              <p className="text-sm text-muted-foreground mt-2">
                💡 Tip: Include both programming languages and frameworks/tools
                you've used professionally
              </p>
            </CardContent>
          </Card>
          )}

          {/* Experience */}
          {sections.experience && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Professional Experience</CardTitle>
                <CardDescription>
                  List your work history with quantified achievements
                </CardDescription>
              </div>
              <Button type="button" onClick={addExperience} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Experience
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {resume.experience.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    No experience added yet. Click "Add Experience" to get
                    started.
                  </p>
                </div>
              )}
              {resume.experience.map((exp, index) => (
                <div
                  key={index}
                  className="border p-4 rounded-md space-y-4 bg-white"
                >
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary">Experience {index + 1}</Badge>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="icon" onClick={() => moveExperience(index, index - 1)} title="Move up">
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="secondary" size="icon" onClick={() => moveExperience(index, index + 1)} title="Move down">
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => generateBulletsForExperience(index)}>
                        <Wand2 className="mr-2 h-4 w-4" /> Generate bullets
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => refineBulletsForExperience(index)}>
                        Refine
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => tailorBulletsFromJD(index)}
                        title="Tailor bullets using the job description below">
                        Tailor to JD
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeExperience(index)}
                      >
                        <Minus className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`exp-title-${index}`}>Job Title *</Label>
                      <Input
                        id={`exp-title-${index}`}
                        value={exp.title}
                        onChange={(e) =>
                          updateExperience(index, "title", e.target.value)
                        }
                        placeholder="Senior Software Engineer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`exp-company-${index}`}>Company *</Label>
                      <Input
                        id={`exp-company-${index}`}
                        value={exp.company}
                        onChange={(e) =>
                          updateExperience(index, "company", e.target.value)
                        }
                        placeholder="Google"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`exp-location-${index}`}>Location</Label>
                      <Input
                        id={`exp-location-${index}`}
                        value={exp.location || ""}
                        onChange={(e) =>
                          updateExperience(index, "location", e.target.value)
                        }
                        placeholder="Mountain View, CA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`exp-start-${index}`}>Start Date *</Label>
                      <Input
                        id={`exp-start-${index}`}
                        type="month"
                        value={exp.startDate}
                        onChange={(e) =>
                          updateExperience(index, "startDate", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`exp-end-${index}`}>
                        End Date (Leave blank if current)
                      </Label>
                      <Input
                        id={`exp-end-${index}`}
                        type="month"
                        value={exp.endDate || ""}
                        onChange={(e) =>
                          updateExperience(index, "endDate", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`exp-description-${index}`}>
                      Key Achievements & Impact
                    </Label>
                    <Textarea
                      id={`exp-description-${index}`}
                      value={exp.description.join("\n")}
                      onChange={(e) =>
                        updateExperience(index, "description", e.target.value)
                      }
                      rows={6}
                      placeholder="• Built and deployed microservices architecture serving 10M+ daily active users, reducing latency by 35%&#10;• Led cross-functional team of 8 engineers to deliver critical features 2 weeks ahead of schedule&#10;• Implemented automated testing pipeline, increasing code coverage from 60% to 95%&#10;• Optimized database queries and caching strategies, improving API response time by 50%&#10;• Mentored 3 junior engineers, with 2 receiving promotions within 6 months"
                    />
                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-sm text-blue-800 font-medium mb-1">
                        💡 FAANG Resume Tips:
                      </p>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>
                          • Start each bullet with an action verb (Built, Led,
                          Implemented, Optimized)
                        </li>
                        <li>
                          • Include specific metrics and numbers (users,
                          performance improvements, team size)
                        </li>
                        <li>• Show business impact and technical complexity</li>
                        <li>• Highlight leadership and mentoring experience</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          )}

          {/* Projects */}
          {sections.projects && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Projects</CardTitle>
                <CardDescription>
                  Showcase your best technical projects and side projects
                </CardDescription>
              </div>
              <Button type="button" onClick={addProject} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Project
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {resume.projects.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    No projects added yet. Showcase your technical projects to
                    stand out!
                  </p>
                </div>
              )}
              {resume.projects.map((proj, index) => (
                <div
                  key={index}
                  className="border p-4 rounded-md space-y-4 bg-white"
                >
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary">Project {index + 1}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => moveProject(index, index - 1)}
                    >
                      <ArrowUp className="mr-2 h-4 w-4" /> Up
                    </Button>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => moveProject(index, index + 1)}>
                        <ArrowDown className="mr-2 h-4 w-4" /> Down
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeProject(index)}>
                        <Minus className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`proj-title-${index}`}>
                        Project Title *
                      </Label>
                      <Input
                        id={`proj-title-${index}`}
                        value={proj.title}
                        onChange={(e) =>
                          updateProject(index, "title", e.target.value)
                        }
                        placeholder="Real-time Chat Application"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`proj-url-${index}`}>Project URL</Label>
                      <Input
                        id={`proj-url-${index}`}
                        value={proj.url || ""}
                        onChange={(e) =>
                          updateProject(index, "url", e.target.value)
                        }
                        placeholder="https://github.com/username/project"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`proj-description-${index}`}>
                      Description & Impact
                    </Label>
                    <Textarea
                      id={`proj-description-${index}`}
                      value={proj.description || ""}
                      onChange={(e) =>
                        updateProject(index, "description", e.target.value)
                      }
                      rows={4}
                      placeholder="Built a real-time chat application supporting 1000+ concurrent users with WebSocket connections. Implemented end-to-end encryption and message persistence. Achieved 99.9% uptime and sub-100ms message delivery."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`proj-technologies-${index}`}>
                      Technologies Used
                    </Label>
                    <Input
                      id={`proj-technologies-${index}`}
                      value={proj.technologies?.join(", ") || ""}
                      onChange={(e) =>
                        updateProject(
                          index,
                          "technologies",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean)
                        )
                      }
                      placeholder="React, Node.js, Socket.io, MongoDB, Redis, AWS"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          )}

          {/* Education */}
          {sections.education && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Education</CardTitle>
                <CardDescription>
                  Your academic background and achievements
                </CardDescription>
              </div>
              <Button type="button" onClick={addEducation} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Education
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {resume.education.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No education added yet.</p>
                </div>
              )}
              {resume.education.map((edu, index) => (
                <div
                  key={index}
                  className="border p-4 rounded-md space-y-4 bg-white"
                >
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary">Education {index + 1}</Badge>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => moveEducation(index, index - 1)}>
                        <ArrowUp className="mr-2 h-4 w-4" /> Up
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => moveEducation(index, index + 1)}>
                        <ArrowDown className="mr-2 h-4 w-4" /> Down
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeEducation(index)}>
                        <Minus className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`edu-degree-${index}`}>Degree *</Label>
                      <Input
                        id={`edu-degree-${index}`}
                        value={edu.degree}
                        onChange={(e) =>
                          updateEducation(index, "degree", e.target.value)
                        }
                        placeholder="Bachelor of Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edu-major-${index}`}>
                        Major/Field of Study
                      </Label>
                      <Input
                        id={`edu-major-${index}`}
                        value={edu.major || ""}
                        onChange={(e) =>
                          updateEducation(index, "major", e.target.value)
                        }
                        placeholder="Computer Science"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edu-institution-${index}`}>
                        Institution *
                      </Label>
                      <Input
                        id={`edu-institution-${index}`}
                        value={edu.institution}
                        onChange={(e) =>
                          updateEducation(index, "institution", e.target.value)
                        }
                        placeholder="Stanford University"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edu-location-${index}`}>Location</Label>
                      <Input
                        id={`edu-location-${index}`}
                        value={edu.location || ""}
                        onChange={(e) =>
                          updateEducation(index, "location", e.target.value)
                        }
                        placeholder="Stanford, CA"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edu-start-${index}`}>Start Date</Label>
                      <Input
                        id={`edu-start-${index}`}
                        type="month"
                        value={edu.startDate}
                        onChange={(e) =>
                          updateEducation(index, "startDate", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edu-end-${index}`}>End Date</Label>
                      <Input
                        id={`edu-end-${index}`}
                        type="month"
                        value={edu.endDate || ""}
                        onChange={(e) =>
                          updateEducation(index, "endDate", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edu-gpa-${index}`}>GPA (Optional)</Label>
                      <Input
                        id={`edu-gpa-${index}`}
                        value={edu.gpa || ""}
                        onChange={(e) =>
                          updateEducation(index, "gpa", e.target.value)
                        }
                        placeholder="3.8/4.0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          )}

          {/* Certifications */}
          {sections.certifications && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Certifications</CardTitle>
                <CardDescription>
                  Professional certifications and credentials
                </CardDescription>
              </div>
              <Button type="button" onClick={addCertification} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Certification
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {resume.certifications.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No certifications added yet.
                </p>
              )}
              {resume.certifications.map((cert, index) => (
                <div
                  key={index}
                  className="border p-4 rounded-md space-y-4 bg-white"
                >
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary">Certification {index + 1}</Badge>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeCertification(index)}
                    >
                      <Minus className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`cert-name-${index}`}>
                        Certification Name *
                      </Label>
                      <Input
                        id={`cert-name-${index}`}
                        value={cert.name}
                        onChange={(e) =>
                          updateCertification(index, "name", e.target.value)
                        }
                        placeholder="AWS Certified Solutions Architect"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`cert-issuer-${index}`}>
                        Issuing Organization
                      </Label>
                      <Input
                        id={`cert-issuer-${index}`}
                        value={cert.issuer || ""}
                        onChange={(e) =>
                          updateCertification(index, "issuer", e.target.value)
                        }
                        placeholder="Amazon Web Services"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`cert-issue-date-${index}`}>
                        Issue Date
                      </Label>
                      <Input
                        id={`cert-issue-date-${index}`}
                        type="date"
                        value={cert.issueDate || ""}
                        onChange={(e) =>
                          updateCertification(
                            index,
                            "issueDate",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          )}

          {/* Awards */}
          {sections.awards && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Awards & Achievements</CardTitle>
                <CardDescription>
                  Recognition and notable achievements
                </CardDescription>
              </div>
              <Button type="button" onClick={addAward} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Award
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {resume.awards.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No awards added yet.
                </p>
              )}
              {resume.awards.map((award, index) => (
                <div
                  key={index}
                  className="border p-4 rounded-md space-y-4 bg-white"
                >
                  <div className="flex justify-between items-start">
                    <Badge variant="secondary">Award {index + 1}</Badge>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAward(index)}
                    >
                      <Minus className="mr-2 h-4 w-4" /> Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`award-name-${index}`}>
                        Award Name *
                      </Label>
                      <Input
                        id={`award-name-${index}`}
                        value={award.name}
                        onChange={(e) =>
                          updateAward(index, "name", e.target.value)
                        }
                        placeholder="Employee of the Year"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`award-date-${index}`}>Date</Label>
                      <Input
                        id={`award-date-${index}`}
                        type="date"
                        value={award.date || ""}
                        onChange={(e) =>
                          updateAward(index, "date", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`award-description-${index}`}>
                      Description
                    </Label>
                    <Textarea
                      id={`award-description-${index}`}
                      value={award.description || ""}
                      onChange={(e) =>
                        updateAward(index, "description", e.target.value)
                      }
                      rows={3}
                      placeholder="Recognized for outstanding performance in leading the development of a critical system that improved user engagement by 25%."
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          )}

          {/* Additional Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.languages && (
            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
                <CardDescription>Languages you speak fluently</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="e.g., English (Native), Mandarin (Fluent), Spanish (Conversational)"
                  value={resume.languages?.join(", ") || ""}
                  onChange={(e) =>
                    setResume({
                      ...resume,
                      languages: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </CardContent>
            </Card>
            )}

            {sections.interests && (
            <Card>
              <CardHeader>
                <CardTitle>Interests</CardTitle>
                <CardDescription>
                  Professional interests and hobbies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="e.g., Machine Learning, Open Source, Rock Climbing"
                  value={resume.interests?.join(", ") || ""}
                  onChange={(e) =>
                    setResume({
                      ...resume,
                      interests: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </CardContent>
            </Card>
            )}
          </div>

          {/* Save Button */}
          <div className="flex justify-center pt-6">
            <Button
              onClick={handleSaveResume}
              disabled={saving}
              size="lg"
              className="px-8"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save FAANG Resume
            </Button>
          </div>
        </div>

        {/* Right Panel - Live Preview */}
        {showPreview && (
          <div className="w-1/2 bg-white border-l border-gray-200 overflow-y-auto max-h-screen">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Live Preview</h2>
                <div className="flex gap-2">
                  <div className="hidden sm:flex items-center gap-1 mr-2">
                    <Button variant="outline" size="icon" onClick={() => setFontScale((s) => Math.max(0.85, parseFloat((s - 0.05).toFixed(2))))}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs w-10 text-center">{Math.round(fontScale * 100)}%</span>
                    <Button variant="outline" size="icon" onClick={() => setFontScale((s) => Math.min(1.25, parseFloat((s + 0.05).toFixed(2))))}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleExportPDF}
                    disabled={exporting}
                    size="sm"
                  >
                    {exporting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Download className="mr-2 h-4 w-4" />
                    Print/PDF
                  </Button>
                  <Button
                    onClick={handleExportHTML}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    HTML
                  </Button>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div id="resume-preview" className="bg-white">
                <div style={{ transform: `scale(${fontScale})`, transformOrigin: "top left" }}>
                  <ResumePreview
                    data={resume}
                    template={selectedTemplate as any}
                    theme={{ accentColor: themeAccent, fontFamily: themeFont }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
