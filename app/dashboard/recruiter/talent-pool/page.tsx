"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  Star,
  MessageCircle,
  Eye,
  Users,
  TrendingUp,
  Award,
  Clock,
} from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  professionalSummary?: string;
  profileScore: number;
  latestAssessment?: { score: number; completedAt?: string } | null;
  status?: "available" | "interviewing" | "hired" | "not-interested";
  location?: string;
  lastUpdated?: string;
  skills?: string[];
  yearsOfExperience?: number;
  scores?: {
    projects?: number;
    experience?: number;
    skills?: number;
    coding?: number;
    achievements?: number;
    completeness?: number;
    recency?: number;
    total?: number;
  };
  jobMatchScore?: number;
  finalScore?: number;
}

export default function TalentPoolPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState<"score" | "recent" | "job">("score");
  const [loading, setLoading] = useState(true);
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [requiredSkills, setRequiredSkills] = useState("");
  const [minYears, setMinYears] = useState<number>(0);
  const [jobs, setJobs] = useState<Array<{ _id: string; title: string }>>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [stats, setStats] = useState({
    totalCandidates: 0,
    available: 0,
    interviewing: 0,
    avgScore: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTalentPool();
    // fetch active jobs for selector
    fetch("/api/job-descriptions")
      .then((r) => r.json())
      .then((d) => {
        const j = Array.isArray(d.jobs)
          ? d.jobs.map((x: any) => ({ _id: x._id, title: x.title }))
          : []
        setJobs(j)
      })
      .catch(() => setJobs([]))
      .finally(() => {})
  }, []);

  const fetchTalentPool = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set("q", searchTerm)
      if (minScore > 0) params.set("minScore", String(minScore))
      // If a job is selected, default to job-aware sort unless user chose otherwise
      const effectiveSort = selectedJobId ? (sortBy === "recent" ? "recent" : "job") : sortBy
      params.set("sort", effectiveSort)
      if (requiredSkills.trim()) params.set("skills", requiredSkills)
      if (minYears > 0) params.set("minYears", String(minYears))
      if (selectedJobId) params.set("jobId", selectedJobId)

      const response = await fetch(`/api/talent-pool?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch talent pool");

      const data = await response.json();
      const items = (data.candidates || []).map((u: any) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        profileImage: u.profileImage,
        professionalSummary: u.professionalSummary,
        profileScore: u.profileScore || u.scores?.total || 0,
        latestAssessment: u.latestAssessment || null,
        status: "available",
        location: u.businessLocation || "",
        lastUpdated: u.updatedAt,
        skills: u.skills || [],
        yearsOfExperience: u.yearsOfExperience || 0,
        scores: u.scores || undefined,
        jobMatchScore: u.jobMatchScore,
        finalScore: u.finalScore,
      })) as Candidate[]

      setCandidates(items);
      const total = data.total || items.length
      const avg = items.length ? Math.round(items.reduce((s, c) => s + (c.profileScore || 0), 0) / items.length) : 0
      setStats({
        totalCandidates: total,
        available: items.length, // placeholder until availability is tracked
        interviewing: 0,
        avgScore: avg,
      });
    } catch (error) {
      console.error("Error fetching talent pool:", error);
      // Fallback to empty state
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecompute = async () => {
    try {
      setRecomputeLoading(true);
      const res = await fetch("/api/talent-pool/recompute", { method: "POST" });
      if (!res.ok) throw new Error("Failed to recompute scores");
      const data = await res.json();
      toast({ title: "Scores updated", description: `Recomputed ${data.updatedCount || 0} candidates` });
      await fetchTalentPool();
    } catch (e: any) {
      toast({ title: "Recompute failed", description: e.message || "Please try again" , variant: "destructive"});
    } finally {
      setRecomputeLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      setLoading(true);
      const debounceTimer = setTimeout(() => {
        fetchTalentPool();
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchTerm, selectedFilter, minScore, sortBy, requiredSkills, minYears, selectedJobId]);

  const filteredCandidates = candidates.filter((candidate) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      candidate.name.toLowerCase().includes(q) ||
      (candidate.professionalSummary || "").toLowerCase().includes(q)

    const matchesFilter = selectedFilter === "all" || candidate.status === selectedFilter
    const matchesScore = (candidate.profileScore || 0) >= minScore
    const reqSkills = requiredSkills
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const matchesSkills =
      reqSkills.length === 0 ||
      (candidate.skills || []).some((s) => reqSkills.includes((s || "").toLowerCase()))
    const matchesYears = (candidate.yearsOfExperience || 0) >= minYears

    return matchesSearch && matchesFilter && matchesScore && matchesSkills && matchesYears
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "interviewing":
        return "bg-blue-100 text-blue-800";
      case "hired":
        return "bg-purple-100 text-purple-800";
      case "not-interested":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const displayStats = {
    totalCandidates: stats.totalCandidates,
    available: stats.available,
    interviewing: stats.interviewing,
    avgScore: stats.avgScore,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading talent pool...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Talent Pool</h1>
          <p className="text-gray-600 mt-1">
            Manage and discover top candidates with AI-powered insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Users className="w-4 h-4 mr-2" />
            Import Candidates
          </Button>
          <Button variant="outline" onClick={handleRecompute} disabled={recomputeLoading}>
            {recomputeLoading ? "Recomputing..." : "Recompute Scores"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Candidates
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {displayStats.totalCandidates}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {displayStats.available}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Process</p>
                <p className="text-2xl font-bold text-blue-600">
                  {displayStats.interviewing}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg AI Score
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {displayStats.avgScore}%
                </p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search candidates by name, position, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Job</label>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={selectedJobId}
                  onChange={(e) => {
                    const v = e.target.value
                    setSelectedJobId(v)
                    if (v) setSortBy("job")
                  }}
                >
                  <option value="">All Jobs</option>
                  {jobs.map((j) => (
                    <option key={j._id} value={j._id}>{j.title}</option>
                  ))}
                </select>
              </div>
              <Button
                variant={selectedFilter === "all" ? "default" : "outline"}
                onClick={() => setSelectedFilter("all")}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={selectedFilter === "available" ? "default" : "outline"}
                onClick={() => setSelectedFilter("available")}
                size="sm"
              >
                Available
              </Button>
              <Button
                variant={
                  selectedFilter === "interviewing" ? "default" : "outline"
                }
                onClick={() => setSelectedFilter("interviewing")}
                size="sm"
              >
                Interviewing
              </Button>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Min Score</label>
                <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(parseInt(e.target.value))} />
                <span className="w-10 text-right text-sm">{minScore}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Skills</label>
                <Input placeholder="e.g. react, node" value={requiredSkills} onChange={(e) => setRequiredSkills(e.target.value)} className="w-56" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Min Years</label>
                <Input type="number" min={0} value={minYears} onChange={(e) => setMinYears(parseInt(e.target.value || '0'))} className="w-24" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Sort</label>
                <Button variant={sortBy === "score" ? "default" : "outline"} size="sm" onClick={() => setSortBy("score")}>Score</Button>
                <Button variant={sortBy === "recent" ? "default" : "outline"} size="sm" onClick={() => setSortBy("recent")}>Recent</Button>
                <Button variant={sortBy === "job" ? "default" : "outline"} size="sm" onClick={() => setSortBy("job")}>Job</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCandidates.map((candidate) => (
          <Card
            key={candidate.id}
            className="hover:shadow-lg transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={candidate.profileImage || "/placeholder.svg"} />
                    <AvatarFallback>
                      {candidate.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {candidate.name}
                    </h3>
                    {candidate.professionalSummary && (
                      <p className="text-sm text-gray-600 line-clamp-2 max-w-xl">
                        {candidate.professionalSummary}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge>Score: {candidate.finalScore ?? candidate.profileScore}</Badge>
                  {typeof (candidate as any).jobMatchScore === 'number' && (
                    <Badge variant="secondary">Match: {(candidate as any).jobMatchScore}%</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Profile Score</span>
                    <span className="font-medium">{candidate.profileScore}%</span>
                  </div>
                  <Progress value={candidate.profileScore} className="h-2" />
                </div>

                {candidate.latestAssessment && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Latest Assessment</span>
                    <span>{candidate.latestAssessment.score}%</span>
                  </div>
                )}

                {/* Skills */}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Key Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {candidate.skills.slice(0, 6).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {candidate.skills.length > 6 && (
                        <Badge variant="secondary" className="text-xs">
                          +{candidate.skills.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Score Breakdown */}
                {candidate.scores && (
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                    <div className="flex justify-between"><span>Experience</span><span>{candidate.scores.experience ?? 0}</span></div>
                    <div className="flex justify-between"><span>Skills</span><span>{candidate.scores.skills ?? 0}</span></div>
                    <div className="flex justify-between"><span>Projects</span><span>{candidate.scores.projects ?? 0}</span></div>
                    <div className="flex justify-between"><span>Coding</span><span>{candidate.scores.coding ?? 0}</span></div>
                    <div className="flex justify-between"><span>Achvmts</span><span>{candidate.scores.achievements ?? 0}</span></div>
                    <div className="flex justify-between"><span>Other</span><span>{(candidate.scores.completeness ?? 0) + (candidate.scores.recency ?? 0)}</span></div>
                  </div>
                )}

                <div className="flex justify-between text-sm text-gray-600">
                  <span>Updated {candidate.lastUpdated ? new Date(candidate.lastUpdated).toLocaleDateString() : "-"}</span>
                  <span>{candidate.location || ""}</span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t">
                  <span className="text-xs text-gray-500">
                    Last updated: {candidate.lastUpdated ? new Date(candidate.lastUpdated).toLocaleDateString() : "-"}
                    { (candidate.finalScore ?? candidate.profileScore) === 0 && (
                      <span className="ml-2 text-[11px] text-orange-600">No profile signals yet — add skills/projects or complete an assessment.</span>
                    )}
                  </span>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={() => window.location.assign(`/dashboard/recruiter/candidates/${candidate.id}`)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.location.assign(`/dashboard/messages?userId=${candidate.id}`)}>
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Message
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.location.assign(`/dashboard/recruiter/assessments?userId=${candidate.id}`)}>
                      Assign Test
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.location.assign(`/dashboard/recruiter/video-interviews?userId=${candidate.id}`)}>
                      Schedule Interview
                    </Button>
                    <Button size="sm" variant="outline" title="Save to favorites (coming soon)" disabled>
                      <Star className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCandidates.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No candidates found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
