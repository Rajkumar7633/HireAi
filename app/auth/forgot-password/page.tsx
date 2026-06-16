"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { AuthPageBackdrop } from "@/components/auth-page-backdrop"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Mail,
  ArrowLeft,
  CheckCircle2,
  Shield,
  KeyRound,
  Link2,
  Clock,
  RefreshCw,
  Inbox,
  HelpCircle,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  Lock,
} from "lucide-react"

const EXPIRY_SECONDS = 15 * 60
const RESEND_COOLDOWN = 60
const BRAND = process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI"
const BRAND_COLOR = process.env.NEXT_PUBLIC_BRAND_COLOR || "#5b21b6"

const EMAIL_PROVIDERS = [
  { name: "Gmail", url: "https://mail.google.com" },
  { name: "Outlook", url: "https://outlook.live.com" },
  { name: "Yahoo", url: "https://mail.yahoo.com" },
]

function isValidEmail(v: string) {
  return /.+@.+\..+/.test(v.trim())
}

function EmailPreviewMock() {
  return (
    <div className="relative mt-2 w-full max-w-sm">
      <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
      <div className="absolute -right-6 bottom-0 h-20 w-20 rounded-full bg-fuchsia-500/20 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/5 p-4 shadow-2xl backdrop-blur-md">
        <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-xs font-bold">H</div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold text-white">{BRAND} Security</p>
            <p className="text-[10px] text-slate-400">password-reset@{BRAND.toLowerCase()}.app</p>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] text-emerald-300">New</span>
        </div>
        <p className="text-xs font-semibold text-white">Reset your password</p>
        <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
          Your secure link and 6-digit code are inside. Expires in 15 minutes.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="rounded-lg bg-violet-600 px-3 py-1.5 text-[10px] font-semibold text-white">Reset Password</div>
          <div className="rounded-lg border border-dashed border-violet-400/50 px-2 py-1.5 font-mono text-[10px] tracking-widest text-violet-200">
            4 8 2 9 1 6
          </div>
        </div>
      </div>
    </div>
  )
}

