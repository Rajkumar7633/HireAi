"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ScoreRing, SkillBar as ProgressBar } from "@/components/ui/charts"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { RadarChart } from "@/components/ui/radar-chart"
import {
  Loader2,
  MessageSquare,
  Eye,
  Brain,
  Sparkles,
  Target,
  Search,
  Download,
  Users,
  Zap,
  Filter,
  BarChart3,
  Briefcase,
  Mail,
  ClipboardList,
  Star,
  MapPin,
  Clock,
  ChevronRight,
  Wand2,
  GitCompare,
  FileText,
  Settings2,
} from "lucide-react"

interface MatchCandidate {
  userId: string
  name: string
  email?: string
  resumeFile?: string | null
  aiMatchScore: number
  atsScore?: number
  skillsMatched?: string[]
  snippet?: string
}

type SortKey = "score" | "name" | "skills"
type TierFilter = "all" | "elite" | "strong" | "moderate"

const STORAGE_KEY = "ai-matching:last-config"

function scoreTier(score: number): { label: string; class: string } {
  if (score >= 90) return { label: "Elite", class: "bg-emerald-100 text-emerald-800 border-emerald-200" }
  if (score >= 70) return { label: "Strong", class: "bg-violet-100 text-violet-800 border-violet-200" }
  if (score >= 50) return { label: "Moderate", class: "bg-amber-100 text-amber-800 border-amber-200" }
  return { label: "Low", class: "bg-slate-100 text-slate-600 border-slate-200" }
}

function tierMatch(score: number, tier: TierFilter): boolean {
  if (tier === "all") return true
  if (tier === "elite") return score >= 90
  if (tier === "strong") return score >= 70 && score < 90
  if (tier === "moderate") return score >= 50 && score < 70
  return score < 50
}

