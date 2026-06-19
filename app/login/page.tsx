"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useSession } from "@/hooks/use-session"
import { AuthPageBackdrop } from "@/components/auth-page-backdrop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { persistAuthToken } from "@/lib/client-auth"
import {
  Loader2,
  Mail,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Briefcase,
  GraduationCap,
  Building2,
  Sparkles,
  CheckCircle2,
} from "lucide-react"

const BRAND = process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI"
const BRAND_COLOR = process.env.NEXT_PUBLIC_BRAND_COLOR || "#6d28d9"

function isValidEmail(v: string) {
  return /.+@.+\..+/.test(v.trim())
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(6, " ").split("").slice(0, 6)

  const setDigit = (index: number, char: string) => {
    const clean = char.replace(/\D/g, "")
    const arr = value.padEnd(6, " ").split("").slice(0, 6)
    arr[index] = clean.slice(-1) || " "
    onChange(arr.join("").replace(/ /g, "").slice(0, 6))
    if (clean && index < 5) refs.current[index + 1]?.focus()
  }

  return (
    <div className="flex justify-center gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i]?.trim() && i > 0) refs.current[i - 1]?.focus()
          }}
          className="h-11 w-10 rounded-lg border border-white/15 bg-black/30 text-center text-lg font-bold text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
        />
      ))}
    </div>
  )
}