function SideOrbs() {
  return (
    <>
      <div className="pointer-events-none absolute left-[4%] top-[18%] h-32 w-32 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[6%] top-[30%] h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[12%] right-[10%] h-28 w-28 rounded-full bg-fuchsia-500/15 blur-2xl" />
    </>
  )
}

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")
  const [timeLeft, setTimeLeft] = useState(EXPIRY_SECONDS)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resending, setResending] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)

  useEffect(() => {
    if (!sent) return
    const t = setInterval(() => {
      setTimeLeft((s) => Math.max(0, s - 1))
      setResendCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [sent])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, "0")}`
  }

  const sendReset = async (targetEmail: string) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail.trim() }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || "Please try again.")
    sessionStorage.setItem("reset-expiry", String(Date.now() + EXPIRY_SECONDS * 1000))
    return data
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.")
      return
    }

    setLoading(true)
    try {
      await sendReset(email)
      setSent(true)
      setTimeLeft(EXPIRY_SECONDS)
      setResendCooldown(RESEND_COOLDOWN)
      toast({
        title: "Recovery email sent",
        description: "Check your inbox for the link and 6-digit code.",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error"
      setError(msg)
      toast({ title: "Request failed", description: msg, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0 || !email.trim()) return
    setResending(true)
    try {
      await sendReset(email)
      setTimeLeft(EXPIRY_SECONDS)
      setResendCooldown(RESEND_COOLDOWN)
      toast({ title: "Email resent", description: "A fresh link and code were sent." })
    } catch {
      toast({ title: "Could not resend", variant: "destructive" })
    } finally {
      setResending(false)
    }
  }

  const steps = [
    { step: "1", title: "Enter your email", desc: "The address linked to your account", icon: Mail },
    { step: "2", title: "Check your inbox", desc: "Link + OTP in one branded email", icon: Inbox },
    { step: "3", title: "Set new password", desc: "Secure recovery in under a minute", icon: Lock },
  ]

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0614] text-white">
      <AuthPageBackdrop brandColor={BRAND_COLOR} particleCount={40} />
      <SideOrbs />

      {/* Full width content — no max-w gap on sides */}
      <div className="relative z-10 grid min-h-screen w-full grid-cols-1 lg:grid-cols-12">
        {/* LEFT — fills column, no justify-between gap */}
        <div className="flex flex-col justify-center gap-8 border-b border-white/10 px-6 py-10 sm:px-10 lg:col-span-5 lg:border-b-0 lg:border-r lg:py-12 xl:px-14">
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
              <p className="text-[10px] uppercase tracking-[0.25em] text-violet-300">Password recovery</p>
              <p className="text-lg font-semibold">{BRAND}</p>
            </div>
          </div>

          <div>
            <h1 className="font-serif text-3xl font-medium leading-tight tracking-tight sm:text-4xl xl:text-[2.75rem]">
              Recover access to your account
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400">
              We&apos;ll send a branded recovery email with a secure one-click link and a 6-digit verification code.
            </p>
          </div>

          {/* Steps — compact, no bottom push */}
          <div className="grid gap-2.5 sm:grid-cols-1">
            {steps.map((item) => (
              <div
                key={item.step}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-600/25 text-violet-200">
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    <span className="mr-1.5 text-violet-400">{item.step}.</span>
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <EmailPreviewMock />

          {/* Trust badges row */}
          <div className="flex flex-wrap gap-2">
            {["256-bit encrypted", "15-min expiry", "Dual recovery"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT — form + side stats */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:col-span-7 lg:py-12 xl:px-16">
          <div className="mx-auto w-full max-w-md lg:max-w-lg">
            {/* Step pills */}
            <div className="mb-6 flex justify-center gap-2">
              <span className={`rounded-full px-4 py-1.5 text-xs font-medium ${!sent ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40" : "bg-white/10 text-slate-400"}`}>
                1 · Request
              </span>
              <span className={`rounded-full px-4 py-1.5 text-xs font-medium ${sent ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40" : "bg-white/10 text-slate-400"}`}>
                2 · Verify email
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] shadow-2xl backdrop-blur-xl">
              <div className="border-b border-white/10 bg-gradient-to-r from-violet-900/50 to-indigo-900/40 px-6 py-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/30 ring-1 ring-violet-400/40">
                  <Shield className="h-6 w-6 text-violet-200" />
                </div>
                <h2 className="text-xl font-semibold">{sent ? "Check your inbox" : "Forgot password?"}</h2>
                <p className="mt-1 text-xs text-slate-400">
                  {sent ? "Recovery link + 6-digit code sent" : "Secure reset · 15 min expiry"}
                </p>
              </div>

              <div className="p-6">
                {sent ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center py-1">
                      <div className="relative">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 ring-2 ring-emerald-400/40">
                          <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                        </div>
                        {timeLeft > 0 && (
                          <span className="absolute -bottom-1 -right-2 flex items-center gap-0.5 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold">
                            <Clock className="h-3 w-3" />
                            {formatTime(timeLeft)}
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-center text-sm text-slate-300">
                        Sent to <strong className="text-white">{email}</strong>
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 p-3">
                        <Link2 className="mb-1.5 h-4 w-4 text-violet-300" />
                        <p className="text-xs font-semibold">One-click link</p>
                      </div>
                      <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3">
                        <KeyRound className="mb-1.5 h-4 w-4 text-indigo-300" />
                        <p className="text-xs font-semibold">6-digit code</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                      <p className="mb-2 text-[11px] font-medium text-slate-300">Open inbox</p>
                      <div className="flex flex-wrap gap-1.5">
                        {EMAIL_PROVIDERS.map((p) => (
                          <a
                            key={p.name}
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1 text-[10px] text-slate-300 hover:bg-white/10"
                          >
                            {p.name} <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resending || resendCooldown > 0}
                        className="flex items-center gap-1 text-violet-300 hover:text-white disabled:opacity-40"
                      >
                        {resending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend"}
                      </button>
                      {timeLeft <= 0 && <span className="text-red-400">Expired</span>}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button asChild className="flex-1 bg-violet-600 hover:bg-violet-500">
                        <Link href={`/auth/reset-password?email=${encodeURIComponent(email)}`}>
                          <KeyRound className="mr-2 h-4 w-4" /> Enter code
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10">
                        <Link href="/login">Back to login</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                      <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="text-slate-300">Email address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            setError("")
                          }}
                          required
                          autoFocus
                          className="border-white/10 bg-black/30 pl-9 text-white placeholder:text-slate-500"
                        />
                      </div>
                      {email.length > 0 && (
                        <p className={`text-[11px] ${isValidEmail(email) ? "text-emerald-400" : "text-amber-400"}`}>
                          {isValidEmail(email) ? "✓ Valid email format" : "Enter a valid email"}
                        </p>
                      )}
                    </div>

                    <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-500" disabled={loading || !isValidEmail(email)}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                      {loading ? "Sending..." : "Send recovery email"}
                    </Button>

                    <div className="rounded-xl border border-white/10 bg-black/20">
                      <button
                        type="button"
                        onClick={() => setFaqOpen((v) => !v)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs text-slate-300"
                      >
                        <span className="flex items-center gap-1.5">
                          <HelpCircle className="h-3.5 w-3.5" /> Didn&apos;t receive the email?
                        </span>
                        <ChevronDown className={`h-4 w-4 transition ${faqOpen ? "rotate-180" : ""}`} />
                      </button>
                      {faqOpen && (
                        <div className="border-t border-white/10 px-4 py-2.5 text-[11px] text-slate-400 space-y-1">
                          <p>• Check spam / promotions folders</p>
                          <p>• Use the email registered with {BRAND}</p>
                          <p>• Wait 1–2 minutes for delivery</p>
                        </div>
                      )}
                    </div>

                    <Button asChild variant="ghost" className="w-full text-slate-400 hover:bg-white/5 hover:text-white">
                      <Link href="/login"><ArrowLeft className="mr-2 h-4 w-4" /> Back to login</Link>
                    </Button>
                  </form>
                )}

                <p className="mt-4 text-center text-[10px] text-slate-500">
                  <Link href="/terms" className="text-violet-300 hover:underline">Terms</Link>
                  {" · "}
                  <Link href="/privacy" className="hover:underline">Privacy</Link>
                </p>
              </div>
            </div>

            {/* Right column bottom accent — fills visual weight */}
            <div className="mt-6 hidden gap-3 sm:grid sm:grid-cols-3 lg:grid">
              {[
                { label: "Delivery", value: "< 2 min" },
                { label: "Security", value: "Encrypted" },
                { label: "Support", value: "24/7" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center backdrop-blur-sm">
                  <p className="text-[10px] text-slate-500">{s.label}</p>
                  <p className="text-xs font-semibold text-violet-200">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
