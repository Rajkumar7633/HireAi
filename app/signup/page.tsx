"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AuthPageBackdrop } from "@/components/auth-page-backdrop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { persistAuthToken } from "@/lib/client-auth"
import {
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Briefcase,
  GraduationCap,
  Building2,
  Sparkles,
  Shield,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
} from "lucide-react"

const BRAND = process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI"
const BRAND_COLOR = process.env.NEXT_PUBLIC_BRAND_COLOR || "#6d28d9"
const DRAFT_KEY = "signup:draft"

type Role = "job_seeker" | "recruiter" | "college_admin" | ""
type Step = 1 | 2 | 3

const ROLES = [
  {
    id: "job_seeker" as const,
    label: "Job Seeker",
    icon: GraduationCap,
    desc: "Find roles, take assessments, track applications",
    perks: ["AI job matching", "Skill verification", "Interview prep"],
  },
  {
    id: "recruiter" as const,
    label: "Recruiter",
    icon: Briefcase,
    desc: "Post jobs, screen candidates, run video interviews",
    perks: ["AI matching studio", "Pipeline CRM", "Bulk outreach"],
  },
  {
    id: "college_admin" as const,
    label: "College Admin",
    icon: Building2,
    desc: "Manage campus drives and student placements",
    perks: ["Placement analytics", "Campus drives", "Student tracking"],
  },
]

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function analyzePassword(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  }
}

function passwordScore(rules: ReturnType<typeof analyzePassword>) {
  return Math.round((Object.values(rules).filter(Boolean).length / 5) * 100)
}

function generateSecurePassword() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*"
  let out = ""
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out + "A1!"
}

