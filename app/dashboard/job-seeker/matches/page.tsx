"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { DonutChart, SkillBar, ScoreRing } from "@/components/ui/charts"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  ExternalLink,
  Sparkles,
  Search,
  Target,
  TrendingUp,
  Zap,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  RefreshCw,
  Trophy,
  Briefcase,
  AlertTriangle,
} from "lucide-react"

interface Match {
  _id: string
  resumeId: {
    _id: string
    filename: string
  }
  jobDescriptionId: {
    _id: string
    title: string
    location?: string
    company?: string
  }
  matchScore: number
  atsScore: number
  matchedSkills: string[]
  suggestions: string[]
  matchDate: string
}

type FilterTab = "all" | "hot" | "good" | "improve"
type SortKey = "matchScore" | "atsScore" | "newest"

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "matchScore", label: "Best Match" },
  { value: "atsScore", label: "ATS Score" },
  { value: "newest", label: "Newest First" },
]

function MatchRing({ score }: { score: number }) {
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626"
  const bg = score >= 80 ? "#f0fdf4" : score >= 60 ? "#fffbeb" : "#fef2f2"
  const text = score >= 80 ? "text-green-700" : score >= 60 ? "text-amber-700" : "text-red-700"
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (score / 100) * circumference

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: 64, height: 64, background: bg, borderRadius: "50%" }}
    >
      <svg width="64" height="64" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="4" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`text-sm font-bold ${text} z-10`}>{score}%</span>
    </div>
  )
}

