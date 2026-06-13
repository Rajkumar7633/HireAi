"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, Minus, Save, FileText, Zap, Download, Eye, EyeOff,
  Wand2, ArrowUp, ArrowDown, ZoomIn, ZoomOut, User, Briefcase,
  GraduationCap, Code2, MoreHorizontal, ChevronRight, CheckCircle2,
  AlertCircle, Sparkles,
} from "lucide-react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Badge } from "@/components/ui/badge";
import { ResumePreview } from "@/components/resume-preview";
import { TemplateSelector } from "@/components/template-selector";
import { exportToPDF, exportToHTML } from "@/utils/pdf-export";
import { exportToDoc } from "@/utils/doc-export";
import { format, parseISO } from "date-fns";
import { Switch } from "@/components/ui/switch";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PersonalInfo {
  name: string; email: string; phone?: string; linkedin?: string;
  github?: string; portfolio?: string; address?: string;
}
interface Experience {
  title: string; company: string; location?: string;
  startDate: string; endDate?: string; description: string[];
}
interface Education {
  degree: string; major?: string; institution: string;
  location?: string; startDate: string; endDate?: string; gpa?: string;
}
interface Project {
  title: string; description?: string; technologies?: string[]; url?: string;
}
interface Certification { name: string; issuer?: string; issueDate?: string; }
interface Award { name: string; date?: string; description?: string; }
interface StructuredResume {
  personalInfo: PersonalInfo; summary?: string;
  experience: Experience[]; education: Education[]; skills: string[];
  projects: Project[]; certifications: Certification[];
  awards: Award[]; languages?: string[]; interests?: string[];
}

const defaultResume: StructuredResume = {
  personalInfo: { name: "", email: "", phone: "" }, summary: "",
  experience: [], education: [], skills: [], projects: [],
  certifications: [], awards: [], languages: [], interests: [],
};

type TabId = "personal" | "experience" | "education" | "skills" | "more";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "personal",    label: "Personal",   icon: <User className="h-4 w-4" /> },
  { id: "experience",  label: "Experience", icon: <Briefcase className="h-4 w-4" /> },
  { id: "education",   label: "Education",  icon: <GraduationCap className="h-4 w-4" /> },
  { id: "skills",      label: "Skills",     icon: <Code2 className="h-4 w-4" /> },
  { id: "more",        label: "More",       icon: <MoreHorizontal className="h-4 w-4" /> },
];

// ─── Skills options ───────────────────────────────────────────────────────────

