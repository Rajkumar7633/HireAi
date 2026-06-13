"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  Users,
  Calendar,
  Search,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  TrendingUp,
  Eye,
  EyeOff,
  MoreVertical,
  Copy,
  Share2,
  LayoutGrid,
  List,
  SortAsc,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Target,
  Zap,
  Globe,
  Building2,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScoreRing, TrendLine } from "@/components/ui/charts";

interface JobDescription {
  _id: string;
  title: string;
  description: string;
  location: string;
  salary?: string;
  employmentType: string;
  experienceLevel?: string;
  remotePolicy?: string;
  skills: string[];
  postedDate: string;
  requirements: string[];
  responsibilities: string[];
  isActive?: boolean;
  status?: string;
  applicationCount?: number;
  shortlistedCount?: number;
  hiredCount?: number;
  pendingCount?: number;
}

type SortOption = "newest" | "oldest" | "az" | "za" | "most-applications";
type FilterOption = "all" | "active" | "closed";
type ViewMode = "grid" | "list";

const formatSafeDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    return format(date, "MMM d, yyyy");
  } catch {
    return "—";
  }
};

const remotePolicyColor: Record<string, string> = {
  Remote: "bg-emerald-100 text-emerald-700",
  Hybrid: "bg-blue-100 text-blue-700",
  Onsite: "bg-orange-100 text-orange-700",
};

