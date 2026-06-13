"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-session"
import {
  User, Briefcase, GraduationCap, Globe, Loader2, CheckCircle2,
  ArrowRight, ArrowLeft, MapPin, Phone, Mail, Linkedin, Github,
  ExternalLink, Lightbulb, Target, DollarSign, Building2, X,
  Sparkles, ChevronRight,
} from "lucide-react"

interface ProfileData {
  firstName: string; lastName: string; email: string; phone: string; location: string
  currentTitle: string; experienceLevel: string; industry: string; skills: string[]
  education: string; university: string; graduationYear: string
  linkedinUrl: string; portfolioUrl: string; githubUrl: string
  desiredRole: string; salaryExpectation: string; workPreference: string; summary: string
}

const STEPS = [
  {
    id: 1, title: "Personal Info", subtitle: "Your basic contact details",
    icon: User, tip: "Profiles with a phone & location get 3× more callbacks from local recruiters.",
  },
  {
    id: 2, title: "Professional", subtitle: "Work background & skills",
    icon: Briefcase, tip: "Add 8–12 skills to maximise keyword matches with job descriptions.",
  },
  {
    id: 3, title: "Education", subtitle: "Academic background",
    icon: GraduationCap, tip: "85% of companies filter by education level during initial screening.",
  },
  {
    id: 4, title: "Online Presence", subtitle: "Your digital footprint",
    icon: Globe, tip: "Candidates with LinkedIn get 40% more profile views from recruiters.",
    optional: true,
  },
  {
    id: 5, title: "Career Goals", subtitle: "Where you want to go",
    icon: Target, tip: "Clear salary expectations save you 2–3 rounds of negotiation.",
  },
]

/* ── Small ring component for the sidebar ── */
function ProgressRing({ pct }: { pct: number }) {
  const r = 28, c = 2 * Math.PI * r
  return (
    <svg width="72" height="72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
      <circle cx="36" cy="36" r={r} fill="none" stroke="#7c3aed" strokeWidth="6"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  )
}

