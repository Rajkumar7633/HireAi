"use client"

import { useState, useEffect, useRef, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { AuthPageBackdrop } from "@/components/auth-page-backdrop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Link2,
  ArrowLeft,
  Shield,
  Clock,
  RefreshCw,
  Sparkles,
  Mail,
  Check,
  X,
} from "lucide-react"

const EXPIRY_SECONDS = 15 * 60
const RESEND_COOLDOWN = 60
const BRAND = process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI"
const BRAND_COLOR = process.env.NEXT_PUBLIC_BRAND_COLOR || "#5b21b6"

type Step = 1 | 2 | 3

function analyzePassword(pw: string) {
  return {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  }
}

function passwordScore(rules: ReturnType<typeof analyzePassword>): number {
  const met = Object.values(rules).filter(Boolean).length
  return Math.round((met / 5) * 100)
}

function generateSecurePassword() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*"
  let out = ""
  for (let i = 0; i < 14; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out + "A1!"
}

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(6, " ").split("").slice(0, 6)

  const setDigit = (index: number, char: string) => {
    const clean = char.replace(/\D/g, "")
    const arr = value.padEnd(6, " ").split("").slice(0, 6)
    arr[index] = clean.slice(-1) || " "
    const next = arr.join("").replace(/ /g, "").slice(0, 6)
    onChange(next)
    if (clean && index < 5) refs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (pasted) onChange(pasted)
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={d.trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-10 sm:h-14 sm:w-12 rounded-xl border-2 border-slate-200 bg-white text-center text-xl font-bold text-slate-900 shadow-sm transition focus:border-violet-500 focus:ring-2 focus:ring-violet-200 disabled:opacity-50"
        />
      ))}
    </div>
  )
}

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const tokenFromUrl = searchParams.get("token") || ""
  const emailFromUrl = searchParams.get("email") || ""

  const [step, setStep] = useState<Step>(tokenFromUrl ? 2 : 1)
  const [email, setEmail] = useState(emailFromUrl)
  const [otpCode, setOtpCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"code" | "link">(tokenFromUrl ? "link" : "code")
  const [timeLeft, setTimeLeft] = useState(EXPIRY_SECONDS)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)

  const rules = useMemo(() => analyzePassword(newPassword), [newPassword])
  const strength = passwordScore(rules)
  const strengthLabel = strength < 40 ? "Weak" : strength < 70 ? "Fair" : strength < 90 ? "Strong" : "Excellent"
  const strengthColor = strength < 40 ? "#ef4444" : strength < 70 ? "#f59e0b" : strength < 90 ? "#3b82f6" : "#10b981"

  useEffect(() => {
    if (emailFromUrl) setEmail(emailFromUrl)
    if (tokenFromUrl) {
      setMode("link")
      setStep(2)
    }
    const stored = sessionStorage.getItem("reset-expiry")
    if (stored) {
      const remaining = Math.floor((Number(stored) - Date.now()) / 1000)
      if (remaining > 0) setTimeLeft(remaining)
    } else {
      sessionStorage.setItem("reset-expiry", String(Date.now() + EXPIRY_SECONDS * 1000))
    }
  }, [emailFromUrl, tokenFromUrl])

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft((s) => Math.max(0, s - 1))
      setResendCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, "0")}`
  }

  const handleResend = async () => {
    if (!email.trim() || resendCooldown > 0) return
    setResending(true)
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      sessionStorage.setItem("reset-expiry", String(Date.now() + EXPIRY_SECONDS * 1000))
      setTimeLeft(EXPIRY_SECONDS)
      setResendCooldown(RESEND_COOLDOWN)
      setOtpCode("")
      toast({ title: "Code resent", description: "Check your inbox for a new link and code." })
    } catch {
      toast({ title: "Could not resend", variant: "destructive" })
    } finally {
      setResending(false)
    }
  }

  const goToPasswordStep = () => {
    setError("")
    if (!email.trim()) {
      setError("Enter your email address.")
      return
    }
    if (mode === "code" && otpCode.length !== 6) {
      setError("Enter the full 6-digit verification code.")
      return
    }
    if (timeLeft <= 0) {
      setError("Your code has expired. Request a new one.")
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    const useToken = Boolean(tokenFromUrl)
    if (!useToken && otpCode.length !== 6) {
      setError("Verification code required.")
      setStep(1)
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          newPassword,
          ...(useToken ? { token: tokenFromUrl } : { code: otpCode }),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || "Reset failed.")
        return
      }

      sessionStorage.removeItem("reset-expiry")
      setStep(3)
      toast({ title: "Password updated", description: "Sign in with your new password." })
      setTimeout(() => router.push("/login"), 3000)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { n: 1, label: "Verify identity" },
    { n: 2, label: "New password" },
    { n: 3, label: "Complete" },
  ]

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0614] text-white">
      <AuthPageBackdrop brandColor={BRAND_COLOR} particleCount={40} />

      <div className="pointer-events-none absolute left-[4%] top-[18%] h-32 w-32 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[6%] bottom-[15%] h-36 w-36 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative z-10 grid min-h-screen w-full grid-cols-1 lg:grid-cols-12">
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
              <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300">Account security</p>
              <p className="text-lg font-semibold">{BRAND}</p>
            </div>
          </div>
          <div>
            <h1 className="font-serif text-3xl font-medium leading-tight sm:text-4xl xl:text-[2.75rem]">
              Secure password recovery
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400">
              Enterprise-grade reset with encrypted tokens, one-time codes, and automatic sign-out on all devices.
            </p>
          </div>

          <div className="grid gap-2.5">
            {[
              { icon: Shield, text: "256-bit token hashing & 15-min expiry" },
              { icon: KeyRound, text: "Dual recovery: magic link or 6-digit OTP" },
              { icon: Lock, text: "All active sessions signed out on reset" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-slate-300 backdrop-blur-sm">
                <item.icon className="h-4 w-4 shrink-0 text-violet-400" />
                {item.text}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {["Encrypted", "SOC-ready", "No plain-text OTP"].map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-slate-400">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:col-span-7 lg:py-12 xl:px-16">
          <div className="mx-auto w-full max-w-md lg:max-w-lg">
            {/* Step rail */}
            <div className="mb-8 flex items-center justify-between">
              {steps.map((s, i) => (
                <div key={s.n} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                        step >= s.n
                          ? "border-violet-400 bg-violet-600 text-white"
                          : "border-white/20 bg-white/5 text-slate-500"
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

            {/* Card */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 bg-gradient-to-r from-violet-900/40 to-indigo-900/30 px-6 py-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/30 ring-1 ring-violet-400/40">
                  <Lock className="h-6 w-6 text-violet-200" />
                </div>
                <h2 className="text-xl font-semibold">
                  {step === 1 && "Verify your identity"}
                  {step === 2 && "Create new password"}
                  {step === 3 && "You're all set"}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  {step === 1 && "Enter the code from your email"}
                  {step === 2 && "Choose a strong, unique password"}
                  {step === 3 && "Redirecting to sign in..."}
                </p>
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* STEP 1 — Verify */}
                {step === 1 && (
                  <div className="space-y-5">
                    {timeLeft > 0 ? (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                        <Clock className="h-4 w-4" />
                        Code expires in <strong>{formatTime(timeLeft)}</strong>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
                        Code expired — request a new one below
                      </div>
                    )}

                    <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
                      <button
                        type="button"
                        onClick={() => setMode("code")}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                          mode === "code" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <KeyRound className="h-3.5 w-3.5" /> Verification code
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("link")}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                          mode === "link" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <Link2 className="h-3.5 w-3.5" /> Email link
                      </button>
                    </div>

                    {mode === "code" ? (
                      <>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Email address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="border-white/10 bg-black/30 pl-9 text-white placeholder:text-slate-500"
                              placeholder="you@company.com"
                            />
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-center block text-slate-300">6-digit verification code</Label>
                          <OtpBoxes value={otpCode} onChange={setOtpCode} disabled={timeLeft <= 0} />
                          <p className="text-center text-[11px] text-slate-500">Tip: paste the code from your email</p>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending || resendCooldown > 0 || !email.trim()}
                            className="flex items-center gap-1 text-violet-300 hover:text-white disabled:opacity-40"
                          >
                            {resending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                          </button>
                          <Link href="/auth/forgot-password" className="text-slate-400 hover:text-white">
                            New request
                          </Link>
                        </div>
                        <Button
                          type="button"
                          onClick={goToPasswordStep}
                          className="w-full bg-violet-600 hover:bg-violet-500"
                          disabled={timeLeft <= 0}
                        >
                          Continue
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-4 text-center">
                        <p className="text-sm text-slate-400">
                          Open the <strong className="text-white">Reset Password</strong> button in your email — you&apos;ll land here with a secure token.
                        </p>
                        <Button asChild variant="outline" className="w-full border-white/20 bg-transparent text-white hover:bg-white/10">
                          <Link href="/auth/forgot-password">Request reset email</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2 — Password */}
                {step === 2 && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {tokenFromUrl && (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                        <CheckCircle2 className="h-4 w-4" />
                        Secure link active for <strong>{email || emailFromUrl}</strong>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300">New password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            const gen = generateSecurePassword()
                            setNewPassword(gen)
                            setConfirmPassword(gen)
                            setShowPwd(true)
                            toast({ title: "Password generated", description: "Copy it before submitting." })
                          }}
                          className="flex items-center gap-1 text-[11px] text-violet-300 hover:text-white"
                        >
                          <Sparkles className="h-3 w-3" /> Generate secure
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          type={showPwd ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="border-white/10 bg-black/30 pr-10 text-white"
                          placeholder="Min 8 characters recommended"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Feature: strength meter + checklist */}
                    {newPassword.length > 0 && (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Password strength</span>
                          <span style={{ color: strengthColor }} className="font-semibold">{strengthLabel}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${strength}%`, backgroundColor: strengthColor }}
                          />
                        </div>
                        <ul className="grid grid-cols-2 gap-1.5 text-[11px]">
                          {[
                            { key: "length", label: "8+ characters" },
                            { key: "upper", label: "Uppercase" },
                            { key: "lower", label: "Lowercase" },
                            { key: "number", label: "Number" },
                            { key: "symbol", label: "Symbol" },
                          ].map((r) => {
                            const ok = rules[r.key as keyof typeof rules]
                            return (
                              <li key={r.key} className={`flex items-center gap-1 ${ok ? "text-emerald-400" : "text-slate-500"}`}>
                                {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                {r.label}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-slate-300">Confirm password</Label>
                      <Input
                        type={showPwd ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="border-white/10 bg-black/30 text-white"
                        placeholder="Repeat password"
                      />
                      {confirmPassword && (
                        <p className={`text-[11px] ${newPassword === confirmPassword ? "text-emerald-400" : "text-red-400"}`}>
                          {newPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!tokenFromUrl && (
                        <Button type="button" variant="outline" onClick={() => setStep(1)} className="border-white/20 bg-transparent text-white hover:bg-white/10">
                          Back
                        </Button>
                      )}
                      <Button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-500" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                        {loading ? "Updating..." : "Update password"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* STEP 3 — Success */}
                {step === 3 && (
                  <div className="py-6 text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/50">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                    <p className="text-lg font-semibold">Password updated successfully</p>
                    <p className="text-sm text-slate-400">All other sessions have been signed out for your security.</p>
                    <Button asChild className="bg-violet-600 hover:bg-violet-500">
                      <Link href="/login">Continue to sign in</Link>
                    </Button>
                  </div>
                )}

                {step < 3 && (
                  <p className="mt-5 text-center text-[11px] text-slate-500">
                    <Link href="/login" className="text-violet-300 hover:underline">Back to login</Link>
                    {" · "}
                    <Link href="/privacy" className="hover:underline">Privacy</Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f0a1a]">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
