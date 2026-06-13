"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Search, MapPin, DollarSign, Briefcase, Clock, Bookmark,
  BookmarkCheck, ExternalLink, ChevronDown, SlidersHorizontal, X,
  Grid3X3, List, TrendingUp, Zap, Building2, Globe, Users,
  CheckCircle2, Star, ArrowUpDown, RefreshCw, Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Job {
  _id: string;
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
  benefits?: string[];
  companyId?: { name?: string; logoUrl?: string; description?: string; website?: string };
  companyName?: string;
}

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship"];
const REMOTE_OPTIONS = ["Remote", "Hybrid", "On-site"];
const EXPERIENCE_LEVELS = ["Intern", "Junior", "Mid", "Senior", "Lead", "Manager"];
const SALARY_RANGES = [
  { label: "Any", min: 0, max: Infinity },
  { label: "< $60k", min: 0, max: 60000 },
  { label: "$60k–$100k", min: 60000, max: 100000 },
  { label: "$100k–$150k", min: 100000, max: 150000 },
  { label: "$150k+", min: 150000, max: Infinity },
];

function parseSalaryNum(salary?: string): number | null {
  if (!salary) return null;
  const m = salary.replace(/[^0-9]/g, "");
  return m ? parseInt(m) : null;
}

function getCompanyInitials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function getCompanyColor(name?: string): string {
  const colors = ["#7c3aed", "#2563eb", "#059669", "#dc2626", "#d97706", "#0e7490", "#be185d", "#1e293b"];
  if (!name) return colors[0];
  return colors[name.charCodeAt(0) % colors.length];
}

function timeAgo(date: string): string {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return ""; }
}

function isNew(date: string): boolean {
  return Date.now() - new Date(date).getTime() < 24 * 60 * 60 * 1000;
}

function MatchScore({ jobSkills, userSkills }: { jobSkills: string[]; userSkills: string[] }) {
  if (!userSkills.length || !jobSkills.length) return null;
  const norm = (s: string) => s.toLowerCase().trim();
  const matched = jobSkills.filter(s => userSkills.some(u => norm(u) === norm(s) || norm(u).includes(norm(s)) || norm(s).includes(norm(u))));
  const pct = Math.round((matched.length / jobSkills.length) * 100);
  const color = pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-1" title={`Matched ${matched.length}/${jobSkills.length} skills`}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, fontWeight: 700, color }}>{pct}%</span>
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 600 }}>match</span>
    </div>
  );
}

function CompanyLogo({ name, logoUrl, size = 40 }: { name?: string; logoUrl?: string; size?: number }) {
  const color = getCompanyColor(name);
  const initials = getCompanyInitials(name);
  if (logoUrl) {
    return <img src={logoUrl} alt={name} style={{ width: size, height: size, borderRadius: 8, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.3, fontWeight: 700, color }}>{initials}</span>
    </div>
  );
}

type SortOption = "recent" | "salary" | "match";
type ViewMode = "list" | "grid";

