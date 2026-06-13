"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/use-session";
import {
  Loader2, MapPin, DollarSign, Briefcase, CalendarDays, Globe, Clock,
  ChevronRight, Bookmark, BookmarkCheck, Share2, ExternalLink, CheckCircle2,
  ArrowLeft, Users, GraduationCap, Zap, Building2, Star, Send,
  ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Job {
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
  skillsRequired?: string[];
  postedDate: string;
  experienceLevel?: string;
  remotePolicy?: string;
  visaSponsorship?: boolean;
  benefits?: string[];
  companyId?: { name?: string; logoUrl?: string; description?: string; website?: string };
  companyName?: string;
}

function getCompanyColor(name?: string): string {
  const colors = ["#7c3aed", "#2563eb", "#059669", "#dc2626", "#d97706", "#0e7490", "#be185d", "#1e293b"];
  if (!name) return colors[0];
  return colors[name.charCodeAt(0) % colors.length];
}

function CompanyLogo({ name, logoUrl, size = 64 }: { name?: string; logoUrl?: string; size?: number }) {
  const color = getCompanyColor(name);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (logoUrl) return <img src={logoUrl} alt={name} style={{ width: size, height: size, borderRadius: 12, objectFit: "cover" }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: `${color}18`, border: `2px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.3, fontWeight: 700, color }}>{initials}</span>
    </div>
  );
}

function SkillChip({ skill, matched }: { skill: string; matched: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${
      matched ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-600 border-gray-200"
    }`}>
      {matched && <CheckCircle2 className="h-3 w-3" />}
      {skill}
    </span>
  );
}