export default function RecruiterJobDescriptionsPage() {
  const [jobs, setJobs] = useState<JobDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [deleteTarget, setDeleteTarget] = useState<JobDescription | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { session, isLoading: sessionLoading } = useSession();

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/job-descriptions/my-jobs", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobDescriptions || []);
      } else if (response.status === 401) {
        toast({ title: "Session Expired", description: "Please login again.", variant: "destructive" });
      } else {
        const err = await response.json().catch(() => ({}));
        toast({ title: "Error", description: err.message || "Failed to load jobs.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network Error", description: "Could not load jobs.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionLoading && session) void fetchJobs();
  }, [session, sessionLoading]);

  const handleToggleJobActive = async (job: JobDescription) => {
    const nextActive = !(job.isActive !== false);
    setTogglingId(job._id);
    try {
      const response = await fetch(`/api/job-descriptions/${job._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive, status: nextActive ? "active" : "inactive" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({ title: "Update failed", description: data.message || "Could not update status.", variant: "destructive" });
        return;
      }
      toast({ title: nextActive ? "Job reopened" : "Job closed", description: `"${job.title}" is now ${nextActive ? "active" : "closed"}.` });
      void fetchJobs();
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget._id);
    try {
      const response = await fetch(`/api/job-descriptions/${deleteTarget._id}`, { method: "DELETE" });
      if (response.ok) {
        toast({ title: "Job deleted", description: `"${deleteTarget.title}" has been removed.` });
        void fetchJobs();
      } else {
        const err = await response.json().catch(() => ({}));
        toast({ title: "Delete failed", description: err.message || "Could not delete.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  const handleDuplicate = async (job: JobDescription) => {
    try {
      const response = await fetch("/api/job-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${job.title} (Copy)`,
          description: job.description,
          location: job.location,
          salary: job.salary,
          employmentType: job.employmentType,
          skills: job.skills,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
        }),
      });
      if (response.ok) {
        toast({ title: "Job duplicated", description: `A copy of "${job.title}" has been created.` });
        void fetchJobs();
      } else {
        toast({ title: "Duplicate failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    }
  };

  const handleCopyLink = (jobId: string) => {
    const url = `${window.location.origin}/jobs/${jobId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied", description: "Job link copied to clipboard." });
    });
  };

  const filteredJobs = useMemo(() => {
    let result = jobs.filter((job) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.location?.toLowerCase().includes(q) ||
        job.employmentType?.toLowerCase().includes(q);
      const isActive = job.isActive !== false;
      const matchesFilter = filter === "all" || (filter === "active" ? isActive : !isActive);
      return matchesSearch && matchesFilter;
    });

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "newest": return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
        case "oldest": return new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime();
        case "az": return a.title.localeCompare(b.title);
        case "za": return b.title.localeCompare(a.title);
        case "most-applications": return (b.applicationCount || 0) - (a.applicationCount || 0);
        default: return 0;
      }
    });

    return result;
  }, [jobs, search, filter, sort]);

  const stats = useMemo(() => ({
    total: jobs.length,
    active: jobs.filter((j) => j.isActive !== false).length,
    closed: jobs.filter((j) => j.isActive === false).length,
    totalApplications: jobs.reduce((sum, j) => sum + (j.applicationCount || 0), 0),
  }), [jobs]);

  const sortLabels: Record<SortOption, string> = {
    newest: "Newest first",
    oldest: "Oldest first",
    az: "A → Z",
    za: "Z → A",
    "most-applications": "Most applications",
  };

  if (loading || sessionLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Please login to view your jobs.</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/dashboard/recruiter" className="hover:text-foreground transition-colors">Dashboard</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">Job Descriptions</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Job Descriptions</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your open positions and track the hiring pipeline</p>
          </div>
          <Button asChild className="bg-violet-600 hover:bg-violet-700 shadow-sm shrink-0">
            <Link href="/dashboard/recruiter/job-descriptions/create">
              <PlusCircle className="mr-2 h-4 w-4" />
              Post New Job
            </Link>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 bg-gradient-to-br from-violet-50 to-indigo-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-violet-600 uppercase tracking-wide">Total Jobs</p>
                  <p className="text-3xl font-bold text-violet-700 mt-1">{stats.total}</p>
                  <p className="text-xs text-violet-500 mt-0.5">All postings</p>
                  <TrendLine values={[1, 2, stats.total - 1, stats.total]} color="#8b5cf6" width={70} height={24} />
                </div>
                <ScoreRing value={stats.total > 0 ? Math.min(stats.total * 10, 100) : 5} size={58} stroke={6} color="#8b5cf6" sublabel="jobs" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-emerald-50 to-green-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Active</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">{stats.active}</p>
                  <p className="text-xs text-emerald-500 mt-0.5">Live postings</p>
                  <TrendLine values={[0, 1, stats.active - 1, stats.active]} color="#10b981" width={70} height={24} />
                </div>
                <ScoreRing value={stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0} size={58} stroke={6} color="#10b981" sublabel="active" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-slate-50 to-gray-100 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Closed</p>
                  <p className="text-3xl font-bold text-slate-600 mt-1">{stats.closed}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Archived</p>
                  <TrendLine values={[0, 0, stats.closed]} color="#94a3b8" width={70} height={24} />
                </div>
                <ScoreRing value={stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0} size={58} stroke={6} color="#94a3b8" sublabel="closed" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Applications</p>
                  <p className="text-3xl font-bold text-blue-700 mt-1">{stats.totalApplications}</p>
                  <p className="text-xs text-blue-500 mt-0.5">Across all jobs</p>
                  <TrendLine values={[0, 5, 15, stats.totalApplications]} color="#3b82f6" width={70} height={24} />
                </div>
                <ScoreRing value={Math.min(stats.totalApplications, 100)} max={Math.max(stats.totalApplications, 100)} size={58} stroke={6} color="#3b82f6" sublabel="apps" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, location, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-0.5 p-1 bg-muted rounded-lg">
            {(["all", "active", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                  filter === f
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}{" "}
                <span className={`ml-1 text-xs ${filter === f ? "text-violet-600" : "text-muted-foreground"}`}>
                  ({f === "all" ? stats.total : f === "active" ? stats.active : stats.closed})
                </span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <SortAsc className="h-3.5 w-3.5" />
                <span className="text-xs">{sortLabels[sort]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {(Object.keys(sortLabels) as SortOption[]).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setSort(s)}
                  className={sort === s ? "bg-muted" : ""}
                >
                  {sort === s && <CheckCircle2 className="mr-2 h-3.5 w-3.5 text-violet-600" />}
                  {sort !== s && <div className="mr-2 h-3.5 w-3.5" />}
                  {sortLabels[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Toggle */}
          <div className="flex gap-0.5 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded-md transition-all ${view === "grid" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-md transition-all ${view === "list" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Results count */}
        {filteredJobs.length > 0 && (
          <p className="text-xs text-muted-foreground -mt-2">
            Showing {filteredJobs.length} of {jobs.length} job{jobs.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
        )}

        {/* Empty State */}
        {filteredJobs.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 py-20 text-center">
            <div className="h-14 w-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-7 w-7 text-violet-400" />
            </div>
            <p className="font-semibold text-foreground text-lg">
              {jobs.length === 0 ? "No jobs posted yet" : "No jobs match your search"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {jobs.length === 0
                ? "Create your first job posting to start attracting top talent with AI-powered screening."
                : "Try adjusting your search or filter criteria."}
            </p>
            {jobs.length === 0 && (
              <Button asChild className="mt-6 bg-violet-600 hover:bg-violet-700">
                <Link href="/dashboard/recruiter/job-descriptions/create">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Post Your First Job
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Grid View */}
        {filteredJobs.length > 0 && view === "grid" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredJobs.map((job) => {
              const isActive = job.isActive !== false;
              const appCount = job.applicationCount || 0;
              return (
                <Card
                  key={job._id}
                  className="border shadow-sm hover:shadow-md transition-all flex flex-col group relative overflow-hidden"
                >
                  {/* Active indicator strip */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5 ${isActive ? "bg-emerald-400" : "bg-slate-200"}`} />

                  <CardContent className="p-5 flex flex-col gap-3.5 flex-1">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 pt-0.5">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/dashboard/recruiter/job-descriptions/${job._id}/candidates`}
                          className="font-semibold text-base leading-tight hover:text-violet-600 transition-colors line-clamp-1 block"
                        >
                          {job.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge
                            className={`text-xs border-0 px-2 py-0.5 ${
                              isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isActive ? (
                              <><CheckCircle2 className="mr-1 h-3 w-3" />Open</>
                            ) : (
                              <><XCircle className="mr-1 h-3 w-3" />Closed</>
                            )}
                          </Badge>
                          {job.remotePolicy && (
                            <Badge className={`text-xs border-0 px-2 py-0.5 ${remotePolicyColor[job.remotePolicy] || "bg-gray-100 text-gray-600"}`}>
                              {job.remotePolicy === "Remote" && <Globe className="mr-1 h-3 w-3" />}
                              {job.remotePolicy === "Onsite" && <Building2 className="mr-1 h-3 w-3" />}
                              {job.remotePolicy}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/recruiter/job-descriptions/${job._id}/candidates`}>
                              <Users className="mr-2 h-3.5 w-3.5" />
                              View Candidates
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/recruiter/job-descriptions/${job._id}/edit`}>
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              Edit Job
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(job)}>
                            <Copy className="mr-2 h-3.5 w-3.5" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyLink(job._id)}>
                            <Share2 className="mr-2 h-3.5 w-3.5" />
                            Copy Link
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleToggleJobActive(job)}
                            disabled={togglingId === job._id}
                          >
                            {togglingId === job._id ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : isActive ? (
                              <EyeOff className="mr-2 h-3.5 w-3.5" />
                            ) : (
                              <Eye className="mr-2 h-3.5 w-3.5" />
                            )}
                            {isActive ? "Close Job" : "Reopen Job"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(job)}
                            className="text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete Job
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Meta Info */}
                    <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                      {job.location && (
                        <span className="flex items-center gap-1.5 truncate">
                          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                          <span className="truncate">{job.location}</span>
                        </span>
                      )}
                      {job.employmentType && (
                        <span className="flex items-center gap-1.5 truncate">
                          <Clock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                          <span className="truncate">{job.employmentType}</span>
                        </span>
                      )}
                      {job.salary && (
                        <span className="flex items-center gap-1.5 truncate">
                          <DollarSign className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                          <span className="truncate">{job.salary}</span>
                        </span>
                      )}
                      {job.experienceLevel && (
                        <span className="flex items-center gap-1.5 truncate">
                          <Target className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                          <span className="truncate">{job.experienceLevel}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                        {formatSafeDate(job.postedDate)}
                      </span>
                    </div>

                    {/* Description snippet */}
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Skills */}
                    {job.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {job.skills.slice(0, 4).map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs h-5 px-2 bg-violet-50 text-violet-700 border-0">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 4 && (
                          <Badge variant="secondary" className="text-xs h-5 px-2">
                            +{job.skills.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Pipeline Summary */}
                    <div className="rounded-lg bg-muted/50 px-3 py-2.5 space-y-1.5">
                      {appCount > 0 ? (
                        <>
                          {[
                            { label: "Applied",     val: appCount,                  color: "#3b82f6", w: "100%" },
                            { label: "Shortlisted", val: job.shortlistedCount || 0, color: "#8b5cf6", w: `${Math.round(((job.shortlistedCount || 0) / Math.max(appCount, 1)) * 100)}%` },
                            { label: "Hired",       val: job.hiredCount || 0,       color: "#10b981", w: `${Math.round(((job.hiredCount || 0) / Math.max(appCount, 1)) * 100)}%` },
                          ].map(s => (
                            <div key={s.label} className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground w-16 shrink-0">{s.label}</span>
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: s.w, background: s.color }} />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-700 w-5 text-right shrink-0">{s.val}</span>
                            </div>
                          ))}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">No applications yet</span>
                      )}
                    </div>

                    {/* CTA Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t mt-auto">
                      <Button
                        asChild
                        size="sm"
                        className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-700"
                      >
                        <Link href={`/dashboard/recruiter/job-descriptions/${job._id}/candidates`}>
                          <Users className="mr-1.5 h-3 w-3" />
                          {appCount > 0 ? `${appCount} Candidate${appCount !== 1 ? "s" : ""}` : "View Candidates"}
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Link href={`/dashboard/recruiter/job-descriptions/${job._id}/edit`}>
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* List View */}
        {filteredJobs.length > 0 && view === "list" && (
          <div className="space-y-2">
            {filteredJobs.map((job) => {
              const isActive = job.isActive !== false;
              const appCount = job.applicationCount || 0;
              return (
                <Card key={job._id} className="border shadow-sm hover:shadow-md transition-all group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Status indicator */}
                      <div className={`w-1 h-12 rounded-full shrink-0 ${isActive ? "bg-emerald-400" : "bg-slate-200"}`} />

                      {/* Job info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/dashboard/recruiter/job-descriptions/${job._id}/candidates`}
                            className="font-semibold text-sm hover:text-violet-600 transition-colors"
                          >
                            {job.title}
                          </Link>
                          <Badge className={`text-xs border-0 ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                            {isActive ? "Open" : "Closed"}
                          </Badge>
                          {job.remotePolicy && (
                            <Badge className={`text-xs border-0 ${remotePolicyColor[job.remotePolicy] || "bg-gray-100 text-gray-600"}`}>
                              {job.remotePolicy}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                          {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                          {job.employmentType && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.employmentType}</span>}
                          {job.salary && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{job.salary}</span>}
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatSafeDate(job.postedDate)}</span>
                        </div>
                      </div>

                      {/* Application pipeline */}
                      <div className="hidden md:flex items-center gap-4 text-xs text-center shrink-0">
                        <div>
                          <p className="font-semibold text-blue-600">{appCount}</p>
                          <p className="text-muted-foreground">Applied</p>
                        </div>
                        <div>
                          <p className="font-semibold text-violet-600">{job.shortlistedCount || 0}</p>
                          <p className="text-muted-foreground">Shortlisted</p>
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-600">{job.hiredCount || 0}</p>
                          <p className="text-muted-foreground">Hired</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button asChild size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700">
                          <Link href={`/dashboard/recruiter/job-descriptions/${job._id}/candidates`}>
                            <Users className="mr-1.5 h-3 w-3" />
                            Candidates
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0">
                          <Link href={`/dashboard/recruiter/job-descriptions/${job._id}/edit`}>
                            <Edit className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => handleDuplicate(job)}>
                              <Copy className="mr-2 h-3.5 w-3.5" />Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyLink(job._id)}>
                              <Share2 className="mr-2 h-3.5 w-3.5" />Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleJobActive(job)} disabled={togglingId === job._id}>
                              {isActive ? <EyeOff className="mr-2 h-3.5 w-3.5" /> : <Eye className="mr-2 h-3.5 w-3.5" />}
                              {isActive ? "Close" : "Reopen"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(job)}
                              className="text-rose-600 focus:text-rose-600"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quick Link to Dashboard */}
        {jobs.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {stats.totalApplications > 0
                ? `${stats.totalApplications} total application${stats.totalApplications !== 1 ? "s" : ""} across all jobs`
                : "No applications yet — share your job links to attract candidates"}
            </p>
            <Button asChild variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-violet-600">
              <Link href="/dashboard/recruiter">
                <ArrowUpRight className="mr-1 h-3 w-3" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete job posting?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>"{deleteTarget?.title}"</strong> and all associated data.
              {(deleteTarget?.applicationCount || 0) > 0 && (
                <span className="block mt-2 text-rose-600 font-medium">
                  Warning: This job has {deleteTarget?.applicationCount} application{(deleteTarget?.applicationCount || 0) !== 1 ? "s" : ""} that will also be removed.
                </span>
              )}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={!!deletingId}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deletingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