export default function RecruiterAIMatchingPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<MatchCandidate[]>([])
  const [jdText, setJdText] = useState("")
  const [jdSkills, setJdSkills] = useState("")
  const [running, setRunning] = useState(false)
  const [limit, setLimit] = useState(50)
  const [aiModel, setAiModel] = useState<string | null>(null)
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [minScore, setMinScore] = useState(0)
  const [minOverlap, setMinOverlap] = useState(1)
  const [locationFilter, setLocationFilter] = useState("")
  const [minYears, setMinYears] = useState(0)
  const [offset, setOffset] = useState(0)
  const [jobs, setJobs] = useState<{ _id: string; title: string }[]>([])
  const [tests, setTests] = useState<{ _id: string; title: string }[]>([])
  const [jobId, setJobId] = useState("")
  const [testId, setTestId] = useState("")
  const [templates, setTemplates] = useState<{ _id: string; name: string; subject: string }[]>([])
  const [templateId, setTemplateId] = useState("")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [topN, setTopN] = useState(10)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [expandedRadar, setExpandedRadar] = useState<Record<string, boolean>>({})
  const [resultSearch, setResultSearch] = useState("")
  const [sortBy, setSortBy] = useState<SortKey>("score")
  const [tierFilter, setTierFilter] = useState<TierFilter>("all")
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [loadingJob, setLoadingJob] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      try {
        const s = await fetch("/api/ai/status", { cache: "no-store" })
        if (s.ok) {
          const j = await s.json()
          if (mounted) {
            setAiEnabled(j.enabled)
            setAiModel(j.model)
          }
        }
        const jobsRes = await fetch("/api/job-descriptions/mine", { cache: "no-store" })
        if (jobsRes.ok) {
          const j = await jobsRes.json()
          if (mounted) setJobs(j.jobs || [])
        }
        const testsRes = await fetch("/api/tests/my-tests", { cache: "no-store" })
        if (testsRes.ok) {
          const t = await testsRes.json()
          if (mounted) setTests(t || [])
        }
        const tplRes = await fetch("/api/communication/email-templates", { cache: "no-store" })
        if (tplRes.ok) {
          const tpls = await tplRes.json()
          if (mounted) {
            setTemplates(
              (tpls.templates || []).map((t: { _id: string; name: string; subject: string }) => ({
                _id: t._id,
                name: t.name,
                subject: t.subject,
              })),
            )
          }
        }
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved && mounted) {
            const cfg = JSON.parse(saved)
            if (cfg.jdText) setJdText(cfg.jdText)
            if (cfg.jdSkills) setJdSkills(cfg.jdSkills)
            if (cfg.minScore) setMinScore(cfg.minScore)
            if (cfg.jobId) setJobId(cfg.jobId)
          }
        } catch {
          /* ignore */
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const parsedSkills = useMemo(
    () => jdSkills.split(",").map((s) => s.trim()).filter(Boolean),
    [jdSkills],
  )

  const saveConfig = useCallback(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ jdText, jdSkills, minScore, jobId }),
      )
    } catch {
      /* ignore */
    }
  }, [jdText, jdSkills, minScore, jobId])

  const loadJobDescription = async (id: string) => {
    if (!id) return
    setLoadingJob(true)
    try {
      const res = await fetch(`/api/job-descriptions/${id}`)
      const j = await res.json()
      if (!res.ok) throw new Error(j?.message || "Failed to load job")
      const job = j.jobDescription
      const desc = [job.title, job.description, (job.requirements || []).join("\n")].filter(Boolean).join("\n\n")
      setJdText(desc)
      const skills = (job.skillsRequired || []).join(", ")
      if (skills) setJdSkills(skills)
      setJobId(id)
      toast({ title: "Job loaded", description: job.title })
    } catch (e: unknown) {
      toast({
        title: "Load failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setLoadingJob(false)
    }
  }

  const runMatching = async (offsetOverride?: number) => {
    if (!jdText.trim()) {
      toast({ title: "Job description required", variant: "destructive" })
      return
    }
    const useOffset = offsetOverride ?? offset
    saveConfig()
    try {
      setRunning(true)
      if (offsetOverride === undefined) {
        setResults([])
        setCount(null)
      }
      const resp = await fetch("/api/ai/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: jdText,
          keySkills: parsedSkills,
          limit,
          offset: useOffset,
          minScore,
          minOverlap,
          locationContains: locationFilter,
          minYears,
        }),
      })
      if (!resp.ok) throw new Error("Matching failed")
      const data = await resp.json()
      setResults((data.candidates || []) as MatchCandidate[])
      setCount(data.total ?? data.candidates?.length ?? 0)
      setOffset(data.offset ?? useOffset)
      setLimit(data.limit ?? limit)
      if (offsetOverride === undefined) {
        setSelected({})
        setCompareIds([])
      }
      toast({ title: "Matching complete", description: `${data.total ?? 0} candidates ranked` })
    } catch (e: unknown) {
      toast({
        title: "Matching failed",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      })
    } finally {
      setRunning(false)
    }
  }

  const filteredResults = useMemo(() => {
    let list = [...results]
    if (resultSearch.trim()) {
      const q = resultSearch.toLowerCase()
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.email || "").toLowerCase().includes(q) ||
          (r.skillsMatched || []).some((s) => s.toLowerCase().includes(q)),
      )
    }
    list = list.filter((r) => tierMatch(r.aiMatchScore, tierFilter))
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name)
      if (sortBy === "skills") return (b.skillsMatched?.length || 0) - (a.skillsMatched?.length || 0)
      return b.aiMatchScore - a.aiMatchScore
    })
    return list
  }, [results, resultSearch, tierFilter, sortBy])

  const stats = useMemo(() => {
    if (!results.length) return null
    const scores = results.map((r) => r.aiMatchScore)
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    const elite = results.filter((r) => r.aiMatchScore >= 90).length
    const strong = results.filter((r) => r.aiMatchScore >= 70 && r.aiMatchScore < 90).length
    return {
      avg,
      top: Math.max(...scores),
      elite,
      strong,
      selected: Object.values(selected).filter(Boolean).length,
    }
  }, [results, selected])

  const scoreBuckets = useMemo(() => {
    const buckets = [0, 0, 0, 0]
    results.forEach((r) => {
      if (r.aiMatchScore >= 90) buckets[3]++
      else if (r.aiMatchScore >= 70) buckets[2]++
      else if (r.aiMatchScore >= 50) buckets[1]++
      else buckets[0]++
    })
    return buckets
  }, [results])

  const selectedCandidates = results.filter((r) => selected[r.userId])
  const compareCandidates = results.filter((r) => compareIds.includes(r.userId))

  const toggleCompare = (userId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId)
      if (prev.length >= 3) {
        toast({ title: "Max 3 candidates for compare" })
        return prev
      }
      return [...prev, userId]
    })
  }

  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "AI Score", "ATS Score", "Skills Matched"].join(","),
      ...filteredResults.map((r) =>
        [
          `"${r.name}"`,
          r.email || "",
          r.aiMatchScore,
          r.atsScore ?? "",
          `"${(r.skillsMatched || []).join("; ")}"`,
        ].join(","),
      ),
    ]
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ai-matching-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Exported CSV" })
  }

  const shortlistSelected = async (candidates: MatchCandidate[]) => {
    if (!jobId) {
      toast({ title: "Select a job first", variant: "destructive" })
      return
    }
    try {
      const payload = {
        jobId,
        candidates: candidates.map((r) => ({
          userId: r.userId,
          aiMatchScore: r.aiMatchScore,
          atsScore: r.atsScore,
          skillsMatched: r.skillsMatched,
        })),
      }
      const resp = await fetch("/api/ai/matching/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) throw new Error("shortlist failed")
      const j = await resp.json()
      toast({ title: "Shortlisted", description: `Updated ${j.updated}, Created ${j.created}` })
    } catch (e: unknown) {
      toast({
        title: "Shortlist failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    }
  }

  const emailCandidates = async (candidates: MatchCandidate[], useTemplate = false) => {
    try {
      const payload = useTemplate && templateId
        ? {
            templateId,
            candidates: candidates.map((r) => ({ userId: r.userId })),
            variables: { jobTitle: jobs.find((j) => j._id === jobId)?.title },
          }
        : {
            subject: composeSubject,
            html: composeBody,
            candidates: candidates.map((r) => ({ userId: r.userId })),
            variables: { jobTitle: jobs.find((j) => j._id === jobId)?.title },
          }
      const resp = await fetch("/api/email/send-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) throw new Error("email failed")
      const j = await resp.json()
      toast({ title: "Emails sent", description: `Sent ${j.sent}/${j.total}` })
      setComposeOpen(false)
    } catch (e: unknown) {
      toast({
        title: "Email failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    }
  }

  const assignTests = async (candidates: MatchCandidate[]) => {
    if (!jobId || !testId) {
      toast({ title: "Select job and test", variant: "destructive" })
      return
    }
    try {
      const payload = {
        jobId,
        testId,
        candidates: candidates.map((r) => ({ userId: r.userId })),
      }
      const resp = await fetch("/api/tests/assign-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) throw new Error("assign failed")
      const j = await resp.json()
      toast({ title: "Tests assigned", description: `Updated ${j.updated}, Created ${j.created}` })
    } catch (e: unknown) {
      toast({
        title: "Assign failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <span>Loading AI Matching Studio…</span>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-violet-50/30 to-background">
      {/* Hero */}
      <div className="dashboard-subheader">
        <div className="max-w-[1600px] mx-auto px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <div className="p-2 rounded-xl bg-violet-600 text-white">
                  <Brain className="h-6 w-6" />
                </div>
                AI Matching Studio
              </h1>
              <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
                Rank your talent pool against any role — shortlist, email, and assign tests in one workflow
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {aiEnabled !== null && (
                <Badge variant={aiEnabled ? "default" : "secondary"} className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  {aiEnabled ? aiModel || "AI Active" : "Keyword Fallback"}
                </Badge>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/recruiter/settings/email">
                  <Settings2 className="h-4 w-4 mr-1" /> Email
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/recruiter/email-templates">
                  <FileText className="h-4 w-4 mr-1" /> Templates
                </Link>
              </Button>
            </div>
          </div>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
              {[
                { label: "Matched", value: results.length, icon: Users, color: "text-violet-600" },
                { label: "Avg Score", value: `${stats.avg}%`, icon: BarChart3, color: "text-emerald-600" },
                { label: "Top Match", value: `${stats.top}%`, icon: Star, color: "text-amber-600" },
                { label: "Elite (90+)", value: stats.elite, icon: Zap, color: "text-fuchsia-600" },
                { label: "Selected", value: stats.selected, icon: Target, color: "text-blue-600" },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border bg-white/80 px-3 py-2 flex items-center gap-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <div>
                    <p className="text-lg font-bold leading-none">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Config panel */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-violet-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-violet-600" />
                  Match Configuration
                </CardTitle>
                <CardDescription>Paste a JD or import from an open role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Import from job</label>
                  <div className="flex gap-2">
                    <Select value={jobId || "none"} onValueChange={(v) => setJobId(v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Select —</SelectItem>
                        {jobs.map((j) => (
                          <SelectItem key={j._id} value={j._id}>{j.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!jobId || loadingJob}
                      onClick={() => loadJobDescription(jobId)}
                    >
                      {loadingJob ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Job Description</label>
                  <Textarea
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    placeholder="Paste full job description, requirements, responsibilities…"
                    className="min-h-[140px] text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Key Skills (comma-separated)</label>
                  <Input
                    value={jdSkills}
                    onChange={(e) => setJdSkills(e.target.value)}
                    placeholder="React, TypeScript, Node.js"
                  />
                  {parsedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {parsedSkills.map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Min AI Score %</label>
                    <Input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Min Skill Overlap</label>
                    <Input type="number" min={0} max={20} value={minOverlap} onChange={(e) => setMinOverlap(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</label>
                    <Input placeholder="e.g. Bangalore" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> Min Years Exp</label>
                    <Input type="number" min={0} value={minYears} onChange={(e) => setMinYears(Number(e.target.value))} />
                  </div>
                </div>
                <Button
                  className="w-full bg-violet-600 hover:bg-violet-700"
                  onClick={runMatching}
                  disabled={running}
                >
                  {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Run AI Matching
                </Button>
              </CardContent>
            </Card>

            {results.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Score Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "0–49%", count: scoreBuckets[0], color: "bg-slate-400" },
                    { label: "50–69%", count: scoreBuckets[1], color: "bg-amber-400" },
                    { label: "70–89%", count: scoreBuckets[2], color: "bg-violet-500" },
                    { label: "90–100%", count: scoreBuckets[3], color: "bg-emerald-500" },
                  ].map((b) => (
                    <div key={b.label} className="flex items-center gap-2 text-xs">
                      <span className="w-14 text-muted-foreground">{b.label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${b.color} rounded-full transition-all`}
                          style={{ width: `${results.length ? (b.count / results.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="w-6 font-medium">{b.count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {compareCandidates.length > 0 && (
              <Card className="border-fuchsia-200 bg-fuchsia-50/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GitCompare className="h-4 w-4" /> Compare ({compareCandidates.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {compareCandidates.map((c) => (
                    <div key={c.userId} className="flex justify-between text-sm border-b pb-2 last:border-0">
                      <span className="font-medium truncate">{c.name}</span>
                      <Badge>{c.aiMatchScore}%</Badge>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => setCompareIds([])}>Clear</Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Results panel */}
          <div className="lg:col-span-8 space-y-4">
            {/* Bulk toolbar */}
            {results.length > 0 && (
              <Card className="border-violet-200 bg-white/90 shadow-sm sticky top-[140px] z-10">
                <CardContent className="py-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    const m: Record<string, boolean> = {}
                    results.forEach((r) => { m[r.userId] = true })
                    setSelected(m)
                  }}>Select All</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelected({})}>Clear</Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const m: Record<string, boolean> = {}
                    results.slice(0, topN).forEach((r) => { m[r.userId] = true })
                    setSelected(m)
                  }}>Top {topN}</Button>
                  <Select value={jobId || "none"} onValueChange={(v) => setJobId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Job" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select job</SelectItem>
                      {jobs.map((j) => <SelectItem key={j._id} value={j._id}>{j.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={templateId || "none"} onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Template" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {templates.map((t) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={testId || "none"} onValueChange={(v) => setTestId(v === "none" ? "" : v)}>
                    <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Test" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No test</SelectItem>
                      {tests.map((t) => <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex-1" />
                  <Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-3.5 w-3.5 mr-1" />Export</Button>
                  <Button size="sm" disabled={!selectedCandidates.length} onClick={() => shortlistSelected(selectedCandidates)}>
                    <ClipboardList className="h-3.5 w-3.5 mr-1" />Shortlist
                  </Button>
                  <Button size="sm" variant="secondary" disabled={!templateId || !selectedCandidates.length} onClick={() => emailCandidates(selectedCandidates, true)}>
                    <Mail className="h-3.5 w-3.5 mr-1" />Email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setComposeOpen(true)}><Mail className="h-3.5 w-3.5 mr-1" />Compose</Button>
                  <Button size="sm" variant="outline" disabled={!testId || !selectedCandidates.length} onClick={() => assignTests(selectedCandidates)}>
                    Assign Test
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Filters */}
            {results.length > 0 && (
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search candidates or skills…" className="pl-9 h-9" value={resultSearch} onChange={(e) => setResultSearch(e.target.value)} />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                  <SelectTrigger className="h-9 w-32"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">By Score</SelectItem>
                    <SelectItem value="name">By Name</SelectItem>
                    <SelectItem value="skills">By Skills</SelectItem>
                  </SelectContent>
                </Select>
                <Tabs value={tierFilter} onValueChange={(v) => setTierFilter(v as TierFilter)}>
                  <TabsList className="h-9">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="elite" className="text-xs">Elite</TabsTrigger>
                    <TabsTrigger value="strong" className="text-xs">Strong</TabsTrigger>
                    <TabsTrigger value="moderate" className="text-xs">Moderate</TabsTrigger>
                  </TabsList>
                </Tabs>
                {count != null && count > limit && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={offset === 0 || running} onClick={() => runMatching(Math.max(0, offset - limit))}>Prev</Button>
                    <Button size="sm" variant="outline" disabled={offset + limit >= count || running} onClick={() => runMatching(offset + limit)}>Next</Button>
                  </div>
                )}
              </div>
            )}

            {running && (
              <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
                <span className="font-medium">AI is ranking your talent pool…</span>
              </div>
            )}

            {!running && results.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-20 text-center">
                  <Brain className="h-16 w-16 mx-auto text-violet-300 mb-4" />
                  <h3 className="text-lg font-semibold">No matches yet</h3>
                  <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
                    Paste a job description or import from an open role, then run AI matching to rank candidates instantly.
                  </p>
                  <Button className="mt-6 bg-violet-600 hover:bg-violet-700" onClick={runMatching} disabled={!jdText.trim()}>
                    <Sparkles className="h-4 w-4 mr-2" /> Start Matching
                  </Button>
                </CardContent>
              </Card>
            )}

            {!running && filteredResults.map((r, idx) => {
              const tier = scoreTier(r.aiMatchScore)
              return (
                <Card key={r.userId} className={`overflow-hidden transition-shadow hover:shadow-md ${selected[r.userId] ? "ring-2 ring-violet-400" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox checked={!!selected[r.userId]} onCheckedChange={(v) => setSelected((p) => ({ ...p, [r.userId]: !!v }))} className="mt-1" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                            <h3 className="font-semibold">{r.name}</h3>
                            <Badge variant="outline" className={`text-[10px] border ${tier.class}`}>{tier.label}</Badge>
                            {compareIds.includes(r.userId) && <Badge className="text-[10px]">Comparing</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.email}{r.resumeFile ? ` · ${r.resumeFile}` : ""}</p>
                          {r.skillsMatched && r.skillsMatched.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <ProgressBar
                                label={`${r.skillsMatched.length} skills matched`}
                                value={parsedSkills.length > 0 ? Math.round((r.skillsMatched.length / parsedSkills.length) * 100) : 100}
                                color="#7c3aed"
                              />
                              <div className="flex flex-wrap gap-1">
                                {r.skillsMatched.slice(0, 8).map((s, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px] bg-violet-50 text-violet-700">{s}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.snippet && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">{r.snippet}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <ScoreRing value={r.aiMatchScore} size={56} stroke={5} sublabel="AI Match" />
                        {typeof r.atsScore === "number" && <ScoreRing value={r.atsScore} size={56} stroke={5} sublabel="ATS" />}
                      </div>
                      <div className="flex flex-wrap gap-1 lg:flex-col lg:w-28">
                        <Button size="sm" variant="outline" onClick={() => setExpandedRadar((p) => ({ ...p, [r.userId]: !p[r.userId] }))}>
                          <Brain className="h-3.5 w-3.5 mr-1" />Analysis
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleCompare(r.userId)}>
                          <GitCompare className="h-3.5 w-3.5 mr-1" />Compare
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/recruiter/candidates/${r.userId}`}><Eye className="h-3.5 w-3.5 mr-1" />Profile</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dashboard/messages?userId=${r.userId}`}><MessageSquare className="h-3.5 w-3.5 mr-1" />Message</Link>
                        </Button>
                      </div>
                    </div>
                    {expandedRadar[r.userId] && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl border flex flex-col md:flex-row gap-6 items-center animate-in slide-in-from-top-2">
                        <div className="flex-1 space-y-3">
                          <h4 className="text-sm font-semibold">Skill Alignment</h4>
                          <div className="flex flex-wrap gap-1">
                            {parsedSkills.map((s, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(r.skillsMatched || []).map((s, i) => (
                              <Badge key={i} className="text-[10px] bg-fuchsia-600">{s}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded-lg border shadow-sm">
                          <RadarChart
                            skillsRequired={parsedSkills.length > 0 ? parsedSkills : ["React", "Node", "TypeScript"]}
                            skillsMatched={r.skillsMatched || []}
                            size={200}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {!running && results.length > 0 && filteredResults.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No candidates match your filters.</p>
            )}

            {jobId && results.length > 0 && (
              <div className="flex justify-end">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/recruiter/job-descriptions/${jobId}/candidates`}>
                    View job pipeline <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Compose Bulk Email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Subject" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
            <Textarea
              placeholder="Message — use {{candidateName}}, {{jobTitle}}, {{companyName}}"
              className="min-h-32"
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Sends to {selectedCandidates.length || topN} selected candidate(s)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => {
                const targets = selectedCandidates.length ? selectedCandidates : results.slice(0, topN)
                emailCandidates(targets, false)
              }}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
