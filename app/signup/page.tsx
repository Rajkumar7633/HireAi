"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Eye, EyeOff, Mail, Lock, User as UserIcon, CheckCircle2, XCircle, Info } from "lucide-react"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [particleCount, setParticleCount] = useState(200)
  const [strength, setStrength] = useState(0)
  const [emailTouched, setEmailTouched] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const router = useRouter()

  // Brand color for background accents
  const brandColor = process.env.NEXT_PUBLIC_BRAND_COLOR || "#6d28d9"

  // 3D background (students avatars) + particles
  const Hero3D = dynamic(() => import("@/components/Hero3DPure"), { ssr: false })
  const useStudents = (process.env.NEXT_PUBLIC_SIGNUP_3D_USE_STUDENTS === '1' || process.env.NEXT_PUBLIC_SIGNUP_3D_USE_STUDENTS === 'true' || true)

  useEffect(() => {
    const calc = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1200
      setParticleCount(w < 768 ? 100 : w < 1024 ? 150 : 210)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  // Persist Accept Terms in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('signup:acceptTerms')
      if (saved === 'true') setAcceptTerms(true)
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('signup:acceptTerms', acceptTerms ? 'true' : 'false')
    } catch {}
  }, [acceptTerms])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!name || !email || !password || !role) {
      setError("All fields are required")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (!acceptTerms) {
      setError("You must accept the Terms and Privacy Policy to continue")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, role }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store token in localStorage as backup
        localStorage.setItem("auth-token", data.token)

        // Redirect based on role
        if (data.user.role === "recruiter") {
          router.push("/dashboard/recruiter")
        } else if (data.user.role === "job_seeker") {
          router.push("/dashboard/job-seeker")
        } else {
          router.push("/dashboard")
        }
      } else {
        setError(data.message || "Signup failed")
      }
    } catch (err) {
      console.error("Signup error:", err)
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-indigo-100 via-white to-purple-100">
      {/* Background: 3D + particles + subtle grid */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-95">
          <Hero3D brandColor={brandColor} offsetX={-1.0} modelUrl={""} useCoder={false} useStudents={true} />
        </div>
        <div className="absolute inset-0">
          <CanvasParticles count={particleCount} />
        </div>
        {/* New: halo rings */}
        <HaloRings brandColor={brandColor} />
        {/* New: abstract stack layers */}
        <StackLayers brandColor={brandColor} />
        {/* New: comet streaks */}
        <CometStreaks baseHue={brandHue(brandColor)} count={16} />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(0deg,transparent_24%,rgba(0,0,0,0.7)_25%,rgba(0,0,0,0.7)_26%,transparent_27%,transparent_74%,rgba(0,0,0,0.7)_75%,rgba(0,0,0,0.7)_76%,transparent_77%),linear-gradient(90deg,transparent_24%,rgba(0,0,0,0.7)_25%,rgba(0,0,0,0.7)_26%,transparent_27%,transparent_74%,rgba(0,0,0,0.7)_75%,rgba(0,0,0,0.7)_76%,transparent_77%)] bg-[length:3rem_3rem]" />
        <div className="absolute inset-0 bg-[radial-gradient(100%_60%_at_50%_50%,transparent,rgba(0,0,0,0.08))]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1200px] grid-cols-1 md:grid-cols-12 gap-10 px-4 sm:px-8 lg:px-12 py-12 md:py-16">
        {/* Left composition space */}
        <div className="hidden md:block md:col-span-6" />

        {/* Signup Card */}
        <div className="md:col-span-6 flex items-center justify-center">
          <div className="rounded-3xl p-[2px] bg-gradient-to-r from-indigo-600 to-fuchsia-500/60 shadow-2xl w-full max-w-2xl">
            <Card className="w-full bg-white/90 backdrop-blur-xl border border-white/40 shadow-xl ring-1 ring-white/20 overflow-hidden rounded-[24px]">
              <CardHeader>
                <CardTitle className="text-3xl md:text-4xl font-extrabold text-center tracking-tight">Create your account</CardTitle>
                <CardDescription className="text-center text-sm md:text-base">Sign up to get started with HireAI</CardDescription>
              </CardHeader>
              <CardContent className="pb-10 px-10 md:px-12">
                <div className="grid gap-10 md:gap-12 md:grid-cols-2 items-start">
                  {/* Benefits column */}
                  <div className="hidden md:block pt-2">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Why join HireAI</h3>
                    <ul className="space-y-3 text-gray-700 leading-relaxed">
                      <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-indigo-600" /><span>Smart candidate matching and AI-powered screening</span></li>
                      <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-indigo-600" /><span>Track applications and manage communication in one place</span></li>
                      <li className="flex items-start gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-indigo-600" /><span>Built-in assessments with instant insights</span></li>
                    </ul>
                  </div>
                  {/* Form column */}
                  <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-700/70"><UserIcon className="h-4 w-4" /></div>
                <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Enter your full name" className="h-12 text-[15px] pl-9 bg-white text-gray-900 placeholder-gray-400 border border-gray-300" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-700/70"><Mail className="h-4 w-4" /></div>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={()=>setEmailTouched(true)} required placeholder="Enter your email" className="h-12 text-[15px] pl-9 pr-9 bg-white text-gray-900 placeholder-gray-400 border border-gray-300" />
                {email && (isValidEmail(email) ? (
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-green-600"><CheckCircle2 className="h-4 w-4" /></div>
                ) : emailTouched ? (
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-red-600"><XCircle className="h-4 w-4" /></div>
                ) : null)}
              </div>
              {!isValidEmail(email) && emailTouched && (
                <p className="text-xs text-red-600">Please enter a valid email address</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="password" className="mb-0">Password</Label>
                <Info className="h-3.5 w-3.5 text-gray-500" title="Use 12+ characters with uppercase, numbers, and symbols for a strong password" />
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-700/70"><Lock className="h-4 w-4" /></div>
                <Input id="password" type={showPassword?"text":"password"} value={password} onChange={(e) => { setPassword(e.target.value); setStrength(calcStrength(e.target.value)); }} required placeholder="Create a password" minLength={6} className="h-12 text-[15px] pl-9 pr-12 bg-white text-gray-900 placeholder-gray-400 border border-gray-300" />
                <button type="button" onClick={() => setShowPassword(v=>!v)} className="absolute inset-y-0 right-3 flex items-center text-gray-600 hover:text-gray-900">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength meter */}
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0,1,2,3,4].map((i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded ${i <= strength-1 ? (strength<=2 ? 'bg-red-500' : strength===3 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-300'}`} />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-gray-600">
                  {strength <= 1 ? 'Very weak' : strength === 2 ? 'Weak' : strength === 3 ? 'Good' : 'Strong'} password
                </p>
                {/* Requirements checklist */}
                <ul className="mt-2 text-[11px] space-y-1">
                  <li className="flex items-center gap-2"><CheckCircle2 className={`h-3.5 w-3.5 ${password.length>=8 ? 'text-green-600' : 'text-gray-400'}`} /><span className={`${password.length>=8 ? 'text-green-700' : 'text-gray-600'}`}>At least 8 characters</span></li>
                  <li className="flex items-center gap-2"><CheckCircle2 className={`h-3.5 w-3.5 ${/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400'}`} /><span className={`${/[A-Z]/.test(password) ? 'text-green-700' : 'text-gray-600'}`}>One uppercase letter</span></li>
                  <li className="flex items-center gap-2"><CheckCircle2 className={`h-3.5 w-3.5 ${/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`} /><span className={`${/[0-9]/.test(password) ? 'text-green-700' : 'text-gray-600'}`}>One number</span></li>
                  <li className="flex items-center gap-2"><CheckCircle2 className={`h-3.5 w-3.5 ${/[^A-Za-z0-9]/.test(password) ? 'text-green-600' : 'text-gray-400'}`} /><span className={`${/[^A-Za-z0-9]/.test(password) ? 'text-green-700' : 'text-gray-600'}`}>One special character</span></li>
                </ul>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-700/70"><Lock className="h-4 w-4" /></div>
                <Input id="confirm" type={showPassword?"text":"password"} value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} onBlur={()=>setConfirmTouched(true)} required placeholder="Re-enter your password" minLength={6} className="h-12 text-[15px] pl-9 pr-12 bg-white text-gray-900 placeholder-gray-400 border border-gray-300" />
                <button type="button" onClick={() => setShowPassword(v=>!v)} className="absolute inset-y-0 right-3 flex items-center text-gray-600 hover:text-gray-900">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-600">Passwords do not match</p>
              )}
              {confirmPassword && confirmPassword === password && (
                <p className="text-xs text-green-600">Passwords match</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">I am a</Label>
              <Select value={role} onValueChange={setRole} required>
                <SelectTrigger className="h-12 text-[15px] bg-white text-gray-900 border border-gray-300">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="job_seeker">Job Seeker</SelectItem>
                  <SelectItem value="recruiter">Recruiter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Accept terms */}
            <div className="flex items-start gap-2 pt-2">
              <input id="terms" type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300" checked={acceptTerms} onChange={(e)=>setAcceptTerms(e.target.checked)} />
              <label htmlFor="terms" className="text-sm text-gray-700">I agree to the <Link href="/terms" className="text-indigo-700 hover:text-indigo-600 font-semibold">Terms</Link> and <Link href="/privacy" className="text-indigo-700 hover:text-indigo-600 font-semibold">Privacy Policy</Link>.</label>
            </div>

            <Button type="submit" className="w-full h-12 text-[16px] bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white hover:from-indigo-700 hover:to-fuchsia-700 shadow-md" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
                </form>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-700">
                    Already have an account?{" "}
                    <Link href="/login" className="font-semibold text-indigo-700 hover:text-indigo-600">
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Lightweight particles backdrop used on signup
function CanvasParticles({ count = 200 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let w = (canvas.width = canvas.offsetWidth)
    let h = (canvas.height = canvas.offsetHeight)
    const onResize = () => { w = canvas.width = canvas.offsetWidth; h = canvas.height = canvas.offsetHeight }

    type P = { x:number; y:number; vx:number; vy:number; r:number }
    const particles: P[] = Array.from({ length: count }).map(() => ({
      x: Math.random()*w, y: Math.random()*h,
      vx: (Math.random()-0.5)*0.35, vy: (Math.random()-0.5)*0.35,
      r: Math.random()*1.6+0.6,
    }))

    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      ctx.clearRect(0,0,w,h)
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy
        if (p.x < -10) p.x = w+10; if (p.x > w+10) p.x = -10
        if (p.y < -10) p.y = h+10; if (p.y > h+10) p.y = -10
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fillStyle = 'rgba(99,102,241,0.25)'; ctx.fill()
      }
      for (let i=0;i<particles.length;i++) {
        for (let j=i+1;j<particles.length;j++) {
          const a=particles[i], b=particles[j]
          const dx=a.x-b.x, dy=a.y-b.y, d2=dx*dx+dy*dy
          if (d2 < 130*130) {
            const alpha = 1 - d2/(130*130)
            ctx.strokeStyle = `rgba(88,28,135,${0.14*alpha})`
            ctx.lineWidth = 1
            ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke()
          }
        }
      }
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [count])

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />
}

// Very small password strength estimator (0-4)
function calcStrength(pw: string): number {
  let s = 0
  if (pw.length >= 6) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (pw.length >= 12) s++
  return Math.min(4, s)
}

// Simple email validator used for UI feedback
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Decorative: concentric emissive halo rings with subtle breathing
function HaloRings({ brandColor }: { brandColor: string }) {
  return (
    <div className="absolute inset-0 flex items-center">
      <div className="relative left-[-12%] hidden md:block" aria-hidden>
        <div className="absolute -translate-y-1/2 top-1/2 w-[46vmax] h-[46vmax] rounded-full animate-[halo_8s_ease-in-out_infinite]" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: brandColor + '4D' }} />
        <div className="absolute -translate-y-1/2 top-1/2 w-[38vmax] h-[38vmax] rounded-full animate-[halo_9s_ease-in-out_infinite_reverse]" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: brandColor + '33' }} />
        <div className="absolute -translate-y-1/2 top-1/2 w-[30vmax] h-[30vmax] rounded-full animate-[halo_7s_ease-in-out_infinite]" style={{ borderWidth: 1, borderStyle: 'solid', borderColor: brandColor + '26' }} />
        <style jsx global>{`
          @keyframes halo { 0%,100%{ transform: translateY(-50%) scale(1); } 50%{ transform: translateY(-50%) scale(1.06);} }
        `}</style>
      </div>
    </div>
  )
}

