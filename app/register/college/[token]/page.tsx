"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { AuthPageBackdrop } from "@/components/auth-page-backdrop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Building2, GraduationCap, Loader2, CheckCircle2,
  MapPin, Mail, Phone, BookOpen, Award, Sparkles,
  User, ArrowLeft, ArrowRight, Shield, Link2, Github,
  ClipboardCheck, Send,
} from "lucide-react"

const BRAND = process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI"
const BRAND_COLOR = process.env.NEXT_PUBLIC_BRAND_COLOR || "#6d28d9"

const DEFAULT_DEPARTMENTS = [
  "Computer Science", "Electronics", "Mechanical", "Civil",
  "Chemical", "MBA", "MCA", "IT", "Other",
]

const STEPS = [
  { id: 1, title: "Personal", icon: User, desc: "Contact & identity" },
  { id: 2, title: "Academic", icon: BookOpen, desc: "Education details" },
  { id: 3, title: "Skills & Review", icon: ClipboardCheck, desc: "Profile & submit" },
] as const

const inputClass =
  "h-11 border-white/15 bg-white/[0.07] text-white placeholder:text-slate-500 focus-visible:border-violet-400/50 focus-visible:ring-violet-500/40"

const labelClass = "text-sm font-medium text-slate-200"

interface CollegeInfo {
  id: string
  name: string
  city?: string
  state?: string
  type?: string
}

function RegisterShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0614] text-white">
      <AuthPageBackdrop brandColor={BRAND_COLOR} particleCount={52} interactive />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className={labelClass}>
        {label}
        {required && <span className="text-violet-300 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-slate-400 text-sm shrink-0">{label}</span>
      <span className="text-white text-sm font-medium text-right break-all">{value}</span>
    </div>
  )
}

