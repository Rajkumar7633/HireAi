"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/use-session";
import {
  User,
  Briefcase,
  GraduationCap,
  Globe,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Award,
  Target,
  Edit3,
  Save,
  X,
  Plus,
  Loader2,
  CheckCircle,
  Star,
  TrendingUp,
  Upload,
} from "lucide-react";
import Link from "next/link";

interface JobSeekerProfile {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  profileImage?: string;

  // Professional Information
  currentTitle: string;
  experienceLevel: string;
  industry: string;
  skills: string[];
  yearsOfExperience: number;

  // Education
  education: string;
  university: string;
  graduationYear: string;
  gpa?: string;

  // Online Presence
  linkedinUrl: string;
  portfolioUrl: string;
  githubUrl: string;

  // Career Goals
  desiredRole: string;
  salaryExpectation: string;
  workPreference: string;
  summary: string;

  // Profile Metrics
  profileCompleteness: number;
  atsScore: number;
  skillsVerified: number;
  lastUpdated: string;
  // Portfolio
  projects: Array<{
    title: string;
    description?: string;
    tags?: string[];
    link?: string;
  }>;
  achievements: string[];
  experiences: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
}

export default function JobSeekerProfilePage() {
  const { session, isLoading } = useSession();
  const { toast } = useToast();

  const [profile, setProfile] = useState<JobSeekerProfile>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    currentTitle: "",
    experienceLevel: "entry",
    industry: "",
    skills: [],
    yearsOfExperience: 0,
    education: "",
    university: "",
    graduationYear: "",
    gpa: "",
    linkedinUrl: "",
    portfolioUrl: "",
    githubUrl: "",
    desiredRole: "",
    salaryExpectation: "",
    workPreference: "",
    summary: "",
    profileCompleteness: 0,
    atsScore: 0,
    skillsVerified: 0,
    lastUpdated: new Date().toISOString(),
    projects: [],
    achievements: [],
    experiences: [],
  });

  // Safe initials for hero avatar
  const headerInitials = useMemo(() => {
    const f = (profile.firstName || "").trim();
    const l = (profile.lastName || "").trim();
    const a = f ? f[0].toUpperCase() : "";
    const b = l ? l[0].toUpperCase() : "";
    return (a + b) || "JS";
  }, [profile.firstName, profile.lastName]);

  // Profile Strength tips (client-side hints)
  const tips = useMemo(() => {
    const t: string[] = [];
    if (!profile.summary || profile.summary.trim().length < 120) t.push("Write a 120+ character summary to boost completeness.");
    if (!profile.linkedinUrl) t.push("Add your LinkedIn URL for credibility.");
    if (!profile.skills || profile.skills.length < 8) t.push("Add at least 8 skills to improve the Skills score.");
    if (!profile.projects || profile.projects.length === 0) t.push("Add 1–3 solid projects with tags and links.");
    if (!profile.experiences || profile.experiences.length === 0) t.push("Add work experiences to strengthen Experience.");
    if (!profile.achievements || profile.achievements.length === 0) t.push("Add achievements (awards, certifications, hackathons).");
    return t.slice(0, 4);
  }, [profile.summary, profile.linkedinUrl, profile.skills, profile.projects, profile.experiences, profile.achievements]);

  // Derived: estimated total years of experience from experiences[]
  const estimatedYears = useMemo(() => {
    const exps = profile.experiences || [];
    if (!Array.isArray(exps) || exps.length === 0) return 0;
    const now = new Date();
    let months = 0;
    for (const e of exps as any[]) {
      const start = e?.startDate ? new Date(String(e.startDate) + "-01") : null;
      const end = e?.current ? now : e?.endDate ? new Date(String(e.endDate) + "-01") : now;
      if (start && !Number.isNaN(start.getTime()) && end && !Number.isNaN(end.getTime()) && end > start) {
        months += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
      }
    }
    const yrs = Math.max(0, Math.round(months / 12));
    return yrs;
  }, [profile.experiences]);

  const lastSavedLabel = useMemo(() => {
    try {
      const d = profile?.lastUpdated ? new Date(profile.lastUpdated) : null;
      return d && !isNaN(d.getTime()) ? d.toLocaleString() : "—";
    } catch {
      return "—";
    }
  }, [profile?.lastUpdated]);

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newProject, setNewProject] = useState<{ title: string; description: string; tags: string; link: string }>({
    title: "",
    description: "",
    tags: "",
    link: "",
  });
  const [newAchievement, setNewAchievement] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [newExperience, setNewExperience] = useState<{ company: string; role: string; startDate: string; endDate: string; current: boolean; description: string }>({
    company: "",
    role: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
  });

  // Handlers (use new names to avoid any scope/hoisting issues)
  const addProjectHandler = useCallback(() => {
    if (!newProject.title.trim()) return;
    const tagsArr = newProject.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setProfile((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          title: newProject.title.trim(),
          description: newProject.description.trim() || undefined,
          tags: tagsArr,
          link: newProject.link.trim() || undefined,
        },
      ],
    }));
    setNewProject({ title: "", description: "", tags: "", link: "" });
  }, [newProject, setProfile]);

  const updateProjectHandler = useCallback(
    (index: number, field: keyof typeof newProject, value: string) => {
      setProfile((prev) => {
        const projects = [...prev.projects];
        const p = { ...projects[index] } as any;
        if (field === "tags") {
          p.tags = value
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean);
        } else {
          p[field] = value;
        }
        projects[index] = p;
        return { ...prev, projects };
      });
    },
    [setProfile]
  );

  const removeProjectHandler = useCallback((index: number) => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  }, []);

  const addAchievementHandler = useCallback(() => {
    if (!newAchievement.trim()) return;
    setProfile((prev) => ({
      ...prev,
      achievements: [...prev.achievements, newAchievement.trim()],
    }));
    setNewAchievement("");
  }, [newAchievement, setProfile]);

  const removeAchievementHandler = useCallback((i: number) => {
    setProfile((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, idx) => idx !== i),
    }));
  }, []);

  // Experience handlers
  const addExperienceHandler = useCallback(() => {
    if (!newExperience.company.trim() || !newExperience.role.trim() || !newExperience.startDate.trim()) return;
    setProfile((prev) => ({
      ...prev,
      experiences: [
        ...prev.experiences,
        {
          company: newExperience.company.trim(),
          role: newExperience.role.trim(),
          startDate: newExperience.startDate.trim(),
          endDate: newExperience.current ? undefined : newExperience.endDate.trim() || undefined,
          current: Boolean(newExperience.current),
          description: newExperience.description.trim() || undefined,
        },
      ],
    }));
    setNewExperience({ company: "", role: "", startDate: "", endDate: "", current: false, description: "" });
  }, [newExperience]);

  const updateExperienceHandler = useCallback((idx: number, field: keyof typeof newExperience, value: string | boolean) => {
    setProfile((prev) => {
      const experiences = [...prev.experiences];
      const e: any = { ...experiences[idx] };
      if (field === "current") e.current = Boolean(value);
      else (e as any)[field] = value;
      experiences[idx] = e;
      return { ...prev, experiences };
    });
  }, []);

  const removeExperienceHandler = useCallback((idx: number) => {
    setProfile((prev) => ({ ...prev, experiences: prev.experiences.filter((_, i) => i !== idx) }));
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        console.log("[v0] Fetching job seeker profile...");
        const response = await fetch("/api/job-seeker/profile", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await response.json();
        console.log("[v0] Profile data received:", data);
        // Normalize to ensure arrays exist to avoid runtime errors
        const normalized = {
          ...profile,
          ...data,
          skills: Array.isArray(data.skills) ? data.skills : [],
          projects: Array.isArray(data.projects) ? data.projects : [],
          achievements: Array.isArray(data.achievements) ? data.achievements : [],
          experiences: Array.isArray(data.experiences) ? data.experiences : [],
        } as JobSeekerProfile;
        setProfile(normalized);
      } catch (error) {
        console.error("[v0] Error fetching profile:", error);
        toast({
          title: "Error Loading Profile",
          description:
            "Failed to load your profile data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

  const addProject = () => {
    if (!newProject.title.trim()) return;
    const tagsArr = newProject.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    setProfile((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          title: newProject.title.trim(),
          description: newProject.description.trim() || undefined,
          tags: tagsArr,
          link: newProject.link.trim() || undefined,
        },
      ],
    }));
    setNewProject({ title: "", description: "", tags: "", link: "" });
  };

  const updateProject = (index: number, field: keyof typeof newProject, value: string) => {
    setProfile((prev) => {
      const projects = [...prev.projects];
      const p = { ...projects[index] } as any;
      if (field === "tags") {
        p.tags = value
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
      } else {
        p[field] = value;
      }
      projects[index] = p;
      return { ...prev, projects };
    });
  };

  const removeProject = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  const addAchievement = () => {
    if (!newAchievement.trim()) return;
    setProfile((prev) => ({ ...prev, achievements: [...prev.achievements, newAchievement.trim()] }));
    setNewAchievement("");
  };

  const removeAchievement = (i: number) => {
    setProfile((prev) => ({ ...prev, achievements: prev.achievements.filter((_, idx) => idx !== i) }));
  };

    if (!isLoading && session?.user?.id) {
      fetchProfile();
    }
  }, [session?.user?.id, isLoading, toast]);

  const handleSaveSection = async (section: string) => {
    setLoading(true);
    try {
      console.log("[v0] Saving profile section:", section);
      const response = await fetch("/api/job-seeker/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      const data = await response.json();
      console.log("[v0] Profile updated successfully:", data);

      // Normalize to ensure arrays always exist after save
      const normalized = {
        ...profile,
        ...data,
        skills: Array.isArray(data.skills) ? data.skills : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        achievements: Array.isArray(data.achievements) ? data.achievements : [],
        experiences: Array.isArray(data.experiences) ? data.experiences : [],
      } as JobSeekerProfile;

      setProfile(normalized);
      setEditingSection(null);

      toast({
        title: "Profile Updated Successfully!",
        description:
          section === "experience"
            ? `Your experience was saved. Talent Pool score has been recalculated.`
            : `Your ${section} information has been saved and your dashboard will reflect the changes.`,
      });

      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: { profile: data, completeness: data.profileCompleteness },
        })
      );
    } catch (error) {
      console.error("[v0] Profile update error:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompleteness = (
    profileData: JobSeekerProfile
  ): number => {
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "location",
      "currentTitle",
      "experienceLevel",
      "industry",
      "education",
      "desiredRole",
      "workPreference",
    ];
    const optionalFields = [
      "phone",
      "university",
      "graduationYear",
      "linkedinUrl",
      "portfolioUrl",
      "githubUrl",
      "salaryExpectation",
      "summary",
    ];

    let score = 0;
    let totalWeight = 0;

    // Required fields (70% weight)
    requiredFields.forEach((field) => {
      totalWeight += 7;
      if (profileData[field as keyof JobSeekerProfile]) score += 7;
    });

    // Skills (special required field)
    totalWeight += 7;
    if (profileData.skills && profileData.skills.length > 0) score += 7;

    // Optional fields (30% weight)
    optionalFields.forEach((field) => {
      totalWeight += 3;
      if (profileData[field as keyof JobSeekerProfile]) score += 3;
    });

    return Math.round((score / totalWeight) * 100);
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills.includes(newSkill.trim())) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const getExperienceLevelLabel = (level: string) => {
    const levels = {
      entry: "Entry Level (0-2 years)",
      mid: "Mid Level (3-5 years)",
      senior: "Senior Level (6-10 years)",
      lead: "Lead/Principal (10+ years)",
      executive: "Executive Level",
    };
    return levels[level as keyof typeof levels] || level;
  };

  const getEducationLabel = (education: string) => {
    const educationLevels = {
      "high-school": "High School",
      associate: "Associate Degree",
      bachelor: "Bachelor's Degree",
      master: "Master's Degree",
      phd: "PhD",
      other: "Other",
    };
    return (
      educationLevels[education as keyof typeof educationLevels] || education
    );
  };

  const getSalaryLabel = (salary: string) => {
    const salaryRanges = {
      "50k-75k": "$50,000 - $75,000",
      "75k-100k": "$75,000 - $100,000",
      "100k-150k": "$100,000 - $150,000",
      "150k-200k": "$150,000 - $200,000",
      "200k+": "$200,000+",
    };
    return salaryRanges[salary as keyof typeof salaryRanges] || salary;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section */}
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {headerInitials}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {profile.firstName} {profile.lastName}
                  </h1>
                  <p className="text-xl text-blue-700 font-medium">
                    {profile.currentTitle}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {profile.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {profile.phone}
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Profile Strength</span>
                </div>
                <div className="w-32">
                  <Progress
                    value={profile.profileCompleteness}
                    className="h-2"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    {profile.profileCompleteness}% Complete
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="min-h-[360px] h-full overflow-visible">
            <CardContent className="p-4 text-center h-full flex flex-col items-center justify-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-700">
                {profile.atsScore}%
              </p>
              <p className="text-sm text-green-600">ATS Score</p>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="min-h-[360px] h-full flex flex-col overflow-visible">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-teal-600" />
                  <CardTitle>Personal Information</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Keep your contact info up to date.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingSection(editingSection === "personal" ? null : "personal")}>
                  {editingSection === "personal" ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
                {editingSection !== "personal" && (
                  <Button size="sm" onClick={() => setEditingSection("personal")}>Edit</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {editingSection === "personal" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Title</Label>
                      <Input value={profile.currentTitle} onChange={(e) => setProfile((p) => ({ ...p, currentTitle: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Summary</Label>
                    <Textarea rows={4} value={profile.summary} onChange={(e) => setProfile((p) => ({ ...p, summary: e.target.value }))} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleSaveSection("personal")} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-teal-200 bg-white p-4 h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> <span className="font-medium text-teal-900">{profile.firstName} {profile.lastName}</span></div>
                    <div><span className="text-muted-foreground">Email:</span> <span className="font-medium text-teal-900">{profile.email}</span></div>
                    <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium text-teal-900">{profile.phone || "—"}</span></div>
                    <div><span className="text-muted-foreground">Location:</span> <span className="font-medium text-teal-900">{profile.location || "—"}</span></div>
                    <div className="md:col-span-2"><span className="text-muted-foreground">Current Title:</span> <span className="font-medium text-teal-900">{profile.currentTitle || "—"}</span></div>
                  </div>
                  {profile.summary ? (
                    <p className="mt-3 text-sm text-gray-800 leading-relaxed line-clamp-6">{profile.summary}</p>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Add a short professional summary.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-teal-600" />
                  <CardTitle>Education</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Your highest education and school details.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingSection(editingSection === "education" ? null : "education")}>
                  {editingSection === "education" ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </Button>
                {editingSection !== "education" && (
                  <Button size="sm" onClick={() => setEditingSection("education")}>Edit</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {editingSection === "education" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Education Level</Label>
                      <Input value={profile.education} onChange={(e) => setProfile((p) => ({ ...p, education: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>University / School</Label>
                      <Input value={profile.university} onChange={(e) => setProfile((p) => ({ ...p, university: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Graduation Year</Label>
                      <Input value={profile.graduationYear} onChange={(e) => setProfile((p) => ({ ...p, graduationYear: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>GPA</Label>
                      <Input value={profile.gpa || ""} onChange={(e) => setProfile((p) => ({ ...p, gpa: e.target.value }))} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleSaveSection("education")} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-teal-200 bg-white p-4 text-sm h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><span className="text-muted-foreground">Education:</span> <span className="font-medium text-teal-900">{profile.education || "—"}</span></div>
                    <div><span className="text-muted-foreground">University:</span> <span className="font-medium text-teal-900">{profile.university || "—"}</span></div>
                    <div><span className="text-muted-foreground">Grad Year:</span> <span className="font-medium text-teal-900">{profile.graduationYear || "—"}</span></div>
                    <div><span className="text-muted-foreground">GPA:</span> <span className="font-medium text-teal-900">{profile.gpa || "—"}</span></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Strength Tips */}
          <Card className="border-teal-200 bg-teal-50/40 min-h-[360px] h-full flex flex-col overflow-visible">
            <CardContent className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm font-medium text-teal-900">Profile Strength tips</div>
                  <ul className="mt-2 text-sm text-teal-800 list-disc pl-5 space-y-1">
                    {tips.length > 0 ? tips.map((tip, i) => <li key={i}>{tip}</li>) : <li>Great work! Keep your profile updated for recency points.</li>}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2 items-start justify-end">
                  <Button className="w-full sm:w-auto" variant="secondary" size="sm" onClick={() => setEditingSection("experience")}>Add Experience</Button>
                  <Button className="w-full sm:w-auto" variant="secondary" size="sm" onClick={() => setEditingSection("projects")}>Add Project</Button>
                  <Button className="w-full sm:w-auto" variant="secondary" size="sm" onClick={() => setEditingSection("achievements")}>Add Achievement</Button>
                  <Button className="w-full sm:w-auto" variant="ghost" size="sm" onClick={() => setShowDebug((v) => !v)}>{showDebug ? "Hide JSON" : "Show JSON"}</Button>
                </div>
              </div>
              {showDebug && (
                <div className="mt-3 rounded-md border bg-white p-3 max-h-48 overflow-auto text-xs">
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(profile, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Experience */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-teal-600" />
                  <CardTitle>Experience</CardTitle>
                  {estimatedYears > 0 && (
                    <span className="text-xs rounded-full bg-teal-100 text-teal-800 px-2 py-0.5">Estimated: {estimatedYears} yrs</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Add roles you have worked in. These improve your Experience score.</p>
              </div>
              <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setEditingSection(editingSection === "experience" ? null : "experience")}>
                {editingSection === "experience" ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              </Button>
              {editingSection !== "experience" && (
                <Button size="sm" onClick={() => setEditingSection("experience")}>Add</Button>
              )}
              <span className="text-xs text-muted-foreground">Last saved: {lastSavedLabel}</span>
              </div>
            </CardHeader>
            <CardContent>
              {editingSection === "experience" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Company *</Label>
                      <Input value={newExperience.company} onChange={(e) => setNewExperience((p) => ({ ...p, company: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Role *</Label>
                      <Input value={newExperience.role} onChange={(e) => setNewExperience((p) => ({ ...p, role: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date *</Label>
                      <Input type="month" value={newExperience.startDate} onChange={(e) => setNewExperience((p) => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="month" value={newExperience.endDate} onChange={(e) => setNewExperience((p) => ({ ...p, endDate: e.target.value }))} disabled={newExperience.current} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <input type="checkbox" checked={newExperience.current} onChange={(e) => setNewExperience((p) => ({ ...p, current: e.target.checked }))} /> Current Role
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={newExperience.description} onChange={(e) => setNewExperience((p) => ({ ...p, description: e.target.value }))} rows={3} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" type="button" onClick={addExperienceHandler}>
                      <Plus className="h-4 w-4 mr-1" /> Add Experience
                    </Button>
                    <Button onClick={() => handleSaveSection("experience")} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                  </div>

                  {/* Existing experiences editable */}
                  <div className="space-y-4">
                    {profile.experiences.map((exp, idx) => (
                      <div key={idx} className="rounded border p-4 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Company</Label>
                            <Input value={exp.company} onChange={(e) => updateExperienceHandler(idx, "company", e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Input value={exp.role} onChange={(e) => updateExperienceHandler(idx, "role", e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Start</Label>
                            <Input type="month" value={exp.startDate} onChange={(e) => updateExperienceHandler(idx, "startDate", e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>End</Label>
                            <Input type="month" value={exp.endDate || ""} disabled={exp.current} onChange={(e) => updateExperienceHandler(idx, "endDate", e.target.value)} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={!!exp.current} onChange={(e) => updateExperienceHandler(idx, "current", e.target.checked)} />
                          <span>Current Role</span>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea value={exp.description || ""} onChange={(e) => updateExperienceHandler(idx, "description", e.target.value)} rows={3} />
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" variant="outline" onClick={() => removeExperienceHandler(idx)}>
                            <X className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {(profile.experiences && profile.experiences.length > 0) ? (
                    (profile.experiences as any[]).map((exp, idx) => (
                      <div key={idx} className="rounded-xl border border-teal-200 bg-teal-50/30 p-4 shadow-sm hover:shadow transition">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-teal-900">{exp.role} at {exp.company}</div>
                          <div className="text-sm text-teal-700">{exp.startDate} - {exp.current ? "Present" : exp.endDate || ""}</div>
                        </div>
                        {exp.description ? <p className="mt-2 text-sm text-gray-800 leading-relaxed line-clamp-3 md:line-clamp-4">{exp.description}</p> : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Add your work experience.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-indigo-600" />
                  <CardTitle>Projects</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Showcase your best work with links and tags.</p>
              </div>
              <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingSection(editingSection === "projects" ? null : "projects")}
              >
                {editingSection === "projects" ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              </Button>
              {editingSection !== "projects" && (
                <Button size="sm" onClick={() => setEditingSection("projects")}>Add</Button>
              )}
              </div>
            </CardHeader>
            <CardContent>
              {editingSection === "projects" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectTitle">Title *</Label>
                      <Input id="projectTitle" value={newProject.title} onChange={(e) => setNewProject((p) => ({ ...p, title: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="projectLink">Link</Label>
                      <Input id="projectLink" value={newProject.link} onChange={(e) => setNewProject((p) => ({ ...p, link: e.target.value }))} placeholder="https://..." />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectTags">Tags (comma separated)</Label>
                    <Input id="projectTags" value={newProject.tags} onChange={(e) => setNewProject((p) => ({ ...p, tags: e.target.value }))} placeholder="react, node, aws" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="projectDesc">Description</Label>
                    <Textarea id="projectDesc" value={newProject.description} onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))} rows={4} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" type="button" onClick={addProjectHandler}>
                      <Plus className="h-4 w-4 mr-1" /> Add Project
                    </Button>
                    <Button onClick={() => handleSaveSection("projects")} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                  {/* Existing projects editable */}
                  <div className="space-y-4">
                    {profile.projects.map((proj, idx) => (
                      <div key={idx} className="rounded border p-4 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={proj.title} onChange={(e) => updateProjectHandler(idx, "title", e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>Link</Label>
                            <Input value={proj.link || ""} onChange={(e) => updateProjectHandler(idx, "link", e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Tags (comma separated)</Label>
                          <Input value={(proj.tags || []).join(", ")} onChange={(e) => updateProjectHandler(idx, "tags", e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea value={proj.description || ""} onChange={(e) => updateProjectHandler(idx, "description", e.target.value)} rows={3} />
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" variant="outline" onClick={() => removeProjectHandler(idx)}>
                            <X className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.projects.length > 0 ? (
                    profile.projects.map((p, idx) => (
                      <div key={idx} className="rounded-xl border border-teal-200 bg-white p-4 shadow-sm hover:shadow transition">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-teal-900">{p.title}</div>
                          {p.link ? (
                            <a className="text-teal-700 underline" href={p.link} target="_blank" rel="noreferrer">
                              View
                            </a>
                          ) : null}
                        </div>
                        {p.tags && p.tags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {p.tags.map((t, i) => (
                              <Badge key={i} className="bg-teal-50 text-teal-800 border border-teal-200">{t}</Badge>
                            ))}
                          </div>
                        ) : null}
                        {p.description ? <p className="mt-2 text-sm text-gray-800 leading-relaxed line-clamp-2">{p.description}</p> : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Add projects to showcase your work.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  <CardTitle>Achievements</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground">Highlight awards and recognitions.</p>
              </div>
              <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingSection(editingSection === "achievements" ? null : "achievements")}
              >
                {editingSection === "achievements" ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              </Button>
              {editingSection !== "achievements" && (
                <Button size="sm" onClick={() => setEditingSection("achievements")}>Add</Button>
              )}
              </div>
            </CardHeader>
            <CardContent>
              {editingSection === "achievements" ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newAchievement}
                      onChange={(e) => setNewAchievement(e.target.value)}
                      placeholder="e.g., Winner of XYZ Hackathon"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAchievementHandler())}
                    />
                    <Button variant="outline" onClick={addAchievementHandler}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.achievements.map((ach, idx) => (
                      <Badge key={idx} variant="secondary" className="px-3 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer" onClick={() => removeAchievementHandler(idx)}>
                        {ach} <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                  <Button onClick={() => handleSaveSection("achievements")} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.achievements.length > 0 ? (
                    profile.achievements.map((ach, idx) => (
                      <Badge key={idx} className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200">{ach}</Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Add achievements to highlight your impact.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                <Award className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {profile.skillsVerified}
              </p>
              <p className="text-sm text-blue-600">Skills Verified</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-700">
                {profile.yearsOfExperience}
              </p>
              <p className="text-sm text-purple-600">Years Experience</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-2">
                <Star className="h-6 w-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-700">8.7</p>
              <p className="text-sm text-orange-600">Profile Rating</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <CardTitle>Personal Information</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "personal" ? null : "personal"
                    )
                  }
                >
                  {editingSection === "personal" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {editingSection === "personal" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={profile.firstName}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              firstName: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={profile.lastName}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              lastName: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={profile.phone}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location *</Label>
                        <Input
                          id="location"
                          value={profile.location}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              location: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => handleSaveSection("personal")}
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="font-medium">
                        {profile.firstName} {profile.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">
                        {profile.phone || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-medium">{profile.location}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                  <CardTitle>Professional Summary</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "summary" ? null : "summary"
                    )
                  }
                >
                  {editingSection === "summary" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {editingSection === "summary" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="summary">Professional Summary</Label>
                      <Textarea
                        id="summary"
                        value={profile.summary}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            summary: e.target.value,
                          }))
                        }
                        className="min-h-[120px]"
                        placeholder="Describe your professional background, key achievements, and career goals..."
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveSection("summary")}
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-700 leading-relaxed">
                    {profile.summary ||
                      "Add a professional summary to showcase your background and career goals."}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  <CardTitle>Skills & Expertise</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "skills" ? null : "skills"
                    )
                  }
                >
                  {editingSection === "skills" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {editingSection === "skills" ? (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add a new skill (e.g., JavaScript, React)"
                        onKeyPress={(e) =>
                          e.key === "Enter" && (e.preventDefault(), addSkill())
                        }
                      />
                      <Button onClick={addSkill} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1 bg-purple-100 text-purple-800 hover:bg-purple-200 cursor-pointer"
                          onClick={() => removeSkill(skill)}
                        >
                          {skill} <X className="ml-1 h-3 w-3" />
                        </Badge>
                      ))}
                    </div>
                    <Button
                      onClick={() => handleSaveSection("skills")}
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.length > 0 ? (
                      profile.skills.map((skill, index) => (
                        <Badge
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-800"
                        >
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-gray-500">
                        Add skills to showcase your expertise
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  <CardTitle>Professional Details</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "professional" ? null : "professional"
                    )
                  }
                >
                  {editingSection === "professional" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {editingSection === "professional" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentTitle">Current Title *</Label>
                      <Input
                        id="currentTitle"
                        value={profile.currentTitle}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            currentTitle: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experienceLevel">
                        Experience Level *
                      </Label>
                      <Select
                        value={profile.experienceLevel}
                        onValueChange={(value) =>
                          setProfile((prev) => ({
                            ...prev,
                            experienceLevel: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">
                            Entry Level (0-2 years)
                          </SelectItem>
                          <SelectItem value="mid">
                            Mid Level (3-5 years)
                          </SelectItem>
                          <SelectItem value="senior">
                            Senior Level (6-10 years)
                          </SelectItem>
                          <SelectItem value="lead">
                            Lead/Principal (10+ years)
                          </SelectItem>
                          <SelectItem value="executive">
                            Executive Level
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry *</Label>
                      <Select
                        value={profile.industry}
                        onValueChange={(value) =>
                          setProfile((prev) => ({ ...prev, industry: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="manufacturing">
                            Manufacturing
                          </SelectItem>
                          <SelectItem value="consulting">Consulting</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="yearsOfExperience">
                        Years of Experience
                      </Label>
                      <Input
                        id="yearsOfExperience"
                        type="number"
                        value={profile.yearsOfExperience}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            yearsOfExperience:
                              Number.parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveSection("professional")}
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Current Title</p>
                      <p className="font-medium">{profile.currentTitle}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Experience Level</p>
                      <p className="font-medium">
                        {getExperienceLevelLabel(profile.experienceLevel)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Industry</p>
                      <p className="font-medium capitalize">
                        {profile.industry}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        Years of Experience
                      </p>
                      <p className="font-medium">
                        {profile.yearsOfExperience} years
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Education */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-green-600" />
                  <CardTitle>Education</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "education" ? null : "education"
                    )
                  }
                >
                  {editingSection === "education" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {editingSection === "education" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="education">Education Level *</Label>
                      <Select
                        value={profile.education}
                        onValueChange={(value) =>
                          setProfile((prev) => ({ ...prev, education: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select education level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high-school">
                            High School
                          </SelectItem>
                          <SelectItem value="associate">
                            Associate Degree
                          </SelectItem>
                          <SelectItem value="bachelor">
                            Bachelor's Degree
                          </SelectItem>
                          <SelectItem value="master">
                            Master's Degree
                          </SelectItem>
                          <SelectItem value="phd">PhD</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="university">University/Institution</Label>
                      <Input
                        id="university"
                        value={profile.university}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            university: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="graduationYear">Graduation Year</Label>
                      <Input
                        id="graduationYear"
                        value={profile.graduationYear}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            graduationYear: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gpa">GPA (Optional)</Label>
                      <Input
                        id="gpa"
                        value={profile.gpa}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            gpa: e.target.value,
                          }))
                        }
                        placeholder="3.8"
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveSection("education")}
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Degree</p>
                      <p className="font-medium">
                        {getEducationLabel(profile.education)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">University</p>
                      <p className="font-medium">
                        {profile.university || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Graduation Year</p>
                      <p className="font-medium">
                        {profile.graduationYear || "Not specified"}
                      </p>
                    </div>
                    {profile.gpa && (
                      <div>
                        <p className="text-sm text-gray-600">GPA</p>
                        <p className="font-medium">{profile.gpa}/4.0</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Online Presence */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-600" />
                  <CardTitle>Online Presence</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "online" ? null : "online"
                    )
                  }
                >
                  {editingSection === "online" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {editingSection === "online" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                      <Input
                        id="linkedinUrl"
                        value={profile.linkedinUrl}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            linkedinUrl: e.target.value,
                          }))
                        }
                        placeholder="https://linkedin.com/in/johndoe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="portfolioUrl">Portfolio Website</Label>
                      <Input
                        id="portfolioUrl"
                        value={profile.portfolioUrl}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            portfolioUrl: e.target.value,
                          }))
                        }
                        placeholder="https://johndoe.dev"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="githubUrl">GitHub Profile</Label>
                      <Input
                        id="githubUrl"
                        value={profile.githubUrl}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            githubUrl: e.target.value,
                          }))
                        }
                        placeholder="https://github.com/johndoe"
                      />
                    </div>
                    <Button
                      onClick={() => handleSaveSection("online")}
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.linkedinUrl ? (
                      <a
                        href={profile.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <Globe className="h-4 w-4" />
                        LinkedIn Profile
                      </a>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No LinkedIn profile added
                      </p>
                    )}
                    {profile.portfolioUrl ? (
                      <a
                        href={profile.portfolioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <Globe className="h-4 w-4" />
                        Portfolio Website
                      </a>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No portfolio website added
                      </p>
                    )}
                    {profile.githubUrl ? (
                      <a
                        href={profile.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <Globe className="h-4 w-4" />
                        GitHub Profile
                      </a>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No GitHub profile added
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Career Goals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-600" />
                  <CardTitle>Career Goals</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "career" ? null : "career"
                    )
                  }
                >
                  {editingSection === "career" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Edit3 className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {editingSection === "career" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="desiredRole">Desired Role *</Label>
                      <Input
                        id="desiredRole"
                        value={profile.desiredRole}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            desiredRole: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salaryExpectation">
                        Salary Expectation
                      </Label>
                      <Select
                        value={profile.salaryExpectation}
                        onValueChange={(value) =>
                          setProfile((prev) => ({
                            ...prev,
                            salaryExpectation: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select salary range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50k-75k">
                            $50,000 - $75,000
                          </SelectItem>
                          <SelectItem value="75k-100k">
                            $75,000 - $100,000
                          </SelectItem>
                          <SelectItem value="100k-150k">
                            $100,000 - $150,000
                          </SelectItem>
                          <SelectItem value="150k-200k">
                            $150,000 - $200,000
                          </SelectItem>
                          <SelectItem value="200k+">$200,000+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workPreference">Work Preference *</Label>
                      <Select
                        value={profile.workPreference}
                        onValueChange={(value) =>
                          setProfile((prev) => ({
                            ...prev,
                            workPreference: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select work preference" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="onsite">On-site</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => handleSaveSection("career")}
                      disabled={loading}
                    >
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">Desired Role</p>
                      <p className="font-medium">{profile.desiredRole}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">
                        Salary Expectation
                      </p>
                      <p className="font-medium">
                        {getSalaryLabel(profile.salaryExpectation) ||
                          "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Work Preference</p>
                      <p className="font-medium capitalize">
                        {profile.workPreference}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  asChild
                  className="w-full bg-transparent"
                  variant="outline"
                >
                  <Link href="/dashboard/job-seeker/profile-setup">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Complete Profile Setup
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-transparent"
                  variant="outline"
                >
                  <Link href="/dashboard/job-seeker/upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Update Resume
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-transparent"
                  variant="outline"
                >
                  <Link href="/dashboard/jobs">
                    <Target className="mr-2 h-4 w-4" />
                    Browse Jobs
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