function completionPercent(step: Step, name: string, email: string, password: string, role: Role, acceptTerms: boolean) {
  let p = 0
  if (name.trim()) p += 15
  if (isValidEmail(email)) p += 15
  if (password.length >= 6) p += 20
  if (passwordScore(analyzePassword(password)) >= 60) p += 15
  if (role) p += 20
  if (acceptTerms) p += 15
  if (step === 3 && p < 85) p = Math.min(p + 10, 85)
  return Math.min(100, p)
}

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>(1)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<Role>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  const rules = useMemo(() => analyzePassword(password), [password])
  const strength = passwordScore(rules)
  const strengthLabel = strength < 40 ? "Weak" : strength < 70 ? "Fair" : strength < 90 ? "Strong" : "Excellent"
  const strengthColor = strength < 40 ? "#ef4444" : strength < 70 ? "#f59e0b" : strength < 90 ? "#3b82f6" : "#10b981"
  const progress = completionPercent(step, name, email, password, role, acceptTerms)
  const selectedRole = ROLES.find((r) => r.id === role)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.name) setName(d.name)
      if (d.email) setEmail(d.email)
      if (d.role) setRole(d.role)
      const terms = localStorage.getItem("signup:acceptTerms")
      if (terms === "true") setAcceptTerms(true)
    } catch {}
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ name, email, role }))
      localStorage.setItem("signup:acceptTerms", acceptTerms ? "true" : "false")
    } catch {}
  }, [name, email, role, acceptTerms])

  const validateStep = (s: Step): string | null => {
    if (s === 1) {
      if (!name.trim()) return "Enter your full name."
      if (!isValidEmail(email)) return "Enter a valid email address."
    }
    if (s === 2) {
      if (password.length < 6) return "Password must be at least 6 characters."
      if (password !== confirmPassword) return "Passwords do not match."
    }
    if (s === 3) {
      if (!role) return "Select your account type."
      if (role === "college_admin" && !email.toLowerCase().endsWith("@mmumullana.org")) {
        return "College admin must use @mmumullana.org email address."
      }
      if (!acceptTerms) return "Accept the Terms and Privacy Policy to continue."
    }
    return null
  }

  const goNext = () => {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    setError("")
    setStep((s) => Math.min(3, s + 1) as Step)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateStep(3)
    if (err) {
      setError(err)
      return
    }

    setLoading(true)
    setError("")
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.message || "Signup failed")
        return
      }

      if (data.token) persistAuthToken(data.token)
      sessionStorage.removeItem(DRAFT_KEY)
      toast({ title: "Account created!", description: "Welcome to " + BRAND })

      const r = data.user?.role
      if (r === "recruiter") router.push("/dashboard/recruiter")
      else if (r === "college_admin" || r === "college") router.push("/dashboard/college")
      else if (r === "job_seeker") router.push("/dashboard/job-seeker")
      else router.push("/dashboard")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { n: 1, label: "Profile" },
    { n: 2, label: "Security" },
    { n: 3, label: "Account type" },
  ]

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0614] text-white">
      <AuthPageBackdrop brandColor={BRAND_COLOR} particleCount={50} interactive />

      <div className="relative z-10 grid min-h-screen w-full grid-cols-1 lg:grid-cols-12">
        {/* Left panel */}
        <div className="flex flex-col justify-center gap-6 border-b border-white/10 px-6 py-10 sm:px-10 lg:col-span-5 lg:border-b-0 lg:border-r lg:py-12 xl:px-14">
          <Link href="/login" className="inline-flex w-fit items-center gap-2 text-sm text-violet-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>

          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold shadow-lg"
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, #a855f7)` }}
            >
              {BRAND.slice(0, 1)}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300">Join {BRAND}</p>
              <p className="text-lg font-semibold">Create your account</p>
            </div>
          </div>

          <div>
            <h1 className="font-serif text-3xl font-medium leading-tight sm:text-4xl">
              Start hiring or landing your dream role
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Free to join. AI-powered matching, assessments, and interviews — built for modern teams and talent.
            </p>
          </div>

          {/* Dynamic role preview */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-violet-300">
              {selectedRole ? `${selectedRole.label} benefits` : "Why join?"}
            </p>
            <ul className="mt-3 space-y-2">
              {(selectedRole?.perks || ["Smart AI matching", "Verified skill badges", "Secure OTP login"]).map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Profile completion */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Profile completion</span>
              <span className="font-semibold text-violet-300">{progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:col-span-7 lg:py-12 xl:px-16">
          <div className="mx-auto w-full max-w-lg">
            {/* Step rail */}
            <div className="mb-6 flex items-center justify-between">
              {steps.map((s, i) => (
                <div key={s.n} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        step >= s.n ? "border-violet-400 bg-violet-600 text-white" : "border-white/20 bg-white/5 text-slate-500"
                      }`}
                    >
                      {step > s.n ? <Check className="h-4 w-4" /> : s.n}
                    </div>
                    <span className="hidden text-[10px] text-slate-400 sm:block">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`mx-2 h-0.5 flex-1 ${step > s.n ? "bg-violet-500" : "bg-white/10"}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 bg-gradient-to-r from-violet-900/50 to-indigo-900/40 px-6 py-4 text-center">
                <h2 className="text-lg font-semibold">
                  {step === 1 && "Your profile"}
                  {step === 2 && "Secure your account"}
                  {step === 3 && "Choose account type"}
                </h2>
                <p className="text-xs text-slate-400">Step {step} of 3</p>
              </div>

              <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); goNext() }} className="space-y-4 p-6">
                {error && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-300">Full name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Jane Doe"
                          required
                          className="border-white/10 bg-black/30 pl-9 text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-300">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => setEmailTouched(true)}
                          placeholder="you@company.com"
                          required
                          className="border-white/10 bg-black/30 pl-9 pr-9 text-white"
                        />
                        {email && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isValidEmail(email) ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : emailTouched ? (
                              <XCircle className="h-4 w-4 text-red-400" />
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">Password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            const gen = generateSecurePassword()
                            setPassword(gen)
                            setConfirmPassword(gen)
                            setShowPassword(true)
                            toast({ title: "Password generated" })
                          }}
                          className="flex items-center gap-1 text-[11px] text-violet-300 hover:text-white"
                        >
                          <Sparkles className="h-3 w-3" /> Generate
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          required
                          minLength={6}
                          className="border-white/10 bg-black/30 pl-9 pr-10 text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {password.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Strength</span>
                          <span style={{ color: strengthColor }}>{strengthLabel}</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full transition-all" style={{ width: `${strength}%`, backgroundColor: strengthColor }} />
                        </div>
                        <ul className="grid grid-cols-2 gap-1 text-[10px]">
                          {[
                            { k: "length", l: "8+ chars" },
                            { k: "upper", l: "Uppercase" },
                            { k: "number", l: "Number" },
                            { k: "symbol", l: "Symbol" },
                          ].map((r) => {
                            const ok = rules[r.k as keyof typeof rules]
                            return (
                              <li key={r.k} className={`flex items-center gap-1 ${ok ? "text-emerald-400" : "text-slate-500"}`}>
                                {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {r.l}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-slate-300">Confirm password</Label>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        required
                        className="border-white/10 bg-black/30 text-white"
                      />
                      {confirmPassword && (
                        <p className={`text-[11px] ${password === confirmPassword ? "text-emerald-400" : "text-red-400"}`}>
                          {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="grid gap-2 sm:grid-cols-1">
                      {ROLES.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                            role === r.id
                              ? "border-violet-500 bg-violet-600/20 ring-1 ring-violet-400/50"
                              : "border-white/10 bg-white/[0.04] hover:border-white/20"
                          }`}
                        >
                          <div className={`rounded-lg p-2 ${role === r.id ? "bg-violet-600/40" : "bg-white/10"}`}>
                            <r.icon className="h-5 w-5 text-violet-200" />
                          </div>
                          <div>
                            <p className="font-medium">{r.label}</p>
                            <p className="text-xs text-slate-400">{r.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {role === "college_admin" && email && (
                      <p className={`text-xs ${email.toLowerCase().endsWith("@mmumullana.org") ? "text-emerald-400" : "text-amber-400"}`}>
                        {email.toLowerCase().endsWith("@mmumullana.org")
                          ? "✓ Valid college email domain"
                          : "College admin requires @mmumullana.org email"}
                      </p>
                    )}

                    <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-400">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1 accent-violet-600"
                      />
                      <span>
                        I agree to the{" "}
                        <Link href="/terms" className="text-violet-300 hover:underline">Terms</Link> and{" "}
                        <Link href="/privacy" className="text-violet-300 hover:underline">Privacy Policy</Link>.
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      {["Google", "GitHub"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => toast({ title: "Coming soon", description: `${p} signup soon.` })}
                          className="rounded-lg border border-white/10 py-2 text-xs text-slate-400 hover:bg-white/5"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setStep((s) => (s - 1) as Step); setError("") }}
                      className="border-white/20 bg-transparent text-white hover:bg-white/10"
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" /> Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    className="flex-1 shadow-lg shadow-violet-900/30"
                    style={{ backgroundColor: BRAND_COLOR }}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : step === 3 ? (
                      <Shield className="mr-2 h-4 w-4" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {loading ? "Creating..." : step === 3 ? "Create account" : "Continue"}
                  </Button>
                </div>
              </form>

              <p className="border-t border-white/10 py-4 text-center text-sm text-slate-400">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-violet-300 hover:text-white hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