export default function CollegeStudentRegisterPage() {
  const params = useParams()
  const token = (params?.token as string) || ""
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [college, setCollege] = useState<CollegeInfo | null>(null)
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS)
  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    rollNumber: "",
    department: "",
    batch: "",
    cgpa: "",
    marks10th: "",
    marks12th: "",
    backlogs: "0",
    skills: "",
    linkedinUrl: "",
    githubUrl: "",
    additionalInfo: "",
  })

  const set = (key: keyof typeof form, value: string) =>
    setForm(f => ({ ...f, [key]: value }))

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()),
    [form.email],
  )

  const step1Valid = form.name.trim().length >= 2 && emailValid
  const step2Valid = Boolean(form.department && form.batch.trim())

  useEffect(() => {
    if (!token) {
      setError("Invalid registration link")
      setLoading(false)
      return
    }
    fetch(`/api/register/college/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || "Invalid registration link")
        }
        return res.json()
      })
      .then((data) => {
        setCollege(data.college)
        if (data.departments?.length) setDepartments(data.departments)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/register/college/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cgpa: form.cgpa ? Number(form.cgpa) : undefined,
          marks10th: form.marks10th ? Number(form.marks10th) : undefined,
          marks12th: form.marks12th ? Number(form.marks12th) : undefined,
          backlogs: form.backlogs !== "" ? Number(form.backlogs) : 0,
          skills: form.skills,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSubmitted(true)
        toast({ title: "Registration submitted", description: data.message })
      } else {
        toast({ title: "Could not submit", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const goNext = () => {
    if (step === 1 && !step1Valid) {
      toast({ title: "Required fields", description: "Enter your full name and a valid email.", variant: "destructive" })
      return
    }
    if (step === 2 && !step2Valid) {
      toast({ title: "Required fields", description: "Select department and enter your batch year.", variant: "destructive" })
      return
    }
    setStep(s => Math.min(3, s + 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  if (loading) {
    return (
      <RegisterShell>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-violet-400 mx-auto" />
            <p className="text-slate-400 text-sm">Loading registration portal…</p>
          </div>
        </div>
      </RegisterShell>
    )
  }

  if (error || !college) {
    return (
      <RegisterShell>
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md w-full rounded-2xl border border-red-500/30 bg-red-500/10 backdrop-blur-xl p-8 text-center">
            <p className="text-lg font-semibold text-red-200 mb-2">Registration unavailable</p>
            <p className="text-slate-400 text-sm mb-6">{error || "This link is invalid or has expired."}</p>
            <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <Link href="/login">Go to Login</Link>
            </Button>
          </div>
        </div>
      </RegisterShell>
    )
  }

  if (submitted) {
    return (
      <RegisterShell>
        <div className="flex items-center justify-center min-h-screen px-4 py-12">
          <div className="max-w-lg w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-10 text-center space-y-5">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Application Submitted</h1>
            <p className="text-slate-300 leading-relaxed">
              Your profile was sent to <strong className="text-white">{college.name}</strong> placement cell for verification.
            </p>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-left space-y-3 text-sm">
              {[
                { n: 1, t: "Placement cell reviews your details" },
                { n: 2, t: "You receive approval email with login ID" },
                { n: 3, t: "Sign in as Job Seeker linked to your college" },
              ].map(item => (
                <div key={item.n} className="flex items-center gap-3 text-slate-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600/40 text-xs font-bold text-violet-200">{item.n}</span>
                  {item.t}
                </div>
              ))}
            </div>
            <Button asChild className="bg-violet-600 hover:bg-violet-500 w-full h-11">
              <Link href="/login">Go to Sign In</Link>
            </Button>
          </div>
        </div>
      </RegisterShell>
    )
  }

  const location = [college.city, college.state].filter(Boolean).join(", ")
  const skillList = form.skills.split(",").map(s => s.trim()).filter(Boolean)

  return (
    <RegisterShell>
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
        {/* Left — college branding */}
        <div className="flex flex-col justify-center gap-6 border-b border-white/10 px-6 py-10 sm:px-10 lg:col-span-4 lg:border-b-0 lg:border-r lg:min-h-screen lg:sticky lg:top-0 lg:py-12 xl:px-12">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-4 py-1.5 text-xs font-medium text-violet-200">
            <Sparkles className="h-3.5 w-3.5" /> Student Registration
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl shadow-lg"
                style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, #a855f7)` }}
              >
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-violet-300">Placement Portal</p>
                <p className="text-sm font-semibold text-white line-clamp-2">{college.name}</p>
              </div>
            </div>
            {location && (
              <p className="flex items-center gap-1.5 text-sm text-slate-400">
                <MapPin className="h-4 w-4 text-violet-400" /> {location}
              </p>
            )}
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Complete your profile in 3 quick steps. After placement cell approval, you&apos;ll get {BRAND} login credentials by email.
            </p>
          </div>

          {/* Step progress — desktop */}
          <div className="hidden lg:flex flex-col gap-3">
            {STEPS.map((s) => {
              const done = step > s.id
              const active = step === s.id
              const Icon = s.icon
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all",
                    active && "border-violet-500/50 bg-violet-500/15 shadow-lg shadow-violet-900/20",
                    done && "border-emerald-500/30 bg-emerald-500/10",
                    !active && !done && "border-white/10 bg-white/[0.04]",
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    active && "bg-violet-600 text-white",
                    done && "bg-emerald-600/80 text-white",
                    !active && !done && "bg-white/10 text-slate-500",
                  )}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className={cn("text-sm font-medium", active ? "text-white" : done ? "text-emerald-200" : "text-slate-400")}>
                      Step {s.id}: {s.title}
                    </p>
                    <p className="text-xs text-slate-500">{s.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {["Verified by placement cell", "Secure submission", "Email login after approval"].map(tag => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-slate-400">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <div className="flex flex-col justify-center px-4 py-8 sm:px-8 lg:col-span-8 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-2xl">
            {/* Mobile step indicator */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Step {step} of 3</span>
                <span className="text-xs font-medium text-violet-300">{STEPS[step - 1].title}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500"
                  style={{ width: `${(step / 3) * 100}%` }}
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 bg-gradient-to-r from-violet-900/60 to-indigo-900/50 px-6 py-5">
                <div className="flex items-center gap-2 text-violet-200 text-xs font-medium mb-1">
                  <Shield className="h-3.5 w-3.5" />
                  Official college registration · {BRAND}
                </div>
                <h2 className="text-xl font-semibold text-white">{STEPS[step - 1].title}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{STEPS[step - 1].desc}</p>
              </div>

              <div className="p-6 sm:p-8">
                {/* Step 1 — Personal */}
                {step === 1 && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Full Name" required>
                        <Input
                          required
                          value={form.name}
                          onChange={e => set("name", e.target.value)}
                          placeholder="e.g. Raj Kumar"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="College Email" required hint={form.email && !emailValid ? "Enter a valid email address" : undefined}>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <Input
                            required
                            type="email"
                            value={form.email}
                            onChange={e => set("email", e.target.value)}
                            placeholder="you@college.edu"
                            className={cn(inputClass, "pl-10")}
                          />
                        </div>
                        {form.email && (
                          <p className={cn("text-[11px]", emailValid ? "text-emerald-400" : "text-amber-400")}>
                            {emailValid ? "✓ Valid email format" : "Invalid email format"}
                          </p>
                        )}
                      </Field>
                      <Field label="Phone Number">
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <Input
                            value={form.phone}
                            onChange={e => set("phone", e.target.value)}
                            placeholder="+91 98765 43210"
                            className={cn(inputClass, "pl-10")}
                          />
                        </div>
                      </Field>
                      <Field label="Roll Number" hint="University / enrollment ID">
                        <Input
                          value={form.rollNumber}
                          onChange={e => set("rollNumber", e.target.value)}
                          placeholder="CS2024001"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* Step 2 — Academic */}
                {step === 2 && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <Field label="Department" required>
                        <Select value={form.department} onValueChange={v => set("department", v)}>
                          <SelectTrigger className={cn(inputClass, "data-[placeholder]:text-slate-500")}>
                            <SelectValue placeholder="Choose your department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Batch / Passing Year" required>
                        <Input
                          value={form.batch}
                          onChange={e => set("batch", e.target.value)}
                          placeholder="2026"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="CGPA (out of 10)">
                        <div className="relative">
                          <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            value={form.cgpa}
                            onChange={e => set("cgpa", e.target.value)}
                            placeholder="8.50"
                            className={cn(inputClass, "pl-10")}
                          />
                        </div>
                      </Field>
                      <Field label="Active Backlogs">
                        <Input
                          type="number"
                          min="0"
                          value={form.backlogs}
                          onChange={e => set("backlogs", e.target.value)}
                          className={inputClass}
                        />
                      </Field>
                      <Field label="10th Marks (%)">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={form.marks10th}
                          onChange={e => set("marks10th", e.target.value)}
                          placeholder="85"
                          className={inputClass}
                        />
                      </Field>
                      <Field label="12th Marks (%)">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={form.marks12th}
                          onChange={e => set("marks12th", e.target.value)}
                          placeholder="78"
                          className={inputClass}
                        />
                      </Field>
                    </div>
                  </div>
                )}

                {/* Step 3 — Skills & Review */}
                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-5">
                      <Field label="Technical Skills" hint="Separate with commas — e.g. React, Python, Java">
                        <Input
                          value={form.skills}
                          onChange={e => set("skills", e.target.value)}
                          placeholder="React, Node.js, Python, SQL"
                          className={inputClass}
                        />
                      </Field>
                      {skillList.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {skillList.map((sk, i) => (
                            <span key={i} className="rounded-full border border-violet-500/30 bg-violet-500/15 px-3 py-1 text-xs text-violet-200">
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="grid sm:grid-cols-2 gap-5">
                        <Field label="LinkedIn Profile">
                          <div className="relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input
                              value={form.linkedinUrl}
                              onChange={e => set("linkedinUrl", e.target.value)}
                              placeholder="linkedin.com/in/username"
                              className={cn(inputClass, "pl-10")}
                            />
                          </div>
                        </Field>
                        <Field label="GitHub Profile">
                          <div className="relative">
                            <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                            <Input
                              value={form.githubUrl}
                              onChange={e => set("githubUrl", e.target.value)}
                              placeholder="github.com/username"
                              className={cn(inputClass, "pl-10")}
                            />
                          </div>
                        </Field>
                      </div>
                      <Field label="Projects, Internships & Achievements">
                        <Textarea
                          rows={4}
                          value={form.additionalInfo}
                          onChange={e => set("additionalInfo", e.target.value)}
                          placeholder="Briefly describe internships, major projects, hackathons, certifications..."
                          className={cn(inputClass, "min-h-[100px] resize-none py-3")}
                        />
                      </Field>
                    </div>

                    {/* Review summary */}
                    <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                      <h3 className="text-sm font-semibold text-violet-200 mb-3 flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4" /> Review your application
                      </h3>
                      <ReviewRow label="Name" value={form.name} />
                      <ReviewRow label="Email" value={form.email} />
                      <ReviewRow label="Phone" value={form.phone} />
                      <ReviewRow label="Roll No." value={form.rollNumber} />
                      <ReviewRow label="Department" value={form.department} />
                      <ReviewRow label="Batch" value={form.batch} />
                      <ReviewRow label="CGPA" value={form.cgpa} />
                      <ReviewRow label="10th %" value={form.marks10th} />
                      <ReviewRow label="12th %" value={form.marks12th} />
                      <ReviewRow label="Backlogs" value={form.backlogs} />
                      <ReviewRow label="Skills" value={skillList.join(", ") || undefined} />
                    </div>

                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 flex gap-3">
                      <Mail className="h-5 w-5 text-violet-300 shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-300 leading-relaxed">
                        By submitting, you confirm these details are accurate. <strong className="text-white">{college.name}</strong> placement cell will verify your identity before sending {BRAND} login credentials.
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-white/10">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(s => Math.max(1, s - 1))}
                    disabled={step === 1}
                    className="text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                  </Button>

                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={goNext}
                      className="bg-violet-600 hover:bg-violet-500 h-11 px-6"
                    >
                      Continue <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 h-11 px-6 shadow-lg shadow-violet-900/30"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Submit Application
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-slate-500 mt-6">
              Already registered?{" "}
              <Link href="/login" className="text-violet-400 hover:text-violet-300 hover:underline">
                Sign in to {BRAND}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </RegisterShell>
  )
}