function MatchLabel({ score }: { score: number }) {
  if (score >= 80)
    return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs gap-1"><Trophy className="h-3 w-3" />Hot Match</Badge>
  if (score >= 60)
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs gap-1"><TrendingUp className="h-3 w-3" />Good Match</Badge>
  return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs gap-1"><AlertTriangle className="h-3 w-3" />Needs Work</Badge>
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(ms / 86_400_000)
  if (d === 0) return "Today"
  if (d === 1) return "Yesterday"
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

function MatchCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false)
  const showSkills = expanded ? match.matchedSkills : match.matchedSkills.slice(0, 5)
  const extraSkills = match.matchedSkills.length - 5

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: match.matchScore >= 80 ? "#16a34a" : match.matchScore >= 60 ? "#d97706" : "#dc2626" }}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <MatchRing score={match.matchScore} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm leading-snug line-clamp-1">
                  {match.jobDescriptionId?.title || "Untitled Job"}
                </h3>
                {match.jobDescriptionId?.company && (
                  <p className="text-xs text-muted-foreground mt-0.5">{match.jobDescriptionId.company}</p>
                )}
              </div>
              <MatchLabel score={match.matchScore} />
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {match.jobDescriptionId?.location && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {match.jobDescriptionId.location}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                {match.resumeId?.filename?.replace(/\.[^.]+$/, "") || "Resume"}
              </span>
              <span className="text-xs text-muted-foreground">{timeAgo(match.matchDate)}</span>
            </div>
          </div>
        </div>

        {/* ATS Score */}
        <div className="flex items-center gap-3">
          <ScoreRing value={match.matchScore} size={52} stroke={5} color={match.matchScore >= 70 ? "#16a34a" : match.matchScore >= 50 ? "#d97706" : "#dc2626"} sublabel="Match" />
          <div className="flex-1">
            <SkillBar label="ATS Score" value={match.atsScore} color={match.atsScore >= 70 ? "#16a34a" : match.atsScore >= 50 ? "#d97706" : "#dc2626"} />
          </div>
        </div>

        {/* Matched Skills */}
        {match.matchedSkills.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Matched Skills ({match.matchedSkills.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {showSkills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs font-normal">
                  {skill}
                </Badge>
              ))}
              {!expanded && extraSkills > 0 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs text-primary hover:underline"
                >
                  +{extraSkills} more
                </button>
              )}
              {expanded && extraSkills > 0 && (
                <button
                  onClick={() => setExpanded(false)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Show less
                </button>
              )}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {match.suggestions?.length > 0 && (
          <details className="group">
            <summary className="flex items-center gap-1 text-xs font-medium text-amber-600 cursor-pointer list-none">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {match.suggestions.length} improvement{match.suggestions.length > 1 ? "s" : ""} suggested
              <ChevronDown className="h-3 w-3 ml-auto group-open:hidden" />
              <ChevronUp className="h-3 w-3 ml-auto hidden group-open:block" />
            </summary>
            <ul className="mt-2 space-y-1 pl-4">
              {match.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-muted-foreground list-disc">{s}</li>
              ))}
            </ul>
          </details>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 text-xs h-8" asChild>
            <Link href={`/dashboard/jobs/${match.jobDescriptionId?._id}`}>
              View Job <ExternalLink className="ml-1.5 h-3 w-3" />
            </Link>
          </Button>
          <Button size="sm" className="flex-1 text-xs h-8 bg-purple-600 hover:bg-purple-700" asChild>
            <Link href={`/dashboard/jobs/${match.jobDescriptionId?._id}/apply`}>
              Apply Now
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function JobMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<FilterTab>("all")
  const [sort, setSort] = useState<SortKey>("matchScore")
  const { toast } = useToast()

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/match")
      if (res.ok) {
        const data = await res.json()
        setMatches(Array.isArray(data) ? data : [])
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: "Error", description: (err as any).message || "Failed to load matches.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network Error", description: "Could not load job matches.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateMatches = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/api/match/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        toast({ title: "Match scan complete!", description: "Your matches have been refreshed." })
        await fetchMatches()
      } else {
        const err = await res.json().catch(() => ({}))
        toast({ title: "Generation Failed", description: (err as any).message || "Please try again.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  const stats = useMemo(() => {
    if (!matches.length) return null
    const avg = Math.round(matches.reduce((s, m) => s + m.matchScore, 0) / matches.length)
    const hot = matches.filter(m => m.matchScore >= 80).length
    const avgATS = Math.round(matches.reduce((s, m) => s + m.atsScore, 0) / matches.length)
    const best = Math.max(...matches.map(m => m.matchScore))
    return { avg, hot, avgATS, best }
  }, [matches])

  const filtered = useMemo(() => {
    let list = [...matches]

    // Filter by tab
    if (filter === "hot") list = list.filter(m => m.matchScore >= 80)
    else if (filter === "good") list = list.filter(m => m.matchScore >= 60 && m.matchScore < 80)
    else if (filter === "improve") list = list.filter(m => m.matchScore < 60)

    // Search by job title
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m =>
        m.jobDescriptionId?.title?.toLowerCase().includes(q) ||
        m.jobDescriptionId?.company?.toLowerCase().includes(q)
      )
    }

    // Sort
    list.sort((a, b) => {
      if (sort === "matchScore") return b.matchScore - a.matchScore
      if (sort === "atsScore") return b.atsScore - a.atsScore
      if (sort === "newest") return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
      return 0
    })

    return list
  }, [matches, filter, sort, search])

  const hotCount = matches.filter(m => m.matchScore >= 80).length
  const goodCount = matches.filter(m => m.matchScore >= 60 && m.matchScore < 80).length
  const improveCount = matches.filter(m => m.matchScore < 60).length

  const FILTER_TABS: { id: FilterTab; label: string; count: number; color: string }[] = [
    { id: "all", label: "All Matches", count: matches.length, color: "text-foreground" },
    { id: "hot", label: "Hot (≥80%)", count: hotCount, color: "text-green-600" },
    { id: "good", label: "Good (60–79%)", count: goodCount, color: "text-amber-600" },
    { id: "improve", label: "Needs Work (<60%)", count: improveCount, color: "text-red-600" },
  ]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
        <p className="text-sm text-muted-foreground">Loading your job matches…</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5 w-full">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            AI Job Matches
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-powered matches between your resumes and open positions
          </p>
        </div>
        <Button
          onClick={handleGenerateMatches}
          disabled={generating}
          className="bg-purple-600 hover:bg-purple-700 gap-2"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {generating ? "Scanning…" : "Scan Now"}
        </Button>
      </div>

      {/* ── Stats row ── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <DonutChart
                size={90}
                innerLabel={String(matches.length)}
                innerSub="total"
                slices={[
                  ...(hotCount > 0 ? [{ label: "Hot ≥80%", value: hotCount, color: "#16a34a" }] : []),
                  ...(goodCount > 0 ? [{ label: "Good 60–79%", value: goodCount, color: "#d97706" }] : []),
                  ...(improveCount > 0 ? [{ label: "<60%", value: improveCount, color: "#dc2626" }] : []),
                ].filter(s => s.value > 0)}
              />
              <div className="flex-1 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Match Distribution</p>
                <SkillBar label="Avg Match" value={stats.avg} color="#8b5cf6" />
                <SkillBar label="Avg ATS" value={stats.avgATS} color="#f59e0b" />
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm bg-purple-50">
              <CardContent className="p-4 flex items-center gap-3">
                <ScoreRing value={stats.avg} size={52} stroke={5} color="#8b5cf6" sublabel="avg" />
                <div>
                  <div className="text-xs text-muted-foreground">Avg Match</div>
                  <div className="text-lg font-bold text-purple-700">{stats.avg}%</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-green-50">
              <CardContent className="p-4 flex items-center gap-3">
                <ScoreRing value={stats.hot > 0 ? Math.min(stats.hot * 20, 100) : 5} size={52} stroke={5} color="#16a34a" sublabel="hot" />
                <div>
                  <div className="text-xs text-muted-foreground">Hot Matches</div>
                  <div className="text-lg font-bold text-green-700">{stats.hot}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <ScoreRing value={stats.avgATS} size={52} stroke={5} color="#d97706" sublabel="ATS" />
                <div>
                  <div className="text-xs text-muted-foreground">Avg ATS</div>
                  <div className="text-lg font-bold text-amber-700">{stats.avgATS}%</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-blue-50">
              <CardContent className="p-4 flex items-center gap-3">
                <ScoreRing value={stats.best} size={52} stroke={5} color="#2563eb" sublabel="best" />
                <div>
                  <div className="text-xs text-muted-foreground">Best Match</div>
                  <div className="text-lg font-bold text-blue-700">{stats.best}%</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Filter tabs ── */}
      {matches.length > 0 && (
        <div className="flex flex-wrap gap-1 border-b pb-3">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                filter === tab.id
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-transparent border-border text-muted-foreground hover:border-purple-300 hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 font-bold ${filter === tab.id ? "text-white/80" : tab.color}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Search + Sort ── */}
      {matches.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by job title or company…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={sort} onValueChange={v => setSort(v as SortKey)}>
            <SelectTrigger className="w-40 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="self-center text-xs text-muted-foreground">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* ── Match cards ── */}
      {matches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-4">
            <Sparkles className="h-12 w-12 text-purple-400 mx-auto" />
            <div>
              <CardTitle className="text-lg">No matches yet</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                Upload your resume and click "Scan Now" to discover jobs that match your skills.
              </p>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" asChild>
                <Link href="/dashboard/job-seeker/upload">Upload Resume</Link>
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleGenerateMatches} disabled={generating}>
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Scan Now
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No matches found for your current filters.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setFilter("all"); setSearch("") }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(match => (
            <MatchCard key={match._id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}