const faangSkillsOptions = [
  { value: "javascript", label: "JavaScript" }, { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" }, { value: "java", label: "Java" },
  { value: "cpp", label: "C++" }, { value: "go", label: "Go" },
  { value: "rust", label: "Rust" }, { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" }, { value: "react", label: "React" },
  { value: "nextjs", label: "Next.js" }, { value: "vue", label: "Vue.js" },
  { value: "angular", label: "Angular" }, { value: "html", label: "HTML5" },
  { value: "css", label: "CSS3" }, { value: "tailwind", label: "Tailwind CSS" },
  { value: "nodejs", label: "Node.js" }, { value: "express", label: "Express.js" },
  { value: "django", label: "Django" }, { value: "flask", label: "Flask" },
  { value: "spring", label: "Spring Boot" }, { value: "graphql", label: "GraphQL" },
  { value: "rest", label: "REST APIs" }, { value: "postgresql", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL" }, { value: "mongodb", label: "MongoDB" },
  { value: "redis", label: "Redis" }, { value: "elasticsearch", label: "Elasticsearch" },
  { value: "aws", label: "AWS" }, { value: "gcp", label: "GCP" },
  { value: "azure", label: "Azure" }, { value: "docker", label: "Docker" },
  { value: "kubernetes", label: "Kubernetes" }, { value: "terraform", label: "Terraform" },
  { value: "jenkins", label: "Jenkins" }, { value: "github-actions", label: "GitHub Actions" },
  { value: "tensorflow", label: "TensorFlow" }, { value: "pytorch", label: "PyTorch" },
  { value: "pandas", label: "Pandas" }, { value: "numpy", label: "NumPy" },
  { value: "spark", label: "Apache Spark" }, { value: "git", label: "Git" },
  { value: "linux", label: "Linux" }, { value: "agile", label: "Agile/Scrum" },
  { value: "system-design", label: "System Design" },
  { value: "algorithms", label: "Data Structures & Algorithms" },
  { value: "microservices", label: "Microservices" }, { value: "ci-cd", label: "CI/CD" },
  { value: "testing", label: "Unit Testing" },
];

// ─── ATS Score ────────────────────────────────────────────────────────────────

function computeATS(r: StructuredResume): { score: number; items: { label: string; done: boolean; pts: number }[] } {
  const items = [
    { label: "Full Name",         done: !!r.personalInfo.name?.trim(),         pts: 10 },
    { label: "Email",             done: !!r.personalInfo.email?.trim(),         pts: 10 },
    { label: "Phone",             done: !!r.personalInfo.phone?.trim(),         pts: 5  },
    { label: "LinkedIn",          done: !!r.personalInfo.linkedin?.trim(),      pts: 5  },
    { label: "GitHub",            done: !!r.personalInfo.github?.trim(),        pts: 5  },
    { label: "Summary (100+)",    done: (r.summary || "").trim().length >= 100, pts: 10 },
    { label: "1+ Experience",     done: r.experience.length > 0,               pts: 10 },
    { label: "5+ Skills",         done: r.skills.length >= 5,                  pts: 10 },
    { label: "Education",         done: r.education.length > 0,                pts: 10 },
    { label: "Project",           done: r.projects.length > 0,                 pts: 10 },
    { label: "Certifications",    done: r.certifications.length > 0,           pts: 5  },
    { label: "Portfolio/Website", done: !!r.personalInfo.portfolio?.trim(),    pts: 5  },
    { label: "Languages",         done: (r.languages || []).length > 0,        pts: 5  },
  ];
  const score = items.filter(i => i.done).reduce((s, i) => s + i.pts, 0);
  return { score, items };
}

function ATSMeter({ resume }: { resume: StructuredResume }) {
  const { score, items } = computeATS(resume);
  const color = score >= 80 ? "#16a34a" : score >= 55 ? "#d97706" : "#dc2626";
  const label = score >= 80 ? "Strong" : score >= 55 ? "Good" : "Needs Work";

  return (
    <div style={{
      background: score >= 80 ? "#f0fdf4" : score >= 55 ? "#fffbeb" : "#fef2f2",
      border: `1px solid ${score >= 80 ? "#bbf7d0" : score >= 55 ? "#fde68a" : "#fecaca"}`,
      borderRadius: 10, padding: "12px 16px",
    }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" style={{ color }} />
          <span className="font-semibold text-sm" style={{ color }}>ATS Score: {score}/100 — {label}</span>
        </div>
        <span className="text-xs text-gray-500">{items.filter(i => i.done).length}/{items.length} complete</span>
      </div>
      <div style={{ height: 6, background: "#e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 10, transition: "width 0.4s" }} />
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {items.filter(i => !i.done).map(i => (
          <span key={i.label} className="text-xs flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: "#fee2e2", color: "#991b1b" }}>
            <AlertCircle className="h-2.5 w-2.5" /> {i.label} (+{i.pts})
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResumeBuilderPage() {
  const [resume, setResume] = useState<StructuredResume>(defaultResume);
  const [selectedTemplate, setSelectedTemplate] = useState("faang");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [themeAccent, setThemeAccent] = useState<string>("#7c3aed");
  const [themeFont, setThemeFont] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabId>("personal");
  const [showTips, setShowTips] = useState(false);
  const [autoSaveTs, setAutoSaveTs] = useState<number | null>(null);
  const [sections, setSections] = useState({
    summary: true, skills: true, experience: true, projects: true,
    education: true, certifications: true, awards: true, languages: true, interests: true,
  });
  const { toast } = useToast();

  // ── Load ──
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderData") : null;
    const savedTemplate = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderTemplate") : null;
    const savedScale = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderScale") : null;
    const savedAccent = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderAccent") : null;
    const savedFont = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderFont") : null;
    if (saved) {
      try {
        setResume(JSON.parse(saved));
        if (savedTemplate) setSelectedTemplate(savedTemplate);
        if (savedScale) setFontScale(parseFloat(savedScale));
        if (savedAccent) setThemeAccent(savedAccent);
        if (savedFont) setThemeFont(savedFont);
        setLoading(false);
        return;
      } catch { /**/ }
    }
    fetchResume();
  }, []);

  // ── Autosave ──
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem("resumeBuilderData", JSON.stringify(resume));
        localStorage.setItem("resumeBuilderTemplate", selectedTemplate);
        localStorage.setItem("resumeBuilderScale", String(fontScale));
        localStorage.setItem("resumeBuilderAccent", themeAccent);
        localStorage.setItem("resumeBuilderFont", themeFont);
        setAutoSaveTs(Date.now());
      } catch { /**/ }
    }, 800);
    return () => clearTimeout(t);
  }, [resume, selectedTemplate, fontScale, themeAccent, themeFont, loading]);

  const fetchResume = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/structured-resume/my-resume");
      if (response.ok) {
        const data = await response.json();
        const formattedData = {
          ...data,
          experience: (data.experience || []).map((exp: Experience) => ({
            ...exp,
            startDate: exp.startDate ? format(parseISO(exp.startDate), "yyyy-MM") : "",
            endDate: exp.endDate ? format(parseISO(exp.endDate), "yyyy-MM") : "",
          })),
          education: (data.education || []).map((edu: Education) => ({
            ...edu,
            startDate: edu.startDate ? format(parseISO(edu.startDate), "yyyy-MM") : "",
            endDate: edu.endDate ? format(parseISO(edu.endDate), "yyyy-MM") : "",
          })),
        };
        setResume(formattedData);
      } else {
        setResume(defaultResume);
      }
    } catch {
      setResume(defaultResume);
    } finally {
      setLoading(false);
    }
  };

  // ── Validation ──
  const getValidationIssues = (): string[] => {
    const issues: string[] = [];
    if (!resume.personalInfo.name?.trim()) issues.push("Full Name is required");
    if (!resume.personalInfo.email?.trim()) issues.push("Email is required");
    resume.experience.forEach((e, i) => {
      if (!e.title?.trim()) issues.push(`Experience #${i + 1}: title`);
      if (!e.company?.trim()) issues.push(`Experience #${i + 1}: company`);
    });
    resume.education.forEach((e, i) => {
      if (!e.degree?.trim()) issues.push(`Education #${i + 1}: degree`);
      if (!e.institution?.trim()) issues.push(`Education #${i + 1}: institution`);
    });
    return issues;
  };

  // ── Save ──
  const handleSaveResume = async () => {
    setSaving(true);
    try {
      const issues = getValidationIssues();
      if (issues.length) {
        toast({ title: "Some required info is missing", description: issues.join("; "), variant: "destructive" });
      }
      await new Promise(r => setTimeout(r, 800));
      toast({ title: "Resume Saved", description: "Your resume has been saved." });
    } catch {
      toast({ title: "Saved locally", description: "Changes stored in browser." });
    } finally {
      setSaving(false);
    }
  };

  // ── Export ──
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportToPDF("resume-preview", `${resume.personalInfo.name || "resume"}.pdf`);
      toast({ title: "Print Dialog Opened", description: "Save as PDF from your browser print dialog." });
    } catch {
      toast({ title: "Export Failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };
  const handleExportHTML = () => {
    exportToHTML("resume-preview", `${resume.personalInfo.name || "resume"}.html`);
    toast({ title: "HTML Downloaded", description: "Open in browser and print to PDF." });
  };

  // ── Mutations ──
  const updatePersonalInfo = (field: keyof PersonalInfo, value: string) =>
    setResume(prev => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }));

  const moveItem = <T,>(arr: T[], from: number, to: number) => {
    const copy = [...arr];
    if (to < 0 || to >= copy.length) return copy;
    const [it] = copy.splice(from, 1);
    copy.splice(to, 0, it);
    return copy;
  };

  const addExperience = () => setResume(prev => ({ ...prev, experience: [...prev.experience, { title: "", company: "", startDate: "", description: [""] }] }));
  const removeExperience = (i: number) => setResume(prev => ({ ...prev, experience: prev.experience.filter((_, idx) => idx !== i) }));
  const updateExperience = (index: number, field: keyof Experience, value: string | string[]) => {
    setResume(prev => {
      const next = [...prev.experience];
      if (field === "description" && typeof value === "string") {
        next[index][field] = value.split("\n").filter(l => l.trim());
      } else {
        (next[index] as any)[field] = value;
      }
      return { ...prev, experience: next };
    });
  };

  const addEducation = () => setResume(prev => ({ ...prev, education: [...prev.education, { degree: "", institution: "", startDate: "" }] }));
  const removeEducation = (i: number) => setResume(prev => ({ ...prev, education: prev.education.filter((_, idx) => idx !== i) }));
  const updateEducation = (index: number, field: keyof Education, value: string) => {
    setResume(prev => {
      const next = [...prev.education];
      (next[index] as any)[field] = value;
      return { ...prev, education: next };
    });
  };

  const addProject = () => setResume(prev => ({ ...prev, projects: [...prev.projects, { title: "", description: "", technologies: [] }] }));
  const removeProject = (i: number) => setResume(prev => ({ ...prev, projects: prev.projects.filter((_, idx) => idx !== i) }));
  const updateProject = (index: number, field: keyof Project, value: string | string[]) => {
    setResume(prev => {
      const next = [...prev.projects];
      (next[index] as any)[field] = value;
      return { ...prev, projects: next };
    });
  };

  const addCertification = () => setResume(prev => ({ ...prev, certifications: [...prev.certifications, { name: "" }] }));
  const removeCertification = (i: number) => setResume(prev => ({ ...prev, certifications: prev.certifications.filter((_, idx) => idx !== i) }));
  const updateCertification = (index: number, field: keyof Certification, value: string) => {
    setResume(prev => {
      const next = [...prev.certifications];
      (next[index] as any)[field] = value;
      return { ...prev, certifications: next };
    });
  };

  const addAward = () => setResume(prev => ({ ...prev, awards: [...prev.awards, { name: "" }] }));
  const removeAward = (i: number) => setResume(prev => ({ ...prev, awards: prev.awards.filter((_, idx) => idx !== i) }));
  const updateAward = (index: number, field: keyof Award, value: string) => {
    setResume(prev => {
      const next = [...prev.awards];
      (next[index] as any)[field] = value;
      return { ...prev, awards: next };
    });
  };

  // Smart bullet generator
  const generateBullets = (index: number) => {
    const exp = resume.experience[index];
    const techHint = resume.skills.slice(0, 6).join(", ") || "modern technologies";
    const bullets = [
      `Built and shipped features using ${techHint}, improving key KPIs by 15–30%.`,
      `Led cross-functional collaboration with product/design to deliver on-time releases.`,
      `Optimized performance and reliability — reduced p95 latency and error rates.`,
      `Implemented automated testing/CI, raising coverage to 85%+ and reducing regressions.`,
    ];
    setResume(prev => {
      const next = [...prev.experience];
      next[index] = { ...next[index], description: bullets };
      return { ...prev, experience: next };
    });
  };

  const refineBullets = (index: number) => {
    const verbs = ["Built", "Led", "Implemented", "Optimized", "Designed", "Automated", "Migrated", "Launched"];
    const exp = resume.experience[index];
    const refined = exp.description.map(d => {
      const t = d.trim().replace(/^[-•\s]+/, "");
      const cap = t.charAt(0).toUpperCase() + t.slice(1);
      const hasVerb = verbs.some(v => cap.startsWith(v + " "));
      const base = (hasVerb ? cap : `${verbs[0]} ${cap}`).replace(/\.+$/, "");
      const hasNumber = /\d/.test(base);
      return hasNumber ? `${base}.` : `${base} (impact: +20% perf / −30% costs).`;
    });
    setResume(prev => {
      const next = [...prev.experience];
      next[index] = { ...next[index], description: refined };
      return { ...prev, experience: next };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-3 text-gray-600 font-medium">Loading resume builder…</p>
      </div>
    );
  }

  const { score: atsScore } = computeATS(resume);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen overflow-hidden">

        {/* ── Left Panel ── */}
        <div className={`${showPreview ? "w-[52%]" : "w-full"} flex flex-col h-full`}>

          {/* Sticky header */}
          <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Resume Builder</h1>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div style={{
                        width: 60, height: 4, background: "#e5e7eb", borderRadius: 10, overflow: "hidden"
                      }}>
                        <div style={{ height: "100%", width: `${atsScore}%`, borderRadius: 10, background: atsScore >= 80 ? "#16a34a" : atsScore >= 55 ? "#d97706" : "#dc2626", transition: "width 0.4s" }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: atsScore >= 80 ? "#16a34a" : atsScore >= 55 ? "#d97706" : "#dc2626" }}>
                        ATS {atsScore}%
                      </span>
                    </div>
                    {autoSaveTs && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" /> Saved
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setShowTips(v => !v)} className="hidden md:flex">
                  <Zap className="h-3.5 w-3.5 mr-1 text-amber-500" /> Tips
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(v => !v)}>
                  {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span className="ml-1 hidden sm:inline">{showPreview ? "Hide" : "Preview"}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  <span className="ml-1 hidden sm:inline">PDF</span>
                </Button>
                <Button size="sm" onClick={handleSaveResume} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span className="ml-1">Save</span>
                </Button>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-0.5 mt-3">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.id === "experience" && resume.experience.length > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5 font-semibold">
                      {resume.experience.length}
                    </span>
                  )}
                  {tab.id === "education" && resume.education.length > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-1.5 py-0.5 font-semibold">
                      {resume.education.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable form area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Tips */}
            {showTips && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h4 className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> FAANG Resume Tips
                </h4>
                <ul className="text-xs text-amber-700 space-y-1.5">
                  {[
                    "Quantify every impact — 'Improved latency by 40%' beats 'improved performance'",
                    "Start each bullet with an action verb: Built, Led, Optimized, Designed",
                    "Keep summary under 4 lines — recruiters scan in 6 seconds",
                    "Include GitHub/portfolio — critical for technical roles",
                    "List skills that appear in the job description first (ATS keyword match)",
                  ].map((tip, i) => <li key={i} className="flex gap-1.5"><span className="text-amber-400 mt-0.5">•</span>{tip}</li>)}
                </ul>
              </div>
            )}

            {/* ── Tab: Personal ── */}
            {activeTab === "personal" && (
              <div className="space-y-5">
                <ATSMeter resume={resume} />

                <Card className="shadow-sm">
                  <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" /> Personal Information
                    </CardTitle>
                    <CardDescription className="text-xs">Contact details — ATS systems parse this first</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { id: "name", label: "Full Name", placeholder: "Jane Smith", required: true },
                        { id: "email", label: "Email", placeholder: "jane@email.com", required: true, type: "email" },
                        { id: "phone", label: "Phone", placeholder: "+1 (555) 123-4567", type: "tel" },
                        { id: "address", label: "Location", placeholder: "San Francisco, CA" },
                        { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/janesmith" },
                        { id: "github", label: "GitHub", placeholder: "github.com/janesmith" },
                      ].map(f => (
                        <div key={f.id} className="space-y-1.5">
                          <Label className="text-sm font-medium text-gray-700">
                            {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                          </Label>
                          <Input
                            type={(f as any).type || "text"}
                            value={(resume.personalInfo as any)[f.id] || ""}
                            onChange={e => updatePersonalInfo(f.id as keyof PersonalInfo, e.target.value)}
                            placeholder={f.placeholder}
                            className="text-sm"
                          />
                        </div>
                      ))}
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-sm font-medium text-gray-700">Portfolio Website</Label>
                        <Input
                          value={resume.personalInfo.portfolio || ""}
                          onChange={e => updatePersonalInfo("portfolio", e.target.value)}
                          placeholder="https://janesmith.dev"
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" /> Professional Summary
                    </CardTitle>
                    <CardDescription className="text-xs">3–4 sentence executive summary — most critical for ATS</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <Textarea
                      placeholder="Results-driven Software Engineer with 5+ years building scalable systems. Led development of microservices serving 10M+ users, improving performance by 40%. Passionate about solving complex technical challenges and mentoring teams."
                      value={resume.summary || ""}
                      onChange={e => setResume(prev => ({ ...prev, summary: e.target.value }))}
                      rows={5}
                      className="text-sm resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-gray-500">{(resume.summary || "").length} chars — aim for 200–400</p>
                      {(resume.summary || "").length >= 100 && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Good length
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Template + Theme */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base">Resume Template</CardTitle>
                    <CardDescription className="text-xs">Choose the visual style for your resume</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <TemplateSelector selectedTemplate={selectedTemplate} onTemplateSelect={setSelectedTemplate} />
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base">Theme Customization</CardTitle>
                    <CardDescription className="text-xs">Accent color and font family</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Accent Color</Label>
                        <div className="flex items-center gap-2">
                          <Input type="color" value={themeAccent} onChange={e => setThemeAccent(e.target.value)} className="w-12 h-9 p-1 cursor-pointer" />
                          <span className="text-sm text-gray-500 font-mono">{themeAccent}</span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap mt-1">
                          {["#7c3aed", "#2563eb", "#059669", "#dc2626", "#d97706", "#0e7490", "#1e293b"].map(c => (
                            <button key={c} onClick={() => setThemeAccent(c)} title={c}
                              style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: themeAccent === c ? "2px solid #1e293b" : "1px solid #e5e7eb", cursor: "pointer" }} />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Font Family</Label>
                        <select
                          value={themeFont}
                          onChange={e => setThemeFont(e.target.value)}
                          className="w-full border rounded-md h-9 px-3 text-sm bg-white"
                        >
                          <option value="">System Default</option>
                          <option value="Inter, ui-sans-serif, system-ui">Inter</option>
                          <option value="Georgia, 'Times New Roman', serif">Serif (Georgia)</option>
                          <option value="'Segoe UI', Roboto, Helvetica, Arial, sans-serif">Segoe/Roboto</option>
                          <option value="'Source Sans Pro', Arial, sans-serif">Source Sans</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  onClick={() => setActiveTab("experience")}
                >
                  Next: Experience <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* ── Tab: Experience ── */}
            {activeTab === "experience" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Professional Experience</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Reverse chronological — most important section</p>
                  </div>
                  <Button size="sm" onClick={addExperience} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>

                {resume.experience.length === 0 && (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No experience added yet</p>
                    <p className="text-gray-400 text-sm mt-1">Click "Add" to add your work history</p>
                    <Button onClick={addExperience} className="mt-4 bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-4 w-4 mr-1" /> Add First Experience
                    </Button>
                  </div>
                )}

                {resume.experience.map((exp, index) => (
                  <Card key={index} className="shadow-sm border">
                    <CardHeader className="pb-2 border-b bg-purple-50/50">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-purple-200 text-purple-700 bg-white">
                          Experience {index + 1}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setResume(p => ({ ...p, experience: moveItem(p.experience, index, index - 1) }))}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setResume(p => ({ ...p, experience: moveItem(p.experience, index, index + 1) }))}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => generateBullets(index)}>
                            <Wand2 className="h-3 w-3 mr-1" /> Generate
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refineBullets(index)}>
                            Refine
                          </Button>
                          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => removeExperience(index)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">Job Title *</Label>
                          <Input className="text-sm h-8" value={exp.title} onChange={e => updateExperience(index, "title", e.target.value)} placeholder="Senior Software Engineer" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">Company *</Label>
                          <Input className="text-sm h-8" value={exp.company} onChange={e => updateExperience(index, "company", e.target.value)} placeholder="Google" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">Location</Label>
                          <Input className="text-sm h-8" value={exp.location || ""} onChange={e => updateExperience(index, "location", e.target.value)} placeholder="San Francisco, CA" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600">Start</Label>
                            <Input className="text-sm h-8" type="month" value={exp.startDate} onChange={e => updateExperience(index, "startDate", e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-gray-600">End</Label>
                            <Input className="text-sm h-8" type="month" value={exp.endDate || ""} onChange={e => updateExperience(index, "endDate", e.target.value)} placeholder="Present" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">Key Achievements (one per line)</Label>
                        <Textarea
                          className="text-sm resize-none"
                          rows={5}
                          value={exp.description.join("\n")}
                          onChange={e => updateExperience(index, "description", e.target.value)}
                          placeholder={"• Built microservices serving 10M+ users, reducing latency by 35%\n• Led team of 8 engineers, delivered 2 weeks ahead of schedule\n• Raised test coverage from 60% → 95% via automated pipeline"}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setActiveTab("personal")}>Back</Button>
                  <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => setActiveTab("education")}>
                    Next: Education <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Tab: Education ── */}
            {activeTab === "education" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Education</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Academic background and degrees</p>
                  </div>
                  <Button size="sm" onClick={addEducation} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>

                {resume.education.length === 0 && (
                  <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                    <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 font-medium">No education added yet</p>
                    <Button onClick={addEducation} className="mt-4 bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-4 w-4 mr-1" /> Add Education
                    </Button>
                  </div>
                )}

                {resume.education.map((edu, index) => (
                  <Card key={index} className="shadow-sm border">
                    <CardHeader className="pb-2 border-b bg-blue-50/50">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-white">Education {index + 1}</Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setResume(p => ({ ...p, education: moveItem(p.education, index, index - 1) }))}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setResume(p => ({ ...p, education: moveItem(p.education, index, index + 1) }))}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => removeEducation(index)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">Degree *</Label>
                          <Input className="text-sm h-8" value={edu.degree} onChange={e => updateEducation(index, "degree", e.target.value)} placeholder="Bachelor of Science" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">Major</Label>
                          <Input className="text-sm h-8" value={edu.major || ""} onChange={e => updateEducation(index, "major", e.target.value)} placeholder="Computer Science" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">Institution *</Label>
                          <Input className="text-sm h-8" value={edu.institution} onChange={e => updateEducation(index, "institution", e.target.value)} placeholder="Stanford University" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">GPA</Label>
                          <Input className="text-sm h-8" value={edu.gpa || ""} onChange={e => updateEducation(index, "gpa", e.target.value)} placeholder="3.8/4.0" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">Start</Label>
                          <Input className="text-sm h-8" type="month" value={edu.startDate} onChange={e => updateEducation(index, "startDate", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">End</Label>
                          <Input className="text-sm h-8" type="month" value={edu.endDate || ""} onChange={e => updateEducation(index, "endDate", e.target.value)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setActiveTab("experience")}>Back</Button>
                  <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => setActiveTab("skills")}>
                    Next: Skills <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Tab: Skills + Projects ── */}
            {activeTab === "skills" && (
              <div className="space-y-5">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-b rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-teal-600" /> Technical Skills
                    </CardTitle>
                    <CardDescription className="text-xs">Select skills from the list or type to search</CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    <MultiSelect
                      options={faangSkillsOptions}
                      selected={resume.skills}
                      onSelect={selectedSkills => setResume(prev => ({ ...prev, skills: selectedSkills }))}
                      placeholder="Select technical skills…"
                    />
                    {resume.skills.length > 0 && (
                      <p className="text-xs text-teal-600 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {resume.skills.length} skills selected
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Projects */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Projects</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Showcase your best technical work</p>
                  </div>
                  <Button size="sm" onClick={addProject} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>

                {resume.projects.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                    <Code2 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-400 text-sm">No projects yet — add side projects or open source work</p>
                    <Button onClick={addProject} size="sm" className="mt-3 bg-purple-600 hover:bg-purple-700">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Project
                    </Button>
                  </div>
                )}

                {resume.projects.map((proj, index) => (
                  <Card key={index} className="shadow-sm border">
                    <CardHeader className="pb-2 border-b bg-teal-50/40">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="border-teal-200 text-teal-700 bg-white">Project {index + 1}</Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setResume(p => ({ ...p, projects: moveItem(p.projects, index, index - 1) }))}>
                            <ArrowUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setResume(p => ({ ...p, projects: moveItem(p.projects, index, index + 1) }))}>
                            <ArrowDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => removeProject(index)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">Project Title *</Label>
                          <Input className="text-sm h-8" value={proj.title} onChange={e => updateProject(index, "title", e.target.value)} placeholder="Real-time Chat App" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-600">Project URL</Label>
                          <Input className="text-sm h-8" value={proj.url || ""} onChange={e => updateProject(index, "url", e.target.value)} placeholder="https://github.com/…" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">Description & Impact</Label>
                        <Textarea className="text-sm resize-none" rows={3} value={proj.description || ""} onChange={e => updateProject(index, "description", e.target.value)} placeholder="Built a real-time chat app supporting 1000+ concurrent users. 99.9% uptime, sub-100ms delivery." />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-600">Technologies (comma-separated)</Label>
                        <Input className="text-sm h-8" value={proj.technologies?.join(", ") || ""} onChange={e => updateProject(index, "technologies", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} placeholder="React, Node.js, MongoDB, AWS" />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setActiveTab("education")}>Back</Button>
                  <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => setActiveTab("more")}>
                    Next: More <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Tab: More ── */}
            {activeTab === "more" && (
              <div className="space-y-5">
                {/* Certifications */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Certifications</CardTitle>
                        <CardDescription className="text-xs">Professional credentials</CardDescription>
                      </div>
                      <Button size="sm" onClick={addCertification} className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {resume.certifications.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No certifications yet</p>
                    )}
                    {resume.certifications.map((cert, index) => (
                      <div key={index} className="grid grid-cols-3 gap-2 items-end border rounded-lg p-3 bg-gray-50">
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-600">Certification *</Label>
                          <Input className="text-sm h-8" value={cert.name} onChange={e => updateCertification(index, "name", e.target.value)} placeholder="AWS Solutions Architect" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-600">Issuer</Label>
                          <Input className="text-sm h-8" value={cert.issuer || ""} onChange={e => updateCertification(index, "issuer", e.target.value)} placeholder="Amazon" />
                        </div>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs font-medium text-gray-600">Date</Label>
                            <Input className="text-sm h-8" type="date" value={cert.issueDate || ""} onChange={e => updateCertification(index, "issueDate", e.target.value)} />
                          </div>
                          <Button variant="destructive" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => removeCertification(index)}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Awards */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Awards & Achievements</CardTitle>
                        <CardDescription className="text-xs">Recognition and honors</CardDescription>
                      </div>
                      <Button size="sm" onClick={addAward} className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {resume.awards.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">No awards yet</p>
                    )}
                    {resume.awards.map((award, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">Award {index + 1}</Badge>
                          <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeAward(index)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600">Award Name *</Label>
                            <Input className="text-sm h-8" value={award.name} onChange={e => updateAward(index, "name", e.target.value)} placeholder="Employee of the Year" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium text-gray-600">Date</Label>
                            <Input className="text-sm h-8" type="date" value={award.date || ""} onChange={e => updateAward(index, "date", e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium text-gray-600">Description</Label>
                          <Textarea className="text-sm resize-none" rows={2} value={award.description || ""} onChange={e => updateAward(index, "description", e.target.value)} placeholder="Recognized for outstanding performance…" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Languages + Interests side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-base">Languages</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <Input
                        className="text-sm"
                        placeholder="English (Native), Spanish (Fluent)"
                        value={resume.languages?.join(", ") || ""}
                        onChange={e => setResume(prev => ({ ...prev, languages: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                      />
                    </CardContent>
                  </Card>
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-base">Interests</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <Input
                        className="text-sm"
                        placeholder="Open Source, Machine Learning, Chess"
                        value={resume.interests?.join(", ") || ""}
                        onChange={e => setResume(prev => ({ ...prev, interests: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Section visibility */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base">Section Visibility</CardTitle>
                    <CardDescription className="text-xs">Toggle which sections appear in your resume</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(sections).map(([key, val]) => (
                        <div key={key} className="flex items-center justify-between border rounded-lg px-3 py-2">
                          <span className="capitalize text-sm text-gray-700">{key}</span>
                          <Switch checked={val} onCheckedChange={v => setSections(s => ({ ...s, [key]: v }))} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setActiveTab("skills")}>Back</Button>
                  <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={handleSaveResume} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                    Save Resume
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Live Preview ── */}
        {showPreview && (
          <div className="flex-1 bg-gray-100 border-l border-gray-200 flex flex-col h-full">
            {/* Preview toolbar */}
            <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-semibold text-gray-700">Live Preview</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setFontScale(s => Math.max(0.7, parseFloat((s - 0.05).toFixed(2))))}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs w-9 text-center font-mono">{Math.round(fontScale * 100)}%</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setFontScale(s => Math.min(1.3, parseFloat((s + 0.05).toFixed(2))))}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Button size="sm" onClick={handleExportPDF} disabled={exporting} className="h-7 text-xs">
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                  PDF
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportHTML} className="h-7 text-xs">
                  <Download className="h-3.5 w-3.5 mr-1" /> HTML
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportToDoc("resume-preview", `${resume.personalInfo.name || "resume"}.doc`)} className="h-7 text-xs">
                  <Download className="h-3.5 w-3.5 mr-1" /> DOC
                </Button>
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 overflow-auto p-4">
              <div
                id="resume-preview"
                style={{
                  background: "#fff",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                  borderRadius: 4,
                  transformOrigin: "top left",
                  transform: `scale(${fontScale})`,
                  width: `${100 / fontScale}%`,
                }}
              >
                <ResumePreview
                  data={resume}
                  template={selectedTemplate as any}
                  theme={{ accentColor: themeAccent, fontFamily: themeFont }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
