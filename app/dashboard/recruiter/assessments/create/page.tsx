"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QuestionBuilder } from "@/components/assessment/QuestionBuilder"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Loader2, Shield, Camera, Mic, Monitor, Eye, Brain,
  Clock, FileText, Settings, Sparkles, AlertTriangle,
  Plus, Star, ArrowLeft, CheckCircle2, Info,
  Fingerprint, Globe, Cpu, Maximize2, MousePointerBan,
  ScanFace, Waves, Layers, Lock, KeyRound, ImageIcon,
  CalendarRange, RotateCcw, Shuffle, ChevronDown, ChevronUp,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
interface SecurityFeature {
  id: string
  name: string
  description: string
  icon: any
  enabled: boolean
  required?: boolean
  isNew?: boolean
  severity: "high" | "medium" | "low"
}

interface Question {
  id: string
  questionText: string
  type: "multiple_choice" | "short_answer" | "code_snippet" | "video_response"
  options: string[]
  correctAnswer: string
  points: number
  difficulty: "Easy" | "Medium" | "Hard"
  timeLimit?: number
  tags: string[]
  hint?: string
  examples: Array<{ input: string; output: string; explanation?: string }>
  testCases: Array<{ id: string; input: string; expectedOutput: string; description?: string; isHidden?: boolean }>
}

type TabKey = "basic" | "questions" | "security" | "advanced"

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "basic",     label: "Basic Info",  icon: Info     },
  { key: "questions", label: "Questions",   icon: FileText },
  { key: "security",  label: "Security",    icon: Shield   },
  { key: "advanced",  label: "Advanced",    icon: Settings },
]

const SECURITY_GROUPS: { label: string; desc: string; ids: string[] }[] = [
  {
    label: "Identity & Face Monitoring",
    desc: "Camera-based proctoring to verify and monitor the candidate",
    ids: ["face_recognition", "multi_face_detection", "periodic_snapshots", "eye_gaze_tracking", "require_id_verification"],
  },
  {
    label: "Browser & Interface Lock",
    desc: "Prevent cheating through browser manipulation",
    ids: ["tab_detection", "fullscreen_lock", "right_click_block", "clipboard_block", "prevent_back_nav"],
  },
  {
    label: "Environment & Network",
    desc: "Detect suspicious hardware and network conditions",
    ids: ["screen_recording", "audio_monitoring", "vpn_detection", "vm_detection", "device_fingerprint", "environment_scan"],
  },
  {
    label: "Content Integrity",
    desc: "Protect assessment content from being leaked or copied",
    ids: ["keystroke_analysis", "watermark_overlay", "plagiarism_check", "ip_lock"],
  },
]

const genId = () => Math.random().toString(36).substr(2, 9)