export default function BrowseJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedRemote, setSelectedRemote] = useState<string[]>([]);
  const [selectedExp, setSelectedExp] = useState<string[]>([]);
  const [salaryRange, setSalaryRange] = useState(0);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showFilters, setShowFilters] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchJobs();
    loadSaved();
    loadApplied();
    loadUserSkills();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/job-descriptions");
      if (r.ok) {
        const d = await r.json();
        setJobs(d.jobs || []);
      } else {
        toast({ title: "Error", description: "Failed to fetch jobs.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not load jobs.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadSaved = () => {
    try { setSavedJobs(new Set(JSON.parse(localStorage.getItem("savedJobs") || "[]"))); } catch { /**/ }
  };
  const loadApplied = async () => {
    try {
      const r = await fetch("/api/applications/my-applications");
      if (r.ok) {
        const d = await r.json();
        setAppliedJobs(new Set((d.applications || []).map((a: any) => a.jobDescriptionId?._id || a.jobDescriptionId)));
      }
    } catch { /**/ }
  };
  const loadUserSkills = async () => {
    try {
      const r = await fetch("/api/users/profile");
      if (r.ok) {
        const d = await r.json();
        setUserSkills(d.skills || []);
      }
    } catch { /**/ }
  };

  const toggleSave = (id: string) => {
    setSavedJobs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try { localStorage.setItem("savedJobs", JSON.stringify([...next])); } catch { /**/ }
      return next;
    });
  };

  const toggleFilter = <T extends string>(arr: T[], setArr: (v: T[]) => void, val: T) => {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const clearFilters = () => {
    setSearchTerm(""); setLocationFilter(""); setSelectedTypes([]);
    setSelectedRemote([]); setSelectedExp([]); setSalaryRange(0);
  };

  const activeFilterCount = selectedTypes.length + selectedRemote.length + selectedExp.length + (salaryRange > 0 ? 1 : 0) + (locationFilter ? 1 : 0);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    const loc = locationFilter.toLowerCase();
    const sal = SALARY_RANGES[salaryRange];

    return jobs.filter(job => {
      const skills = [...(job.skills || []), ...(job.skillsRequired || [])];
      const matchSearch = !q || job.title.toLowerCase().includes(q) || job.description?.toLowerCase().includes(q) || job.location?.toLowerCase().includes(q) || skills.some(s => s.toLowerCase().includes(q)) || (job.companyId?.name || "").toLowerCase().includes(q);
      const matchLoc = !loc || job.location?.toLowerCase().includes(loc);
      const matchType = !selectedTypes.length || selectedTypes.some(t => job.employmentType?.toLowerCase().includes(t.toLowerCase()));
      const matchRemote = !selectedRemote.length || selectedRemote.some(r => {
        if (r === "Remote") return job.remotePolicy?.toLowerCase().includes("remote") || job.location?.toLowerCase().includes("remote");
        if (r === "Hybrid") return job.remotePolicy?.toLowerCase().includes("hybrid") || job.location?.toLowerCase().includes("hybrid");
        if (r === "On-site") return !job.remotePolicy || job.remotePolicy?.toLowerCase().includes("on-site") || job.remotePolicy?.toLowerCase().includes("onsite");
        return true;
      });
      const matchExp = !selectedExp.length || selectedExp.some(e => job.experienceLevel?.toLowerCase().includes(e.toLowerCase()));
      const jobSalary = parseSalaryNum(job.salary);
      const matchSal = sal.max === Infinity && sal.min === 0 || !jobSalary || (jobSalary >= sal.min && jobSalary <= sal.max);
      return matchSearch && matchLoc && matchType && matchRemote && matchExp && matchSal;
    });
  }, [jobs, searchTerm, locationFilter, selectedTypes, selectedRemote, selectedExp, salaryRange]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    if (sortBy === "recent") copy.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
    if (sortBy === "salary") copy.sort((a, b) => (parseSalaryNum(b.salary) || 0) - (parseSalaryNum(a.salary) || 0));
    if (sortBy === "match") copy.sort((a, b) => {
      const skills = (j: Job) => [...(j.skills || []), ...(j.skillsRequired || [])];
      const match = (j: Job) => {
        const js = skills(j);
        if (!js.length || !userSkills.length) return 0;
        return js.filter(s => userSkills.some(u => u.toLowerCase() === s.toLowerCase())).length / js.length;
      };
      return match(b) - match(a);
    });
    return copy;
  }, [filtered, sortBy, userSkills]);

  const savedList = sorted.filter(j => savedJobs.has(j._id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-3 text-gray-500 font-medium">Loading jobs…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top search bar ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="w-full px-4 py-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Job title, company, or skill…"
                className="pl-9 h-10"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
            <div className="relative w-48">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                placeholder="Location"
                className="pl-9 h-10"
              />
            </div>
            <Button onClick={fetchJobs} variant="outline" className="h-10 px-3">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant={showFilters ? "default" : "outline"}
              className={`h-10 gap-1.5 ${showFilters ? "bg-purple-600 hover:bg-purple-700" : ""}`}
              onClick={() => setShowFilters(v => !v)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white text-purple-700 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-4 flex gap-4">

        {/* ── Sidebar filters ── */}
        {showFilters && (
          <aside className="w-64 flex-shrink-0 space-y-4">
            {/* Filter header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-purple-600" /> Filters
                </span>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-purple-600 hover:text-purple-800 font-medium">
                    Clear all
                  </button>
                )}
              </div>

              {/* Job Type */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Job Type</p>
                <div className="space-y-1.5">
                  {EMPLOYMENT_TYPES.map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={selectedTypes.includes(t)} onChange={() => toggleFilter(selectedTypes, setSelectedTypes, t)}
                        className="w-3.5 h-3.5 accent-purple-600" />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{t}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Remote */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Work Mode</p>
                <div className="space-y-1.5">
                  {REMOTE_OPTIONS.map(r => (
                    <label key={r} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={selectedRemote.includes(r)} onChange={() => toggleFilter(selectedRemote, setSelectedRemote, r)}
                        className="w-3.5 h-3.5 accent-purple-600" />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Experience Level</p>
                <div className="space-y-1.5">
                  {EXPERIENCE_LEVELS.map(e => (
                    <label key={e} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={selectedExp.includes(e)} onChange={() => toggleFilter(selectedExp, setSelectedExp, e)}
                        className="w-3.5 h-3.5 accent-purple-600" />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{e}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Salary */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Salary Range</p>
                <div className="space-y-1.5">
                  {SALARY_RANGES.map((s, i) => (
                    <label key={s.label} className="flex items-center gap-2 cursor-pointer group">
                      <input type="radio" checked={salaryRange === i} onChange={() => setSalaryRange(i)}
                        className="w-3.5 h-3.5 accent-purple-600" />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Saved jobs count */}
            {savedJobs.size > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookmarkCheck className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-800">Saved Jobs ({savedJobs.size})</span>
                </div>
                <div className="space-y-1">
                  {savedList.slice(0, 4).map(j => (
                    <Link key={j._id} href={`/dashboard/jobs/${j._id}`}
                      className="text-xs text-purple-700 hover:text-purple-900 block truncate">
                      → {j.title}
                    </Link>
                  ))}
                  {savedList.length > 4 && <p className="text-xs text-purple-400">+{savedList.length - 4} more</p>}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Results header */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-900">{sorted.length.toLocaleString()} jobs</span>
              <span className="text-gray-500 text-sm ml-1">
                {searchTerm ? `for "${searchTerm}"` : "found"}
                {activeFilterCount > 0 ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} applied` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
                  className="text-sm bg-transparent border-none outline-none text-gray-700 cursor-pointer">
                  <option value="recent">Most Recent</option>
                  <option value="salary">Highest Salary</option>
                  <option value="match">Best Match</option>
                </select>
              </div>
              {/* View toggle */}
              <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
                <button onClick={() => setViewMode("list")}
                  className={`p-1.5 ${viewMode === "list" ? "bg-purple-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  <List className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode("grid")}
                  className={`p-1.5 ${viewMode === "grid" ? "bg-purple-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  <Grid3X3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedTypes.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                  {t} <button onClick={() => toggleFilter(selectedTypes, setSelectedTypes, t)}><X className="h-3 w-3" /></button>
                </span>
              ))}
              {selectedRemote.map(r => (
                <span key={r} className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                  {r} <button onClick={() => toggleFilter(selectedRemote, setSelectedRemote, r)}><X className="h-3 w-3" /></button>
                </span>
              ))}
              {selectedExp.map(e => (
                <span key={e} className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                  {e} <button onClick={() => toggleFilter(selectedExp, setSelectedExp, e)}><X className="h-3 w-3" /></button>
                </span>
              ))}
              {salaryRange > 0 && (
                <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                  {SALARY_RANGES[salaryRange].label} <button onClick={() => setSalaryRange(0)}><X className="h-3 w-3" /></button>
                </span>
              )}
            </div>
          )}

          {/* No results */}
          {sorted.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-700 font-semibold">No jobs found</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filters</p>
              <Button onClick={clearFilters} variant="outline" className="mt-4">Clear all filters</Button>
            </div>
          )}

          {/* Job list */}
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-2"}>
            {sorted.map(job => {
              const isSaved = savedJobs.has(job._id);
              const isApplied = appliedJobs.has(job._id);
              const company = job.companyId?.name || job.companyName || "";
              const allSkills = [...new Set([...(job.skills || []), ...(job.skillsRequired || [])])];

              return viewMode === "list" ? (
                <div key={job._id}
                  className="bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all p-4 flex gap-4 group">
                  {/* Logo */}
                  <CompanyLogo name={company} logoUrl={job.companyId?.logoUrl} size={48} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/dashboard/jobs/${job._id}`}
                            className="font-semibold text-gray-900 hover:text-purple-700 text-base leading-tight">
                            {job.title}
                          </Link>
                          {isNew(job.postedDate) && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">New</span>
                          )}
                          {isApplied && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Applied
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {company && <span className="text-sm text-gray-600 font-medium">{company}</span>}
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{job.location}
                          </span>
                          {job.salary && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />{job.salary}
                            </span>
                          )}
                          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md">{job.employmentType}</span>
                          {job.remotePolicy && (
                            <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md">{job.remotePolicy}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <MatchScore jobSkills={allSkills} userSkills={userSkills} />
                        <button onClick={() => toggleSave(job._id)}
                          className={`p-1.5 rounded-lg transition-colors ${isSaved ? "text-purple-600 bg-purple-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}>
                          {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-gray-500 mt-1.5 line-clamp-2">{job.description}</p>

                    <div className="flex items-center justify-between mt-2.5 flex-wrap gap-2">
                      <div className="flex flex-wrap gap-1">
                        {allSkills.slice(0, 5).map((skill, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{skill}</span>
                        ))}
                        {allSkills.length > 5 && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">+{allSkills.length - 5}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {timeAgo(job.postedDate)}
                        </span>
                        <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700" asChild>
                          <Link href={`/dashboard/jobs/${job._id}`}>View & Apply</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Grid card
                <div key={job._id}
                  className="bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all p-4 flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <CompanyLogo name={company} logoUrl={job.companyId?.logoUrl} size={40} />
                    <div className="flex items-center gap-1">
                      <MatchScore jobSkills={allSkills} userSkills={userSkills} />
                      <button onClick={() => toggleSave(job._id)}
                        className={`p-1.5 rounded-lg ${isSaved ? "text-purple-600" : "text-gray-400 hover:text-gray-600"}`}>
                        {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <Link href={`/dashboard/jobs/${job._id}`}
                      className="font-semibold text-gray-900 hover:text-purple-700 text-sm">
                      {job.title}
                    </Link>
                    {isNew(job.postedDate) && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">New</span>}
                    {isApplied && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Applied</span>}
                  </div>
                  {company && <p className="text-xs text-gray-600 font-medium mb-1">{company}</p>}
                  <div className="flex flex-wrap gap-1.5 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                    {job.salary && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{job.salary}</span>}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">{job.description}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {allSkills.slice(0, 4).map((s, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md">{s}</span>
                    ))}
                    {allSkills.length > 4 && <span className="text-xs text-gray-400">+{allSkills.length - 4}</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{timeAgo(job.postedDate)}</span>
                    <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700" asChild>
                      <Link href={`/dashboard/jobs/${job._id}`}>View</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