// Decorative: abstract stack layers panels floating subtly
function StackLayers({ brandColor }: { brandColor: string }) {
  return (
    <div className="absolute inset-0" aria-hidden>
      <div className="hidden md:block absolute right-[6%] top-[16%] w-[22rem] h-[14rem] rotate-[-6deg] rounded-2xl backdrop-blur-md shadow-xl animate-[float_10s_ease-in-out_infinite]" style={{ backgroundColor: brandColor + '22', border: `1px solid ${brandColor}40` }} />
      <div className="hidden md:block absolute right-[10%] top-[34%] w-[18rem] h-[11rem] rotate-[4deg] rounded-2xl backdrop-blur-md shadow-xl animate-[float_12s_ease-in-out_infinite_reverse]" style={{ backgroundColor: brandColor + '1f', border: `1px solid ${brandColor}33` }} />
      <div className="hidden md:block absolute right-[2%] top-[52%] w-[24rem] h-[12rem] rotate-[-3deg] rounded-2xl backdrop-blur-md shadow-xl animate-[float_11s_ease-in-out_infinite]" style={{ backgroundColor: brandColor + '29', border: `1px solid ${brandColor}40` }} />
      <style jsx global>{`
        @keyframes float { 0%,100%{ transform: translateY(0) rotate(var(--rot,0)); } 50%{ transform: translateY(-10px) rotate(var(--rot,0)); } }
      `}</style>
    </div>
  )
}