// ─── Component ────────────────────────────────────────────────────────────────
export default function CreateAssessmentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>("basic")
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Identity & Face Monitoring": true,
    "Browser & Interface Lock": true,
    "Environment & Network": false,
    "Content Integrity": false,
  })

  // ── Basic ─────────────────────────────────────────────────────────────────
  const [title, setTitle]                     = useState("")
  const [description, setDescription]         = useState("")
  const [durationMinutes, setDurationMinutes] = useState(90)
  const [passingScore, setPassingScore]       = useState(70)
  const [difficulty, setDifficulty]           = useState<"Easy" | "Medium" | "Hard">("Medium")

  // ── Security features ─────────────────────────────────────────────────────
  const [securityFeatures, setSecurityFeatures] = useState<SecurityFeature[]>([
    // Identity & Face
    { id: "face_recognition",       name: "AI Face Recognition",         description: "Continuously verify candidate identity via webcam using AI",            icon: Camera,          enabled: true,  required: true, severity: "high"   },
    { id: "multi_face_detection",   name: "Multi-Face Detection",         description: "Instantly flag when more than one face appears in frame",               icon: ScanFace,        enabled: true,  severity: "high"   },
    { id: "periodic_snapshots",     name: "Periodic Identity Snapshots",  description: "Capture random photos throughout the test to verify presence",          icon: ImageIcon,       enabled: false, isNew: true, severity: "high"   },
    { id: "eye_gaze_tracking",      name: "Eye Gaze Tracking",            description: "Detect when candidate's eyes look away from the screen",                icon: Eye,             enabled: false, isNew: true, severity: "medium" },
    { id: "require_id_verification",name: "Identity Verification",        description: "Require candidates to show a photo ID before starting",                 icon: KeyRound,        enabled: false, isNew: true, severity: "high"   },
    // Browser & Interface
    { id: "tab_detection",          name: "Tab Switch Detection",         description: "Alert and log every time candidate leaves the assessment tab",          icon: Monitor,         enabled: true,  severity: "high"   },
    { id: "fullscreen_lock",        name: "Full-Screen Lock",             description: "Force full-screen mode and terminate if candidate exits",               icon: Maximize2,       enabled: true,  isNew: true, severity: "high"   },
    { id: "right_click_block",      name: "Right-Click & DevTools Block", description: "Disable context menu, F12, and browser developer tools",               icon: MousePointerBan, enabled: true,  isNew: true, severity: "medium" },
    { id: "clipboard_block",        name: "Copy / Paste Block",           description: "Prevent all clipboard operations (Ctrl+C, Ctrl+V, drag-drop)",         icon: Shield,          enabled: true,  severity: "medium" },
    { id: "prevent_back_nav",       name: "Prevent Back Navigation",      description: "Lock candidates to the current question; no going back",               icon: Lock,            enabled: false, isNew: true, severity: "medium" },
    // Environment & Network
    { id: "screen_recording",       name: "Screen Recording",             description: "Record candidate's entire screen for post-review",                     icon: Monitor,         enabled: true,  severity: "high"   },
    { id: "audio_monitoring",       name: "Audio Monitoring",             description: "Detect background conversations and suspicious noise",                  icon: Mic,             enabled: true,  severity: "medium" },
    { id: "vpn_detection",          name: "VPN / Proxy Detection",        description: "Flag candidates connecting through VPN, proxy, or Tor",                icon: Globe,           enabled: false, isNew: true, severity: "medium" },
    { id: "vm_detection",           name: "Virtual Machine Detection",    description: "Detect if the assessment is running inside a VM or emulator",          icon: Cpu,             enabled: false, isNew: true, severity: "medium" },
    { id: "device_fingerprint",     name: "Device Fingerprinting",        description: "Prevent the same device from being used for multiple submissions",      icon: Fingerprint,     enabled: false, isNew: true, severity: "medium" },
    { id: "environment_scan",       name: "360° Environment Scan",        description: "Require candidates to pan the camera around the room before starting", icon: Camera,          enabled: false, severity: "low"    },
    // Content Integrity
    { id: "keystroke_analysis",     name: "Keystroke Pattern Analysis",   description: "Analyze typing rhythm to detect pasting or assisted input",            icon: Brain,           enabled: false, severity: "medium" },
    { id: "watermark_overlay",      name: "Watermark Overlay",            description: "Overlay candidate's name & email as a semi-transparent watermark",     icon: Waves,           enabled: true,  isNew: true, severity: "low"    },
    { id: "plagiarism_check",       name: "Code Plagiarism Detection",    description: "Automatically compare code submissions for similarity",                 icon: Layers,          enabled: false, isNew: true, severity: "high"   },
    { id: "ip_lock",                name: "IP Address Lock",              description: "Bind the session to one IP; flag if candidate switches networks",       icon: Globe,           enabled: false, isNew: true, severity: "medium" },
  ])

  const toggleSecurity = (id: string) =>
    setSecurityFeatures((prev) =>
      prev.map((f) => (f.id === id && !f.required ? { ...f, enabled: !f.enabled } : f))
    )

  // ── Questions ─────────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<Question[]>([])

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: genId(), questionText: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "", points: 10, difficulty: "Medium", tags: [], examples: [], testCases: [] },
    ])
    setActiveTab("questions")
  }
  const removeQuestion = (id: string) => setQuestions((p) => p.filter((q) => q.id !== id))
  const updateQuestion = (id: string, updated: Question) => setQuestions((p) => p.map((q) => (q.id === id ? updated : q)))

  // ── Advanced ──────────────────────────────────────────────────────────────
  const [randomizeQuestions, setRandomizeQuestions]     = useState(true)
  const [randomizeAnswers, setRandomizeAnswers]         = useState(true)
  const [allowReview, setAllowReview]                   = useState(false)
  const [showResults, setShowResults]                   = useState(true)
  const [autoSubmit, setAutoSubmit]                     = useState(true)
  const [maxAttempts, setMaxAttempts]                   = useState(1)
  const [gracePeriod, setGracePeriod]                   = useState(0)
  const [availableFrom, setAvailableFrom]               = useState("")
  const [availableTo, setAvailableTo]                   = useState("")
  const [poolEnabled, setPoolEnabled]                   = useState(false)
  const [questionPoolSize, setQuestionPoolSize]         = useState(10)

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalPoints    = questions.reduce((s, q) => s + q.points, 0)
  const enabledSec     = securityFeatures.filter((f) => f.enabled)
  const validQuestions = questions.filter((q) => q.questionText.trim() && q.correctAnswer.trim())

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); setActiveTab("basic"); return }
    if (questions.length === 0) { toast({ title: "Add at least one question", variant: "destructive" }); setActiveTab("questions"); return }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.questionText.trim()) { toast({ title: `Question ${i + 1}: question text required`, variant: "destructive" }); setActiveTab("questions"); return }
      if (!q.correctAnswer.trim()) { toast({ title: `Question ${i + 1}: mark a correct answer`, variant: "destructive" }); setActiveTab("questions"); return }
      if (q.type === "multiple_choice" && q.options.some((o) => !o.trim())) { toast({ title: `Question ${i + 1}: fill all answer options`, variant: "destructive" }); setActiveTab("questions"); return }
    }

    const secFlags = Object.fromEntries(enabledSec.map((f) => [f.id, true]))

    setLoading(true)
    try {
      const body = {
        title, description, durationMinutes, passingScore, difficulty,
        questions: questions.map((q) => ({
          questionId: q.id, questionText: q.questionText.trim(), type: q.type,
          options: q.options.filter((o) => o.trim()), correctAnswer: q.correctAnswer.trim(),
          points: q.points, difficulty: q.difficulty, tags: q.tags, hint: q.hint || "",
          examples: q.examples, testCases: q.testCases,
        })),
        securityFeatures: enabledSec.map((f) => f.name),
        settings: {
          randomizeQuestions, randomizeAnswers, allowReview, showResults, autoSubmit,
          preventCopyPaste:      secFlags["clipboard_block"]      || false,
          fullScreenMode:        secFlags["fullscreen_lock"]       || false,
          requireFullscreen:     secFlags["fullscreen_lock"]       || false,
          blockRightClick:       secFlags["right_click_block"]     || false,
          eyeGazeTracking:       secFlags["eye_gaze_tracking"]     || false,
          periodicSnapshots:     secFlags["periodic_snapshots"]    || false,
          watermarkOverlay:      secFlags["watermark_overlay"]     || false,
          deviceFingerprint:     secFlags["device_fingerprint"]    || false,
          vpnDetection:          secFlags["vpn_detection"]         || false,
          vmDetection:           secFlags["vm_detection"]          || false,
          preventBackNavigation: secFlags["prevent_back_nav"]      || false,
          plagiarismCheck:       secFlags["plagiarism_check"]      || false,
          ipLock:                secFlags["ip_lock"]               || false,
          requireIdVerification: secFlags["require_id_verification"] || false,
        },
        requiresProctoring: enabledSec.length > 0,
        totalPoints,
        maxAttempts,
        gracePeriodMinutes: gracePeriod,
        availableFrom: availableFrom || undefined,
        availableTo:   availableTo   || undefined,
        questionPoolSize: poolEnabled ? questionPoolSize : undefined,
      }

      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast({ title: "Assessment published!" })
        router.push("/dashboard/recruiter/assessments")
      } else {
        const err = await res.json()
        toast({ title: err.message || "Failed to create", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error. Please try again.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const SEVERITY_COLOR = { high: "text-red-600 bg-red-50", medium: "text-amber-600 bg-amber-50", low: "text-slate-500 bg-slate-100" }
  const toggleGroup = (label: string) =>
    setExpandedGroups((p) => ({ ...p, [label]: !p[label] }))

  const featuresById = Object.fromEntries(securityFeatures.map((f) => [f.id, f]))

  const secEnabledCount = enabledSec.length
  const secTotalCount   = securityFeatures.length

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* ── Sticky top bar ──────────────────────────────────────────────────── */}
      <div className="dashboard-subheader">
        <div className="px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">
              {title || <span className="text-muted-foreground font-normal italic">Untitled Assessment</span>}
            </h1>
          </div>
          {/* Live stats */}
          <div className="hidden md:flex items-center gap-2 text-xs flex-wrap">
            {[
              { icon: <FileText className="h-3.5 w-3.5" />, val: `${questions.length} Q`, color: "bg-blue-50 text-blue-700" },
              { icon: <Star className="h-3.5 w-3.5" />,     val: `${totalPoints} pts`,    color: "bg-green-50 text-green-700" },
              { icon: <Shield className="h-3.5 w-3.5" />,   val: `${secEnabledCount}/${secTotalCount} security`, color: "bg-purple-50 text-purple-700" },
              { icon: <Clock className="h-3.5 w-3.5" />,    val: `${durationMinutes}m`,   color: "bg-orange-50 text-orange-700" },
            ].map(({ icon, val, color }) => (
              <span key={val} className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${color}`}>
                {icon}{val}
              </span>
            ))}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Publish
          </Button>
        </div>

        {/* Tab strip */}
        <div className="flex px-6 border-t overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => {
            const done =
              key === "basic"     ? !!title.trim() :
              key === "questions" ? validQuestions.length > 0 && validQuestions.length === questions.length && questions.length > 0 :
              true
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  activeTab === key ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {done && key !== "advanced" && key !== "security" && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-6 space-y-6">

        {/* ── BASIC ── */}
        {activeTab === "basic" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Details</CardTitle>
                <CardDescription>Name, description, and timing for this test</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label>Title *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior React Developer Assessment" className={title ? "border-green-400" : ""} />
                  {title && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Looks good</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What skills or topics does this assessment cover?" rows={3} className="resize-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 90)} min={15} max={300} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Passing Score (%)</Label>
                    <Input type="number" value={passingScore} onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)} min={0} max={100} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Overall Difficulty</Label>
                    <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => setActiveTab("questions")} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white" disabled={!title.trim()}>
              Continue to Questions →
            </Button>
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {activeTab === "questions" && (
          <div className="space-y-4">
            {questions.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border text-sm flex-wrap">
                <span className="font-medium">{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
                <span className="text-muted-foreground">·</span>
                <span>{totalPoints} total points</span>
                <span className="text-muted-foreground">·</span>
                {validQuestions.length === questions.length ? (
                  <span className="text-green-600 flex items-center gap-1 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> All complete</span>
                ) : (
                  <span className="text-amber-600">{questions.length - validQuestions.length} incomplete</span>
                )}
              </div>
            )}

            {questions.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
                  <p className="text-muted-foreground text-sm mb-6">Supports MCQ, short answer, coding challenges, and video responses.</p>
                  <Button onClick={addQuestion} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <Plus className="h-4 w-4 mr-2" /> Add First Question
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <QuestionBuilder
                    key={q.id}
                    question={q}
                    onChange={(updated) => updateQuestion(q.id, updated)}
                    onRemove={() => removeQuestion(q.id)}
                    questionNumber={i + 1}
                  />
                ))}
              </div>
            )}

            <Button onClick={addQuestion} variant="outline" className="w-full border-dashed text-muted-foreground hover:text-foreground gap-2">
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          </div>
        )}

        {/* ── SECURITY ── */}
        {activeTab === "security" && (
          <div className="space-y-5">
            {/* Security score banner */}
            <div className={`rounded-xl border p-4 flex items-center gap-4 ${secEnabledCount >= 10 ? "bg-green-50 border-green-200" : secEnabledCount >= 6 ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${secEnabledCount >= 10 ? "bg-green-500 text-white" : secEnabledCount >= 6 ? "bg-blue-500 text-white" : "bg-amber-500 text-white"}`}>
                {secEnabledCount}
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {secEnabledCount >= 10 ? "Maximum Security" : secEnabledCount >= 6 ? "High Security" : secEnabledCount >= 3 ? "Medium Security" : "Low Security"}
                  <span className="font-normal text-muted-foreground ml-2">{secEnabledCount} of {secTotalCount} features active</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {secEnabledCount >= 10 ? "Excellent! Your assessment has enterprise-grade protection." : "Enable more features for stronger anti-cheating coverage."}
                </p>
              </div>
              <div className="ml-auto flex-shrink-0">
                <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${secEnabledCount >= 10 ? "bg-green-500" : secEnabledCount >= 6 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${(secEnabledCount / secTotalCount) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Feature groups */}
            {SECURITY_GROUPS.map((group) => {
              const groupFeatures = group.ids.map((id) => featuresById[id]).filter(Boolean)
              const groupEnabled  = groupFeatures.filter((f) => f.enabled).length
              const isOpen        = expandedGroups[group.label] !== false

              return (
                <Card key={group.label} className="overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => toggleGroup(group.label)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{group.label}</p>
                      <p className="text-xs text-muted-foreground">{group.desc}</p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-xs ${groupEnabled > 0 ? "border-green-300 text-green-700 bg-green-50" : ""}`}>
                      {groupEnabled}/{groupFeatures.length} active
                    </Badge>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>

                  {isOpen && (
                    <CardContent className="pt-0 pb-4 px-4 space-y-2">
                      {groupFeatures.map((feature) => {
                        const Icon = feature.icon
                        return (
                          <div
                            key={feature.id}
                            className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all ${
                              feature.enabled ? "border-blue-200 bg-blue-50/50" : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${feature.enabled ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-sm">{feature.name}</span>
                                {feature.required && (
                                  <Badge variant="destructive" className="text-xs py-0 px-1.5">Required</Badge>
                                )}
                                {feature.isNew && (
                                  <Badge className="text-xs py-0 px-1.5 bg-violet-100 text-violet-700 border-violet-200">New</Badge>
                                )}
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${SEVERITY_COLOR[feature.severity]}`}>
                                  {feature.severity}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
                            </div>
                            <Switch
                              checked={feature.enabled}
                              onCheckedChange={() => toggleSecurity(feature.id)}
                              disabled={feature.required}
                              className="shrink-0 mt-1"
                            />
                          </div>
                        )
                      })}
                    </CardContent>
                  )}
                </Card>
              )
            })}

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                <strong>Candidate Notice:</strong> All active monitoring features are clearly disclosed to candidates before they begin. All data is handled in compliance with applicable privacy regulations.
              </p>
            </div>
          </div>
        )}

        {/* ── ADVANCED ── */}
        {activeTab === "advanced" && (
          <div className="space-y-6">
            {/* Access Control */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4 text-blue-600" /> Access Control
                </CardTitle>
                <CardDescription>Control who can take this assessment and when</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Max Attempts</Label>
                    <Input
                      type="number"
                      value={maxAttempts}
                      onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                      min={1} max={10}
                    />
                    <p className="text-xs text-muted-foreground">How many times a candidate can attempt this test</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Grace Period (minutes after time expires)</Label>
                    <Input
                      type="number"
                      value={gracePeriod}
                      onChange={(e) => setGracePeriod(parseInt(e.target.value) || 0)}
                      min={0} max={30}
                    />
                    <p className="text-xs text-muted-foreground">Extra buffer before auto-submit kicks in (0 = none)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5" /> Available From
                    </Label>
                    <Input
                      type="datetime-local"
                      value={availableFrom}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to allow access immediately</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <CalendarRange className="h-3.5 w-3.5" /> Available Until
                    </Label>
                    <Input
                      type="datetime-local"
                      value={availableTo}
                      onChange={(e) => setAvailableTo(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Leave blank for no expiry</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Question Delivery */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shuffle className="h-4 w-4 text-purple-600" /> Question Delivery
                </CardTitle>
                <CardDescription>Control how questions are selected and presented</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 py-2 border-b">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5"><RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />Randomize Question Order</p>
                    <p className="text-xs text-muted-foreground">Each candidate gets questions in a different order</p>
                  </div>
                  <Switch checked={randomizeQuestions} onCheckedChange={setRandomizeQuestions} />
                </div>
                <div className="flex items-center justify-between gap-4 py-2 border-b">
                  <div>
                    <p className="text-sm font-medium">Randomize Answer Options</p>
                    <p className="text-xs text-muted-foreground">Shuffle MCQ options per candidate</p>
                  </div>
                  <Switch checked={randomizeAnswers} onCheckedChange={setRandomizeAnswers} />
                </div>
                <div className="flex items-center justify-between gap-4 py-2 border-b">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground" />Question Pool
                      <Badge className="text-xs py-0 px-1.5 bg-violet-100 text-violet-700 border-violet-200">New</Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">Randomly pick N questions from the full question bank</p>
                  </div>
                  <Switch checked={poolEnabled} onCheckedChange={setPoolEnabled} />
                </div>
                {poolEnabled && (
                  <div className="pl-4 space-y-1.5">
                    <Label>Questions to Show per Candidate</Label>
                    <Input
                      type="number"
                      value={questionPoolSize}
                      onChange={(e) => setQuestionPoolSize(Math.min(parseInt(e.target.value) || 1, questions.length || 1))}
                      min={1}
                      max={questions.length || 1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Will randomly select {questionPoolSize} out of {questions.length || "?"} questions
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Candidate Experience */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Candidate Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Allow Question Review", sub: "Let candidates revisit answers before submitting", state: allowReview, set: setAllowReview },
                  { label: "Show Results After Completion", sub: "Display score and pass/fail status immediately", state: showResults, set: setShowResults },
                  { label: "Auto-Submit on Time Expiry", sub: "Automatically submit when the clock reaches zero", state: autoSubmit, set: setAutoSubmit },
                ].map(({ label, sub, state, set }) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                    <Switch checked={state} onCheckedChange={set} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ── Sticky bottom publish bar ─────────────────────────────────────────── */}
      <div className="sticky bottom-0 z-20 border-t bg-white/95 backdrop-blur px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {questions.length === 0 ? (
              "Add questions to publish"
            ) : validQuestions.length < questions.length ? (
              <span className="text-amber-600">{questions.length - validQuestions.length} question{questions.length - validQuestions.length !== 1 ? "s" : ""} incomplete</span>
            ) : (
              <span className="text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {questions.length} question{questions.length !== 1 ? "s" : ""} · {totalPoints} pts · {secEnabledCount} security features · ready
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !title.trim() || questions.length === 0}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white min-w-40"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Publishing…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Publish Assessment</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