export default function JobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const { toast } = useToast();
  const { session, isLoading: sessionLoading } = useSession();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [copied, setCopied] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (jobId) fetchJob();
    const saved = localStorage.getItem("savedJobs");
    if (saved) {
      try { setSaved(new Set(JSON.parse(saved)).has(jobId)); } catch { /**/ }
    }
  }, [jobId]);

  useEffect(() => {
    if (session?.role === "job_seeker") {
      loadUserSkills();
      checkApplied();
    }
  }, [session, jobId]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/job-descriptions/${jobId}`);
      if (r.ok) {
        const d = await r.json();
        setJob(d.jobDescription);
        // Fetch similar
        fetchSimilar(d.jobDescription);
      } else {
        toast({ title: "Error", description: "Job not found.", variant: "destructive" });
        router.push("/dashboard/jobs");
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
      router.push("/dashboard/jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilar = async (job: Job) => {
    try {
      const r = await fetch("/api/job-descriptions");
      if (r.ok) {
        const d = await r.json();
        const others = (d.jobs || []).filter((j: Job) => j._id !== job._id);
        const scored = others.map((j: Job) => {
          const skills = new Set([...(j.skills || []), ...(j.skillsRequired || [])].map(s => s.toLowerCase()));
          const ref = [...(job.skills || []), ...(job.skillsRequired || [])].map(s => s.toLowerCase());
          const overlap = ref.filter(s => skills.has(s)).length;
          return { job: j, score: overlap + (j.employmentType === job.employmentType ? 1 : 0) };
        });
        scored.sort((a: any, b: any) => b.score - a.score);
        setSimilarJobs(scored.slice(0, 3).map((s: any) => s.job));
      }
    } catch { /**/ }
  };

  const loadUserSkills = async () => {
    try {
      const r = await fetch("/api/users/profile");
      if (r.ok) { const d = await r.json(); setUserSkills(d.skills || []); }
    } catch { /**/ }
  };

  const checkApplied = async () => {
    try {
      const r = await fetch("/api/applications/my-applications");
      if (r.ok) {
        const d = await r.json();
        setApplied((d.applications || []).some((a: any) => (a.jobDescriptionId?._id || a.jobDescriptionId) === jobId));
      }
    } catch { /**/ }
  };

  const toggleSave = () => {
    setSaved(prev => {
      const next = !prev;
      try {
        const saved = new Set(JSON.parse(localStorage.getItem("savedJobs") || "[]"));
        next ? saved.add(jobId) : saved.delete(jobId);
        localStorage.setItem("savedJobs", JSON.stringify([...saved]));
      } catch { /**/ }
      toast({ title: next ? "Job saved" : "Job removed from saved", description: next ? "You can find it in your saved jobs." : "" });
      return next;
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /**/ }
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-3 text-gray-500 font-medium">Loading job…</span>
      </div>
    );
  }

  if (!job) return null;

  const allSkills = [...new Set([...(job.skills || []), ...(job.skillsRequired || [])])];
  const normUser = new Set(userSkills.map(s => s.toLowerCase()));
  const matchedSkills = allSkills.filter(s => normUser.has(s.toLowerCase()));
  const missingSkills = allSkills.filter(s => !normUser.has(s.toLowerCase()));
  const matchPct = allSkills.length ? Math.round((matchedSkills.length / allSkills.length) * 100) : null;
  const company = job.companyId?.name || job.companyName || "";
  const companyColor = getCompanyColor(company);
  const descWords = job.description.split(" ");
  const isLong = descWords.length > 80;
  const displayDesc = isLong && !showFullDesc ? descWords.slice(0, 80).join(" ") + "…" : job.description;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/dashboard/jobs" className="hover:text-purple-600 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Browse Jobs
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-700 font-medium truncate max-w-xs">{job.title}</span>
            {company && <><ChevronRight className="h-3 w-3" /><span className="truncate max-w-xs">{company}</span></>}
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Main content ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Company header card */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Color banner */}
            <div style={{ height: 80, background: `linear-gradient(135deg, ${companyColor}22 0%, ${companyColor}08 100%)`, borderBottom: "1px solid #f1f5f9" }} />
            <div className="px-6 pb-5">
              <div className="flex items-end gap-4 -mt-8 mb-4">
                <div className="ring-4 ring-white rounded-xl">
                  <CompanyLogo name={company} logoUrl={job.companyId?.logoUrl} size={64} />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h1>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {company && <span className="text-sm font-semibold text-gray-700">{company}</span>}
                    {job.companyId?.website && (
                      <a href={job.companyId.website} target="_blank" rel="noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-0.5">
                        <ExternalLink className="h-3 w-3" /> Website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" /> {job.location}
                </span>
                {job.salary && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-green-50 border border-green-100 px-3 py-1 rounded-full">
                    <DollarSign className="h-3.5 w-3.5 text-green-500" /> {job.salary}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                  <Briefcase className="h-3.5 w-3.5 text-blue-500" /> {job.employmentType}
                </span>
                {job.remotePolicy && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full">
                    <Globe className="h-3.5 w-3.5 text-purple-500" /> {job.remotePolicy}
                  </span>
                )}
                {job.experienceLevel && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">
                    <GraduationCap className="h-3.5 w-3.5 text-amber-500" /> {job.experienceLevel}
                  </span>
                )}
                {typeof job.visaSponsorship === "boolean" && (
                  <span className={`flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border ${job.visaSponsorship ? "bg-teal-50 border-teal-100 text-teal-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}>
                    <Star className="h-3.5 w-3.5" /> Visa: {job.visaSponsorship ? "Yes" : "No"}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-gray-400 px-2 py-1">
                  <Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(job.postedDate), { addSuffix: true })}
                </span>
              </div>

              {/* Skill match bar */}
              {matchPct !== null && session?.role === "job_seeker" && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-700">Your skill match</span>
                    <span className="text-xs font-bold" style={{ color: matchPct >= 70 ? "#16a34a" : matchPct >= 40 ? "#d97706" : "#dc2626" }}>
                      {matchPct}% ({matchedSkills.length}/{allSkills.length} skills)
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${matchPct}%`, background: matchPct >= 70 ? "#16a34a" : matchPct >= 40 ? "#d97706" : "#dc2626", borderRadius: 10, transition: "width 0.5s" }} />
                  </div>
                  {missingSkills.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      Missing: {missingSkills.slice(0, 4).join(", ")}{missingSkills.length > 4 ? ` +${missingSkills.length - 4} more` : ""}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* About the company */}
          {job.companyId?.description && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" /> About {company || "the Company"}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">{job.companyId.description}</p>
            </div>
          )}

          {/* Job description */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-purple-600" /> Job Description
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{displayDesc}</p>
            {isLong && (
              <button onClick={() => setShowFullDesc(v => !v)}
                className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                {showFullDesc ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show more</>}
              </button>
            )}
          </div>

          {/* Requirements */}
          {job.requirements?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-600" /> Requirements
              </h2>
              <ul className="space-y-2">
                {job.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                    {req}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Responsibilities */}
          {job.responsibilities?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-600" /> Responsibilities
              </h2>
              <ul className="space-y-2">
                {job.responsibilities.map((res, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    {res}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {allSkills.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-purple-600" /> Required Skills
                {session?.role === "job_seeker" && userSkills.length > 0 && (
                  <span className="text-xs text-gray-400 font-normal ml-1">
                    (green = you have it)
                  </span>
                )}
              </h2>
              <div className="flex flex-wrap gap-2">
                {allSkills.map((skill, i) => (
                  <SkillChip key={i} skill={skill} matched={normUser.has(skill.toLowerCase()) && session?.role === "job_seeker"} />
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" /> Benefits & Perks
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {job.benefits.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-amber-50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" /> {b}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar jobs */}
          {similarJobs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Similar Jobs</h2>
              <div className="space-y-3">
                {similarJobs.map(sj => (
                  <Link key={sj._id} href={`/dashboard/jobs/${sj._id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                    <CompanyLogo name={sj.companyId?.name || sj.companyName} logoUrl={sj.companyId?.logoUrl} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-purple-700 truncate">{sj.title}</p>
                      <p className="text-xs text-gray-500 truncate">{sj.companyId?.name || sj.companyName} · {sj.location}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky right panel ── */}
        <div className="space-y-4">
          <div className="sticky top-20 space-y-3">
            {/* Apply card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Posted {format(new Date(job.postedDate), "MMM dd, yyyy")}</div>
                <h3 className="font-semibold text-gray-900">{job.title}</h3>
                {company && <p className="text-sm text-gray-500 mt-0.5">{company}</p>}
              </div>

              {applied ? (
                <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-700 text-sm">Already Applied</p>
                    <p className="text-xs text-green-600">Your application was submitted</p>
                  </div>
                </div>
              ) : session?.role === "job_seeker" ? (
                <Button className="w-full bg-purple-600 hover:bg-purple-700 h-11 text-base font-semibold" asChild>
                  <Link href={`/dashboard/jobs/${job._id}/apply`}>
                    <Send className="h-4 w-4 mr-2" /> Apply Now
                  </Link>
                </Button>
              ) : !session ? (
                <Button className="w-full bg-purple-600 hover:bg-purple-700 h-11" asChild>
                  <Link href="/auth/login">Login to Apply</Link>
                </Button>
              ) : null}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-9" onClick={toggleSave}>
                  {saved ? <BookmarkCheck className="h-4 w-4 mr-1.5 text-purple-600" /> : <Bookmark className="h-4 w-4 mr-1.5" />}
                  {saved ? "Saved" : "Save"}
                </Button>
                <Button variant="outline" className="flex-1 h-9" onClick={copyLink}>
                  {copied ? <Check className="h-4 w-4 mr-1.5 text-green-600" /> : <Copy className="h-4 w-4 mr-1.5" />}
                  {copied ? "Copied!" : "Share"}
                </Button>
              </div>
            </div>

            {/* Job details card */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 text-sm">Job Details</h3>
              <div className="space-y-2.5 text-sm">
                {[
                  { icon: <MapPin className="h-4 w-4 text-gray-400" />, label: "Location", val: job.location },
                  { icon: <Briefcase className="h-4 w-4 text-gray-400" />, label: "Type", val: job.employmentType },
                  job.salary ? { icon: <DollarSign className="h-4 w-4 text-gray-400" />, label: "Salary", val: job.salary } : null,
                  job.remotePolicy ? { icon: <Globe className="h-4 w-4 text-gray-400" />, label: "Work mode", val: job.remotePolicy } : null,
                  job.experienceLevel ? { icon: <GraduationCap className="h-4 w-4 text-gray-400" />, label: "Experience", val: job.experienceLevel } : null,
                  typeof job.visaSponsorship === "boolean" ? { icon: <Star className="h-4 w-4 text-gray-400" />, label: "Visa", val: job.visaSponsorship ? "Sponsored" : "Not sponsored" } : null,
                ].filter(Boolean).map((item: any, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {item.icon}
                    <span className="text-gray-500">{item.label}:</span>
                    <span className="text-gray-900 font-medium ml-auto text-right">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Match score card */}
            {matchPct !== null && session?.role === "job_seeker" && (
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-3">Your Profile Match</h3>
                <div className="flex items-center gap-3 mb-3">
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: `conic-gradient(${matchPct >= 70 ? "#16a34a" : matchPct >= 40 ? "#d97706" : "#dc2626"} ${matchPct * 3.6}deg, #e5e7eb 0deg)`,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: matchPct >= 70 ? "#16a34a" : matchPct >= 40 ? "#d97706" : "#dc2626" }}>{matchPct}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: matchPct >= 70 ? "#16a34a" : matchPct >= 40 ? "#d97706" : "#dc2626" }}>
                      {matchPct >= 70 ? "Strong match" : matchPct >= 40 ? "Partial match" : "Low match"}
                    </p>
                    <p className="text-xs text-gray-500">{matchedSkills.length}/{allSkills.length} skills</p>
                  </div>
                </div>
                {missingSkills.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-gray-600 mb-1.5">Missing skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {missingSkills.slice(0, 5).map((s, i) => (
                        <span key={i} className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/jobs">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Jobs
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