function redirectByRole(router: ReturnType<typeof useRouter>, role: string, redirectPath: string) {
  if (redirectPath && redirectPath.startsWith("/")) {
    router.push(redirectPath)
    return
  }
  if (role === "recruiter") router.push("/dashboard/recruiter")
  else if (role === "college_admin" || role === "college") router.push("/dashboard/college")
  else if (role === "job_seeker") router.push("/dashboard/job-seeker")
  else router.push("/dashboard")
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [otpPhase, setOtpPhase] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [otpError, setOtpError] = useState("")
  const [otpResending, setOtpResending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const redirectParam = (searchParams?.get("redirect") || "").toString()
  const redirectPath = redirectParam ? decodeURIComponent(redirectParam) : ""
  const { refreshSession } = useSession() as { refreshSession?: () => void }

  useEffect(() => {
    const saved = localStorage.getItem("login:rememberEmail")
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setShowSignupPrompt(false)

    if (!isValidEmail(email)) {
      setError("Enter a valid email address.")
      setLoading(false)
      return
    }

    if (rememberMe) localStorage.setItem("login:rememberEmail", email.trim())
    else localStorage.removeItem("login:rememberEmail")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await response.json()

      if (response.ok && data?.status === "otp_sent") {
        setOtpPhase(true)
        setLoading(false)
        toast({ title: "Verification code sent", description: `Check ${email.trim()} and your spam folder for the 6-digit code.` })
        return
      }

      if (response.status === 503) {
        setError(data.message || "Could not send verification email. Try again in a minute.")
        return
      }

      if (response.ok) {
        const token = data.token || data.accessToken || data.jwt || data.access_token
        if (token) persistAuthToken(token)
        toast({ title: "Welcome back!", description: "Signed in successfully." })
        await refreshSession?.()
        redirectByRole(router, data?.user?.role || "", redirectPath)
        return
      }

      if (response.status === 404) setShowSignupPrompt(true)
      setError(data.message || "Login failed")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!password) {
      setOtpError("Go back and enter your password to resend the code.")
      return
    }
    setOtpResending(true)
    setOtpError("")
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await response.json()
      if (response.ok && data?.status === "otp_sent") {
        toast({ title: "Code resent", description: "Check your inbox and spam folder." })
        setOtpCode("")
      } else {
        setOtpError(data.message || "Could not resend code. Try again.")
      }
    } catch {
      setOtpError("Network error. Try again.")
    } finally {
      setOtpResending(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otpCode.length !== 6) {
      setOtpError("Enter the full 6-digit code")
      return
    }
    setVerifying(true)
    setOtpError("")
    try {
      const r = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), code: otpCode }),
      })
      const data = await r.json()
      if (!r.ok) {
        setOtpError(data?.msg || data?.message || "Invalid code")
        return
      }
      persistAuthToken(data.accessToken || data.token)
      await refreshSession?.()
      redirectByRole(router, data?.user?.role || "", redirectPath)
    } catch {
      setOtpError("Verification failed. Try again.")
    } finally {
      setVerifying(false)
    }
  }

  const features = [
    { icon: Briefcase, label: "AI job matching", desc: "Smart candidate–role fit" },
    { icon: GraduationCap, label: "Skill assessments", desc: "Verify talent instantly" },
    { icon: Building2, label: "Recruiter studio", desc: "End-to-end hiring pipeline" },
  ]

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0614] text-white">
      <AuthPageBackdrop brandColor={BRAND_COLOR} particleCount={55} interactive />

      <div className="relative z-10 grid min-h-screen w-full grid-cols-1 lg:grid-cols-12">
        {/* Left — brand & value props */}
        <div className="flex flex-col justify-center gap-6 border-b border-white/10 px-6 py-10 sm:px-10 lg:col-span-5 lg:border-b-0 lg:border-r lg:py-12 xl:px-14">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl text-base font-bold shadow-lg"
              style={{ background: `linear-gradient(135deg, ${BRAND_COLOR}, #a855f7)` }}
            >
              {BRAND.slice(0, 1)}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300">Welcome to</p>
              <p className="text-lg font-semibold">{BRAND}</p>
            </div>
          </div>

          <div>
            <h1 className="font-serif text-3xl font-medium leading-tight sm:text-4xl xl:text-[2.75rem]">
              Hire smarter.<br />Grow faster.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400">
              The AI-powered recruitment platform for job seekers, recruiters, and colleges — assessments,
              interviews, and pipeline in one place.
            </p>
          </div>

          <div className="grid gap-2.5">
            {features.map((f) => (
              <div
                key={f.label}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm transition hover:border-violet-500/30 hover:bg-white/[0.09]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/25 text-violet-200 transition group-hover:bg-violet-600/40">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {["SOC-ready", "OTP secured", "Role-based access"].map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-slate-400">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right — login card */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:col-span-7 lg:py-12 xl:px-16">
          <div className="mx-auto w-full max-w-md lg:max-w-lg">
            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 bg-gradient-to-r from-violet-900/50 to-indigo-900/40 px-6 py-5 text-center">
                <div className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-violet-100">
                  <Shield className="h-3.5 w-3.5" /> Secure sign in
                </div>
                <h2 className="text-xl font-semibold">{otpPhase ? "Verify your email" : "Welcome back"}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {otpPhase ? "Enter the 6-digit code we sent you" : "Sign in to continue to your dashboard"}
                </p>
              </div>

              <div className="p-6 sm:p-8">
                <form onSubmit={otpPhase ? handleVerifyOtp : handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                      {error}
                    </div>
                  )}
                  {showSignupPrompt && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-100">
                      No account found.{" "}
                      <Link href="/signup" className="font-medium text-white underline">Sign up free</Link>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-300">Email</Label>
                    <div className="relative">
                      <Mail className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition ${focusedField === "email" ? "text-violet-400" : "text-slate-500"}`} />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        required
                        disabled={otpPhase}
                        placeholder="you@company.com"
                        className="border-white/10 bg-black/30 pl-9 text-white placeholder:text-slate-500 focus-visible:ring-violet-500"
                      />
                    </div>
                    {email && !otpPhase && (
                      <p className={`text-[11px] ${isValidEmail(email) ? "text-emerald-400" : "text-amber-400"}`}>
                        {isValidEmail(email) ? "✓ Valid email" : "Invalid email format"}
                      </p>
                    )}
                  </div>

                  {!otpPhase && (
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-slate-300">Password</Label>
                      <div className="relative">
                        <Lock className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition ${focusedField === "password" ? "text-violet-400" : "text-slate-500"}`} />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedField("password")}
                          onBlur={() => setFocusedField(null)}
                          required
                          placeholder="••••••••"
                          className="border-white/10 bg-black/30 pl-9 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-violet-500"
                        />
                        <button
                          type="button"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {otpPhase && (
                    <div className="space-y-3">
                      <Label className="text-center block text-slate-300">Verification code</Label>
                      <OtpInput value={otpCode} onChange={setOtpCode} />
                      {otpError && <p className="text-center text-sm text-red-400">{otpError}</p>}
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={otpResending}
                        className="w-full text-center text-xs text-violet-300 hover:text-white disabled:opacity-50"
                      >
                        {otpResending ? "Sending new code..." : "Didn't get a code? Resend"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setOtpPhase(false); setOtpCode(""); setOtpError("") }}
                        className="w-full text-center text-xs text-violet-300 hover:text-white"
                      >
                        ← Back to password sign in
                      </button>
                    </div>
                  )}

                  {!otpPhase && (
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex cursor-pointer items-center gap-2 text-slate-400">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-black/30 accent-violet-600"
                        />
                        Remember me
                      </label>
                      <Link href="/auth/forgot-password" className="text-violet-300 hover:text-white hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="h-11 w-full text-base font-semibold shadow-lg shadow-violet-900/30"
                    style={{ backgroundColor: BRAND_COLOR }}
                    disabled={otpPhase ? verifying : loading}
                  >
                    {(otpPhase ? verifying : loading) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {otpPhase ? "Verifying..." : "Signing in..."}
                      </>
                    ) : otpPhase ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Verify & continue
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>

                  {!otpPhase && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="mb-2 text-center text-[11px] text-slate-500">Or continue with</p>
                      <div className="grid grid-cols-2 gap-2">
                        {["Google", "GitHub"].map((provider) => (
                          <button
                            key={provider}
                            type="button"
                            onClick={() => toast({ title: "Coming soon", description: `${provider} sign-in will be available shortly.` })}
                            className="rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                          >
                            {provider}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </form>

                <p className="mt-5 text-center text-[11px] text-slate-500">
                  By continuing you agree to our{" "}
                  <Link href="/terms" className="text-violet-300 hover:underline">Terms</Link> and{" "}
                  <Link href="/privacy" className="hover:underline">Privacy</Link>.
                </p>

                <p className="mt-4 text-center text-sm text-slate-400">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-medium text-violet-300 hover:text-white hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
            </div>

            <div className="mt-6 hidden gap-3 sm:grid sm:grid-cols-3">
              {[
                { icon: Sparkles, label: "AI matching" },
                { icon: Shield, label: "Secure OTP" },
                { icon: Briefcase, label: "10k+ roles" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-center backdrop-blur-sm">
                  <s.icon className="h-4 w-4 text-violet-400" />
                  <span className="text-[10px] text-slate-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