/* ── Field wrapper ── */
function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-violet-600">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default function ProfileSetupPage() {
  const { session } = useSession()
  const { toast } = useToast()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [skillInput, setSkillInput] = useState("")
  const [data, setData] = useState<ProfileData>({
    firstName: "", lastName: "", email: "", phone: "", location: "",
    currentTitle: "", experienceLevel: "", industry: "", skills: [],
    education: "", university: "", graduationYear: "",
    linkedinUrl: "", portfolioUrl: "", githubUrl: "",
    desiredRole: "", salaryExpectation: "", workPreference: "", summary: "",
  })

  useEffect(() => {
    if (session?.name) {
      const parts = session.name.split(" ")
      setData(p => ({ ...p, firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "" }))
    }
    if (session?.email) setData(p => ({ ...p, email: session.email || "" }))
  }, [session])

  const set = (key: keyof ProfileData, val: string) =>
    setData(p => ({ ...p, [key]: val }))

  const addSkill = () => {
    const s = skillInput.trim()
    if (s && !data.skills.includes(s)) {
      setData(p => ({ ...p, skills: [...p.skills, s] }))
      setSkillInput("")
    }
  }

  const valid = (): boolean => {
    if (step === 1) return !!(data.firstName && data.lastName && data.email && data.location)
    if (step === 2) return !!(data.currentTitle && data.experienceLevel && data.industry && data.skills.length > 0)
    if (step === 3) return !!data.education
    if (step === 4) return true
    if (step === 5) return !!(data.desiredRole && data.workPreference)
    return false
  }

  const handleNext = () => {
    if (!valid()) {
      toast({ title: "Required fields missing", description: "Fill in all required fields first.", variant: "destructive" })
      return
    }
    if (step < STEPS.length) setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/user/profile-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        toast({ title: "Profile created!", description: "You're all set — welcome aboard." })
        router.push("/dashboard/job-seeker")
      } else {
        const e = await res.json()
        toast({ title: "Setup failed", description: e.message || "Please try again.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Please check your connection.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const pct = Math.round(((step - 1) / STEPS.length) * 100)
  const currentStepMeta = STEPS[step - 1]
  const StepIcon = currentStepMeta.icon

  /* ── Step form content ── */
  const renderForm = () => {
    if (step === 1) return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required>
            <Input value={data.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Jane" />
          </Field>
          <Field label="Last Name" required>
            <Input value={data.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Smith" />
          </Field>
        </div>
        <Field label="Email Address" required>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="email" className="pl-9" value={data.email} onChange={e => set("email", e.target.value)} placeholder="jane@email.com" />
          </div>
        </Field>
        <Field label="Phone Number" hint="Include country code for international roles">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={data.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 (555) 123-4567" />
          </div>
        </Field>
        <Field label="Location" required hint="City, State/Country — used to match local opportunities">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={data.location} onChange={e => set("location", e.target.value)} placeholder="San Francisco, CA" />
          </div>
        </Field>
      </div>
    )

    if (step === 2) return (
      <div className="space-y-4">
        <Field label="Current Job Title" required hint="Your current or most recent role">
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={data.currentTitle} onChange={e => set("currentTitle", e.target.value)} placeholder="Software Engineer" />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Experience Level" required>
            <Select value={data.experienceLevel} onValueChange={v => set("experienceLevel", v)}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entry (0–2 yrs)</SelectItem>
                <SelectItem value="mid">Mid (3–5 yrs)</SelectItem>
                <SelectItem value="senior">Senior (6–10 yrs)</SelectItem>
                <SelectItem value="lead">Lead / Principal (10+)</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Industry" required>
            <Select value={data.industry} onValueChange={v => set("industry", v)}>
              <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
              <SelectContent>
                {["Technology", "Finance", "Healthcare", "Education", "Retail", "Manufacturing", "Consulting", "Other"]
                  .map(i => <SelectItem key={i} value={i.toLowerCase()}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Skills" required hint="Press Enter or click Add — aim for 8–12 skills">
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())}
              placeholder="e.g. JavaScript, React, Python…"
            />
            <Button type="button" variant="outline" onClick={addSkill} className="shrink-0">Add</Button>
          </div>
          {data.skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.skills.map(s => (
                <span key={s} className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 border border-violet-200 text-xs font-medium px-3 py-1.5 rounded-full">
                  {s}
                  <button type="button" onClick={() => setData(p => ({ ...p, skills: p.skills.filter(x => x !== s) }))}>
                    <X className="h-3 w-3 hover:text-violet-900" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>
      </div>
    )

    if (step === 3) return (
      <div className="space-y-4">
        <Field label="Highest Education Level" required>
          <Select value={data.education} onValueChange={v => set("education", v)}>
            <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="high-school">High School Diploma</SelectItem>
              <SelectItem value="associate">Associate Degree</SelectItem>
              <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
              <SelectItem value="master">Master's Degree</SelectItem>
              <SelectItem value="phd">PhD / Doctorate</SelectItem>
              <SelectItem value="other">Other / Self-taught</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="University / Institution" hint="Leave blank if not applicable">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={data.university} onChange={e => set("university", e.target.value)} placeholder="Stanford University" />
          </div>
        </Field>
        <Field label="Graduation Year" hint="Estimated is fine">
          <Input type="number" value={data.graduationYear} onChange={e => set("graduationYear", e.target.value)} placeholder="2022" className="w-32" />
        </Field>
      </div>
    )

    if (step === 4) return (
      <div className="space-y-4">
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 flex items-start gap-2">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
          All fields on this step are optional but significantly boost your visibility.
        </div>
        <Field label="LinkedIn Profile" hint="linkedin.com/in/your-name">
          <div className="relative">
            <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={data.linkedinUrl} onChange={e => set("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/janesmith" />
          </div>
        </Field>
        <Field label="Portfolio / Personal Website">
          <div className="relative">
            <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={data.portfolioUrl} onChange={e => set("portfolioUrl", e.target.value)} placeholder="https://janesmith.dev" />
          </div>
        </Field>
        <Field label="GitHub Profile">
          <div className="relative">
            <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={data.githubUrl} onChange={e => set("githubUrl", e.target.value)} placeholder="https://github.com/janesmith" />
          </div>
        </Field>
      </div>
    )

    if (step === 5) return (
      <div className="space-y-4">
        <Field label="Desired Job Title" required hint="Be specific — e.g. 'Senior Frontend Engineer' not just 'Engineer'">
          <div className="relative">
            <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" value={data.desiredRole} onChange={e => set("desiredRole", e.target.value)} placeholder="Senior Software Engineer" />
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Salary Expectation">
            <Select value={data.salaryExpectation} onValueChange={v => set("salaryExpectation", v)}>
              <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="50k-75k">$50k – $75k</SelectItem>
                <SelectItem value="75k-100k">$75k – $100k</SelectItem>
                <SelectItem value="100k-150k">$100k – $150k</SelectItem>
                <SelectItem value="150k-200k">$150k – $200k</SelectItem>
                <SelectItem value="200k+">$200k+</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Work Preference" required>
            <Select value={data.workPreference} onValueChange={v => set("workPreference", v)}>
              <SelectTrigger><SelectValue placeholder="Select preference" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
                <SelectItem value="flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Professional Summary" hint="2–4 sentences about your background and what you're looking for">
          <Textarea
            value={data.summary}
            onChange={e => set("summary", e.target.value)}
            placeholder="Experienced software engineer with 5+ years building scalable web applications. Passionate about clean code and great user experiences…"
            className="min-h-[110px] resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{data.summary.length} / 500</p>
        </Field>
      </div>
    )
  }

  return (
    <div className="w-full min-h-full bg-slate-50 px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl mx-auto">

        {/* ── LEFT SIDEBAR ── */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-6 space-y-4">

            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <span className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Profile Setup</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">Build your profile</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Complete all steps to unlock AI matching</p>
            </div>

            {/* Progress ring + pct */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <ProgressRing pct={pct} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-800">{pct}%</span>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800">
                    {pct === 0 ? "Just getting started" : pct < 60 ? "Good progress" : pct < 100 ? "Almost there!" : "All done!"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Step {step} of {STEPS.length}</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Step list */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {STEPS.map((s, idx) => {
                const Icon = s.icon
                const isActive = step === s.id
                const isDone = step > s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => isDone && setStep(s.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-slate-100 last:border-0
                      ${isActive ? "bg-violet-50" : isDone ? "hover:bg-slate-50 cursor-pointer" : "cursor-default opacity-50"}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all
                      ${isActive ? "bg-violet-600 text-white shadow-md shadow-violet-200" : isDone ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${isActive ? "text-violet-700" : isDone ? "text-slate-700" : "text-slate-400"}`}>
                          {s.title}
                        </p>
                        {s.optional && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">optional</span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${isActive ? "text-violet-500" : "text-muted-foreground"}`}>{s.subtitle}</p>
                    </div>
                    {isActive && <ChevronRight className="h-4 w-4 text-violet-400 shrink-0" />}
                  </button>
                )
              })}
            </div>

            {/* Tip card */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-800 mb-1">Pro tip</p>
                  <p className="text-xs text-amber-700 leading-relaxed">{currentStepMeta.tip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT FORM ── */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

            {/* Form header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                  <StepIcon className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{currentStepMeta.title}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{currentStepMeta.subtitle}</p>
                </div>
                {currentStepMeta.optional && (
                  <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium shrink-0">
                    Optional
                  </span>
                )}
              </div>
            </div>

            {/* Form body */}
            <div className="px-6 py-6">
              {renderForm()}
            </div>

            {/* Navigation footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
                className="gap-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>

              <div className="flex items-center gap-2">
                {/* Dot indicators */}
                <div className="hidden sm:flex items-center gap-1.5 mr-2">
                  {STEPS.map(s => (
                    <div key={s.id} className={`rounded-full transition-all ${step === s.id ? "w-5 h-1.5 bg-violet-600" : step > s.id ? "w-1.5 h-1.5 bg-emerald-400" : "w-1.5 h-1.5 bg-slate-200"}`} />
                  ))}
                </div>

                {step < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={!valid()}
                    className="gap-2 bg-violet-600 hover:bg-violet-700 text-white border-0 disabled:opacity-40"
                  >
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || !valid()}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 disabled:opacity-40"
                  >
                    {loading
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                      : <><CheckCircle2 className="h-3.5 w-3.5" /> Complete Setup</>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
