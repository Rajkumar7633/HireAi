"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { SkillBar, HalfGauge, ScoreRing } from "@/components/ui/charts"
import { useToast } from "@/hooks/use-toast"
import { authFetch } from "@/lib/client-auth"
import {
  IMPORTANCE_META,
  LINKED_TOOLS,
  READINESS_META,
  ROLE_PRESETS,
  type SkillImportance,
  buildExportReport,
  matchScoreColor,
} from "@/lib/skill-gap-utils"
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
  Zap,
} from "lucide-react"

interface MissingSkill {
  skill: string
  importance: SkillImportance
  estimatedWeeks: number
  resources: { title: string; type: string; url: string }[]
}

interface LearningStep {
  week: number
  focus: string
  skills: string[]
  resources: string[]
}

interface AnalysisResult {
  analysisId: string
  jobTitle: string
  matchScore: number
  readinessLevel: string
  currentSkills: string[]
  requiredSkills: string[]
  missingSkills: MissingSkill[]
  learningPath: LearningStep[]
  summary: string
  createdAt?: string
  contextUsed?: {
    hasResume: boolean
    resumeFileName?: string
    profileSkillsCount: number
  }
}

interface DashboardStats {
  totalAnalyses: number
  averageMatch: number
  bestMatch: number
  totalGapsIdentified: number
  weeklyAnalyses: number
}

interface ProfileContext {
  hasResume: boolean
  resumeFileName?: string | null
  profileSkills: string[]
  desiredRole?: string
  currentTitle?: string
  combinedPreview?: string
}

interface HistoryRow {
  id: string
  jobTitle: string
  matchScore: number
  readinessLevel: string
  gapsCount: number
  createdAt: string
}

type MainTab = "analyze" | "results" | "history" | "insights"
type GapFilter = "all" | SkillImportance