// Decorative: slow comet streaks canvas
function CometStreaks({ count = 12, baseHue = 260 }: { count?: number; baseHue?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return; const ctx = c.getContext('2d'); if (!ctx) return
    let w = c.width = c.offsetWidth; let h = c.height = c.offsetHeight
    const onResize = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight }
    type S = { x:number;y:number;vx:number;vy:number;len:number;hue:number }
    const comets: S[] = Array.from({length: count}).map(()=>({
      x: Math.random()*w, y: Math.random()*h,
      vx: -0.6 - Math.random()*0.6, vy: 0.15 + Math.random()*0.25,
      len: 50 + Math.random()*90, hue: baseHue + (Math.random()*30 - 15)
    }))
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      ctx.clearRect(0,0,w,h)
      for (const s of comets) {
        const nx = s.x + s.vx; const ny = s.y + s.vy
        const dx = -s.vx; const dy = -s.vy; const mag = Math.hypot(dx,dy) || 1
        const ux = dx/mag, uy = dy/mag
        const ex = nx + ux*s.len, ey = ny + uy*s.len
        const grad = ctx.createLinearGradient(nx,ny,ex,ey)
        grad.addColorStop(0, `hsla(${s.hue},90%,70%,0.0)`) ; grad.addColorStop(1, `hsla(${s.hue},90%,70%,0.35)`)
        ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx,ny); ctx.lineTo(ex,ey); ctx.stroke()
        s.x = nx; s.y = ny
        if (s.x < -100 || s.y > h+100) { s.x = w + Math.random()*100; s.y = -Math.random()*100 }
      }
    }
    raf = requestAnimationFrame(loop)
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [count])
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />
}

// Utility: approximate brand hue from hex color
function brandHue(hex: string): number {
  try {
    const h = hex.replace('#','')
    const r = parseInt(h.substring(0,2),16)/255
    const g = parseInt(h.substring(2,4),16)/255
    const b = parseInt(h.substring(4,6),16)/255
    const max = Math.max(r,g,b), min = Math.min(r,g,b)
    let hue = 0; const d = max - min
    if (d === 0) hue = 0
    else if (max === r) hue = ((g-b)/d) % 6
    else if (max === g) hue = (b-r)/d + 2
    else hue = (r-g)/d + 4
    hue = Math.round(hue * 60)
    if (hue < 0) hue += 360
    return hue
  } catch { return 260 }
}