export default function SkillGapPage() {
  const { toast } = useToast()
  const [mainTab, setMainTab] = useState<MainTab>("analyze")
  const [loading, setLoading] = useState(false)
  const [bootLoading, setBootLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [profileContext, setProfileContext] = useState<ProfileContext | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])

  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [resumeText, setResumeText] = useState("")
  const [useProfile, setUseProfile] = useState(true)
  const [manualResume, setManualResume] = useState(false)

  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [gapFilter, setGapFilter] = useState<GapFilter>("all")
  const [selectedHistory, setSelectedHistory] = useState<AnalysisResult | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      const res = await authFetch("/api/skill-gap")
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setProfileContext(data.context)
        setHistory(data.analyses || [])
        setResumeText((prev: string) => {
          if (manualResume) return prev
          return data.context?.combinedPreview || prev
        })
        setJobTitle((prev: string) => prev || data.context?.desiredRole || "")
      }
    } catch {
      /* ignore */
    } finally {
      setBootLoading(false)
    }
  }, [manualResume])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  function applyPreset(preset: (typeof ROLE_PRESETS)[0]) {
    setJobTitle(preset.title)
    setJobDescription(preset.sampleJd)
  }

  async function analyze() {
    if (!jobTitle.trim()) {
      toast({ title: "Enter a target job title", variant: "destructive" })
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await authFetch("/api/skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          jobTitle: jobTitle.trim(),
          jobDescription,
          resumeText: manualResume ? resumeText : "",
          useProfile: useProfile && !manualResume,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.needsResume) {
          toast({
            title: "Add your profile or resume first",
            description: "Upload a resume or fill in your profile skills.",
            variant: "destructive",
          })
        }
        throw new Error(data.message)
      }
      setResult(data)
      setMainTab("results")
      loadDashboard()
      toast({ title: "Analysis complete", description: `${data.matchScore}% match for ${jobTitle}` })
    } catch (e: any) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function loadAnalysisDetail(id: string) {
    setLoading(true)
    try {
      const res = await authFetch(`/api/skill-gap?id=${id}`)
      const data = await res.json()
      if (res.ok) {
        setSelectedHistory(data.analysis)
        setMainTab("history")
      }
    } finally {
      setLoading(false)
    }
  }

  async function deleteAnalysis(id: string) {
    const res = await authFetch(`/api/skill-gap/${id}`, { method: "DELETE" })
    if (res.ok) {
      setHistory(prev => prev.filter(a => a.id !== id))
      if (selectedHistory?.analysisId === id) setSelectedHistory(null)
      if (result?.analysisId === id) setResult(null)
      loadDashboard()
      toast({ title: "Analysis deleted" })
    }
  }

  function exportReport(analysis: AnalysisResult) {
    const text = buildExportReport(analysis)
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `skill-gap-${analysis.jobTitle.replace(/\s+/g, "-").toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: "Report downloaded" })
  }

  const filteredGaps = useMemo(() => {
    if (!result) return []
    if (gapFilter === "all") return result.missingSkills
    return result.missingSkills.filter(g => g.importance === gapFilter)
  }, [result, gapFilter])

  const radarData = useMemo(() => {
    if (!result?.requiredSkills.length) return []
    return result.requiredSkills.slice(0, 8).map(skill => ({
      skill: skill.length > 12 ? `${skill.slice(0, 10)}…` : skill,
      required: 100,
      current: result.currentSkills.some(
        c => c.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(c.toLowerCase()),
      )
        ? 100
        : 30,
    }))
  }, [result])

  const totalWeeks = result?.missingSkills.reduce((s, m) => s + m.estimatedWeeks, 0) || 0

  if (bootLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white p-6 md:p-8 shadow-xl">
        <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-8 w-8" />
              <Badge className="bg-white/20 text-white border-0">AI Career Intelligence</Badge>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">Skill Gap Analyzer</h1>
            <p className="text-blue-100 mt-1 max-w-xl text-sm md:text-base">
              Compare your profile & resume against any role. Get gaps, learning paths, and resource recommendations.
            </p>
          </div>
          <Button
            size="lg"
            className="bg-white text-blue-800 hover:bg-blue-50 shrink-0"
            onClick={() => { setMainTab("analyze"); document.getElementById("gap-analyze")?.scrollIntoView({ behavior: "smooth" }) }}
          >
            <Sparkles className="h-4 w-4 mr-2" /> Analyze now
          </Button>
        </div>

        {stats && (
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { label: "Analyses", value: stats.totalAnalyses, icon: BarChart2 },
              { label: "Avg Match", value: `${stats.averageMatch}%`, icon: TrendingUp },
              { label: "Best Match", value: `${stats.bestMatch}%`, icon: Zap },
              { label: "Gaps Found", value: stats.totalGapsIdentified, icon: AlertTriangle },
            ].map(item => (
              <div key={item.label} className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
                <item.icon className="h-4 w-4 text-blue-200 mb-1" />
                <p className="text-xl font-bold">{item.value}</p>
                <p className="text-xs text-blue-200">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Profile context banner */}
      {profileContext && (
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                {profileContext.hasResume ? <FileText className="h-5 w-5 text-blue-600" /> : <User className="h-5 w-5 text-blue-600" />}
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {profileContext.hasResume
                    ? `Resume loaded: ${profileContext.resumeFileName}`
                    : "No resume uploaded yet"}
                </p>
                <p className="text-xs text-blue-700 mt-0.5">
                  {profileContext.profileSkills.length} profile skills
                  {profileContext.currentTitle ? ` · ${profileContext.currentTitle}` : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!profileContext.hasResume && (
                <Button asChild size="sm" variant="outline" className="bg-white">
                  <Link href="/dashboard/job-seeker/upload">Upload resume</Link>
                </Button>
              )}
              <Button asChild size="sm" variant="outline" className="bg-white">
                <Link href="/dashboard/job-seeker/profile">Edit profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={mainTab} onValueChange={v => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="analyze">Analyze</TabsTrigger>
          <TabsTrigger value="results" disabled={!result}>Results</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* ANALYZE TAB */}
        <TabsContent value="analyze" className="space-y-6 mt-6" id="gap-analyze">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" /> Quick-start roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ROLE_PRESETS.map(p => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`text-left p-3 rounded-xl border transition-all hover:border-blue-400 hover:bg-blue-50 ${
                      jobTitle === p.title ? "border-blue-500 bg-blue-50 ring-1 ring-blue-300" : "border-gray-200"
                    }`}
                  >
                    <span className="text-xl">{p.icon}</span>
                    <p className="font-medium text-sm mt-1">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Target role analysis</CardTitle>
              <CardDescription>Paste a JD for precise gap detection. Profile & resume are used automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Target job title *</label>
                <Input
                  placeholder="e.g. Senior Full Stack Developer"
                  value={jobTitle}
                  onChange={e => setJobTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Job description</label>
                <Textarea
                  placeholder="Paste the full job description…"
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Use profile + resume automatically</p>
                  <p className="text-xs text-muted-foreground">Pulls skills from your HireAI profile and latest resume</p>
                </div>
                <Switch
                  checked={useProfile && !manualResume}
                  onCheckedChange={v => { setUseProfile(v); if (v) setManualResume(false) }}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">Paste resume / skills manually</p>
                  <p className="text-xs text-muted-foreground">Override auto-loaded profile data</p>
                </div>
                <Switch
                  checked={manualResume}
                  onCheckedChange={v => {
                    setManualResume(v)
                    if (v) setUseProfile(false)
                    else if (profileContext?.combinedPreview) setResumeText(profileContext.combinedPreview)
                  }}
                />
              </div>

              {manualResume && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Your resume / skills text</label>
                  <Textarea
                    placeholder="Paste resume text or list your skills and projects…"
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    rows={6}
                  />
                </div>
              )}

              <Button onClick={analyze} disabled={loading || !jobTitle.trim()} className="w-full bg-blue-600 hover:bg-blue-700">
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing…</>
                ) : (
                  <><BarChart2 className="h-4 w-4 mr-2" />Analyze skill gap</>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESULTS TAB */}
        <TabsContent value="results" className="space-y-4 mt-6">
          {result && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row items-center gap-6">
                    <HalfGauge value={result.matchScore} size={160} label="Match Score" color={matchScoreColor(result.matchScore)} />
                    <div className="flex-1 text-center lg:text-left">
                      <p className="text-sm text-muted-foreground">Readiness for</p>
                      <p className="text-xl font-bold">{result.jobTitle}</p>
                      <Badge className={`mt-2 ${READINESS_META[result.readinessLevel]?.bg || ""} ${READINESS_META[result.readinessLevel]?.color || ""}`}>
                        {result.readinessLevel}
                      </Badge>
                      {result.summary && (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{result.summary}</p>
                      )}
                      {result.contextUsed && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Based on {result.contextUsed.profileSkillsCount} profile skills
                          {result.contextUsed.hasResume ? ` + resume (${result.contextUsed.resumeFileName})` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-4 flex-wrap justify-center">
                      <ScoreRing value={result.currentSkills.length} max={Math.max(result.requiredSkills.length, 1)} size={72} stroke={6} color="#10b981" label="Matched" />
                      <ScoreRing value={result.missingSkills.length} max={Math.max(result.requiredSkills.length, 1)} size={72} stroke={6} color="#ef4444" label="Gaps" />
                      <ScoreRing value={totalWeeks} max={Math.max(totalWeeks, 12)} size={72} stroke={6} color="#f59e0b" label="Weeks" sublabel="plan" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {radarData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Skill coverage radar</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                        <Radar name="Your level" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                        <Radar name="Required" dataKey="required" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-emerald-700 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" /> Skills you have ({result.currentSkills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {result.currentSkills.map(s => (
                      <Badge key={s} variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">{s}</Badge>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Required skills ({result.requiredSkills.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-1.5">
                    {result.requiredSkills.map(s => {
                      const has = result.currentSkills.some(c => c.toLowerCase() === s.toLowerCase())
                      return (
                        <Badge
                          key={s}
                          variant="outline"
                          className={has ? "bg-emerald-50 text-emerald-800" : "bg-orange-50 text-orange-800 border-orange-200"}
                        >
                          {s}
                        </Badge>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-muted-foreground">Filter gaps:</span>
                {(["all", "critical", "important", "nice-to-have"] as GapFilter[]).map(f => (
                  <Button
                    key={f}
                    size="sm"
                    variant={gapFilter === f ? "default" : "outline"}
                    className={gapFilter === f ? "bg-blue-600" : ""}
                    onClick={() => setGapFilter(f)}
                  >
                    {f === "all" ? "All" : IMPORTANCE_META[f as SkillImportance]?.label || f}
                  </Button>
                ))}
              </div>

              <Tabs defaultValue="gaps">
                <TabsList>
                  <TabsTrigger value="gaps">Skill gaps ({filteredGaps.length})</TabsTrigger>
                  <TabsTrigger value="path">Learning path ({result.learningPath.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="gaps" className="space-y-3 mt-4">
                  {filteredGaps.length === 0 ? (
                    <Card><CardContent className="py-8 text-center text-emerald-700"><CheckCircle className="h-8 w-8 mx-auto mb-2" />No gaps in this filter!</CardContent></Card>
                  ) : (
                    filteredGaps.map(skill => (
                      <Card key={skill.skill} className="border-l-4 border-l-orange-400">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{skill.skill}</span>
                              <Badge variant="outline" className={IMPORTANCE_META[skill.importance]?.color}>{skill.importance}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                              <Clock className="h-3 w-3" />~{skill.estimatedWeeks}w
                            </span>
                          </div>
                          {skill.resources.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {skill.resources.map((r, i) => (
                                r.url ? (
                                  <a
                                    key={i}
                                    href={r.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                                  >
                                    <BookOpen className="h-3 w-3" />{r.title}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <Badge key={i} variant="outline" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />{r.title}</Badge>
                                )
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
                <TabsContent value="path" className="space-y-3 mt-4">
                  {result.learningPath.map((step, idx) => (
                    <Card key={idx} className="border-l-4 border-l-blue-400">
                      <CardContent className="pt-4 flex gap-3">
                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium">Week {step.week}: {step.focus}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {step.skills.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                          </div>
                          {step.resources.map((r, i) => (
                            <p key={i} className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <ArrowUpRight className="h-3 w-3" />{r}
                            </p>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => exportReport(result)} className="gap-1.5">
                  <Download className="h-4 w-4" /> Export report
                </Button>
                <Button variant="outline" asChild className="gap-1.5">
                  <Link href="/dashboard/job-seeker/interview-coach"><ChevronRight className="h-4 w-4" /> Practice interviews</Link>
                </Button>
                <Button variant="outline" onClick={() => { setResult(null); setMainTab("analyze") }}>
                  Analyze another role
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={loadDashboard} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Past analyses</CardTitle></CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No analyses yet.</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {history.map(row => (
                      <div
                        key={row.id}
                        className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-blue-50/50 ${
                          selectedHistory?.analysisId === row.id ? "border-blue-400 bg-blue-50" : ""
                        }`}
                        onClick={() => loadAnalysisDetail(row.id)}
                      >
                        <div>
                          <p className="font-medium text-sm">{row.jobTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.gapsCount} gaps · {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ScoreRing value={row.matchScore} size={44} stroke={4} sublabel="match" />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                            onClick={e => { e.stopPropagation(); deleteAnalysis(row.id) }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Analysis detail</CardTitle></CardHeader>
              <CardContent>
                {!selectedHistory ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Select an analysis to view details</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{selectedHistory.jobTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedHistory.createdAt ? format(new Date(selectedHistory.createdAt), "MMM d, yyyy") : ""}
                        </p>
                      </div>
                      <HalfGauge value={selectedHistory.matchScore} size={80} />
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedHistory.summary}</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedHistory.missingSkills.slice(0, 8).map(g => (
                        <Badge key={g.skill} variant="outline" className="text-xs">{g.skill}</Badge>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => exportReport(selectedHistory)}>
                      <Download className="h-4 w-4 mr-1" /> Export
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {history.length > 1 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Match score trend</CardTitle></CardHeader>
              <CardContent className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...history].reverse().slice(-8)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="jobTitle" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="matchScore" radius={[4, 4, 0, 0]}>
                      {history.slice(-8).map((entry, i) => (
                        <Cell key={i} fill={matchScoreColor(entry.matchScore)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* INSIGHTS TAB */}
        <TabsContent value="insights" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Your skill journey</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {stats ? (
                  <>
                    <SkillBar label={`Average match (${stats.averageMatch}%)`} value={stats.averageMatch} color="#3b82f6" />
                    <SkillBar label={`Best match (${stats.bestMatch}%)`} value={stats.bestMatch} color="#10b981" />
                    <p className="text-sm text-muted-foreground">
                      {stats.weeklyAnalyses} analysis(es) this week · {stats.totalGapsIdentified} total gaps identified
                    </p>
                    {profileContext?.profileSkills.length ? (
                      <div>
                        <p className="text-xs font-medium mb-2">Profile skills</p>
                        <div className="flex flex-wrap gap-1">
                          {profileContext.profileSkills.slice(0, 12).map(s => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Run your first analysis to unlock insights.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connected career tools</CardTitle>
                <CardDescription>Close gaps faster with HireAI</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {LINKED_TOOLS.map(tool => (
                  <Button key={tool.href} asChild variant="outline" className="justify-start h-auto py-3">
                    <Link href={tool.href}>
                      <ChevronRight className="h-4 w-4 mr-2 text-blue-600 shrink-0" />
                      {tool.label}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
