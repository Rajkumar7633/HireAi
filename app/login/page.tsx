"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "@/hooks/use-session";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, Shield, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tilt, setTilt] = useState<{rx: number; ry: number}>({ rx: 0, ry: 0 });
  const [particleCount, setParticleCount] = useState(260);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { refreshSession, user } = useSession() as any;
  const brandColor = (user?.recruiter?.brandColor as string) || process.env.NEXT_PUBLIC_BRAND_COLOR || "#6d28d9";
  const accentColor = (user?.recruiter?.accentColor as string) || process.env.NEXT_PUBLIC_ACCENT_COLOR || "#eef2ff";
  const companyName = (user?.recruiter?.companyName as string) || process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI";
  const Hero3D = dynamic(() => import("@/components/Hero3DPure"), { ssr: false });
  // Force the classic chain background: disable GLB and coder illustrators without requiring env restart
  const modelUrl = "";
  const modelScale = 1.2;
  const modelRotationY = 0;
  const modelY = 0;
  const useCoder = false;
  const modelUrlFinal = '';
  const useStudents = (process.env.NEXT_PUBLIC_LOGIN_3D_USE_STUDENTS === '1' || process.env.NEXT_PUBLIC_LOGIN_3D_USE_STUDENTS === 'true');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log("[v0] Starting login process...");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log("[v0] Login response:", {
        ok: response.ok,
        role: data.user?.role,
      });

      if (response.ok) {
        localStorage.setItem("auth-token", data.token);

        await new Promise((resolve) => setTimeout(resolve, 100));

        console.log("[v0] Refreshing session after login...");
        await refreshSession();

        await new Promise((resolve) => setTimeout(resolve, 200));

        if (data.user.role === "recruiter") {
          console.log("[v0] Redirecting recruiter to dashboard...");
          router.push("/dashboard/recruiter");
        } else if (data.user.role === "job_seeker") {
          console.log("[v0] Redirecting job seeker to dashboard...");
          router.push("/dashboard/job-seeker");
        } else {
          console.log("[v0] Redirecting to general dashboard...");
          router.push("/dashboard");
        }
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role: "recruiter" | "job_seeker") => {
    if (role === "recruiter") {
      setEmail("recruiter@demo.com");
      setPassword("demo123");
    } else {
      setEmail("jobseeker@demo.com");
      setPassword("demo123");
    }
  };

  // Responsive particle density
  useEffect(() => {
    const calc = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1200;
      setParticleCount(w < 768 ? 110 : w < 1024 ? 160 : 220);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-indigo-100 via-white to-purple-100">
      {/* Global background fill: 3D + particles + radial glows + subtle grid */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Fullscreen 3D hero (nudged further left) */}
        <div className="absolute inset-0 opacity-95">
          <Hero3D brandColor={brandColor} offsetX={-1.05} modelUrl={modelUrlFinal} modelScale={modelScale} modelRotationY={modelRotationY} modelY={modelY} useCoder={useCoder} useStudents={useStudents} />
        </div>
        {/* Fullscreen particles */}
        <div className="absolute inset-0">
          <CanvasParticles brandColor={brandColor} count={particleCount} />
        </div>
        <div className="absolute -left-40 top-[-10%] h-[60vmax] w-[60vmax] rounded-full" style={{ background: `radial-gradient(circle at center, ${brandColor}30, transparent 60%)` }} />
        <div className="absolute right-[-20%] bottom-[-10%] h-[55vmax] w-[55vmax] rounded-full" style={{ background: `radial-gradient(circle at center, ${accentColor}40, transparent 60%)` }} />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(0deg,transparent_24%,rgba(0,0,0,0.7)_25%,rgba(0,0,0,0.7)_26%,transparent_27%,transparent_74%,rgba(0,0,0,0.7)_75%,rgba(0,0,0,0.7)_76%,transparent_77%),linear-gradient(90deg,transparent_24%,rgba(0,0,0,0.7)_25%,rgba(0,0,0,0.7)_26%,transparent_27%,transparent_74%,rgba(0,0,0,0.7)_75%,rgba(0,0,0,0.7)_76%,transparent_77%)] bg-[length:3rem_3rem]" />
        {/* Soft vignette for contrast (slightly softer) */}
        <div className="absolute inset-0 bg-[radial-gradient(100%_60%_at_50%_50%,transparent,rgba(0,0,0,0.09))]" />
        {/* Film grain (reduced) */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: `url('data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"120\" height=\"120\" viewBox=\"0 0 120 120\"><filter id=\"n\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"2\" stitchTiles=\"stitch\"/></filter><rect width=\"120\" height=\"120\" filter=\"url(#n)\" opacity=\"0.3\"/></svg>`)}')`,
          backgroundRepeat: 'repeat'
        }} />
      </div>
      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 md:grid-cols-2 gap-8 px-4 sm:px-6 lg:px-10 py-12" style={{ ['--brand' as any]: brandColor }}>
        
        {/* Middle soft divider */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-white/60 to-transparent shadow-[0_0_24px_4px_rgba(0,0,0,0.15)]" />
        {/* Left column shows animation only */}
        <div className="hidden md:block" />
        {/* Right: Auth card */}
        <div className="flex items-center justify-center md:justify-end">
          <div
            onMouseMove={(e) => {
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width - 0.5;
              const y = (e.clientY - rect.top) / rect.height - 0.5;
              setTilt({ rx: y * -6, ry: x * 6 });
            }}
            onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
            style={{
              transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
              transition: "transform 120ms ease-out",
            }}
          >
          <div className="rounded-3xl p-[2px] bg-gradient-to-r from-[var(--brand)] to-fuchsia-500/50 shadow-2xl">
          <Card className="w-full max-w-4xl bg-white/15 backdrop-blur-xl border border-white/20 shadow-2xl ring-1 ring-white/10 hover:ring-white/20 transition-all will-change-transform overflow-hidden rounded-[22px]">
            <CardHeader>
              {/* Brand lettermark */}
              <div className="mx-auto mb-3 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-extrabold" style={{ background: brandColor }}>
                  {(companyName || "H").slice(0,1).toUpperCase()}
                </div>
                <div className="text-sm font-semibold text-white/90">{companyName}</div>
              </div>
              {/* Playful banner */}
              <div className="relative mb-4 h-24 w-full">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.55"/>
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0.55"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,120 C150,60 250,140 400,90 C550,40 650,120 800,80 L800,0 L0,0 Z" fill="url(#g1)" />
                </svg>
                <div className="absolute left-1/2 -translate-x-1/2 top-4 flex items-center gap-2 rounded-full bg-white/25 px-3 py-1 text-indigo-950 shadow-sm border border-white/30">
                  <Shield className="h-4 w-4 text-indigo-900" />
                  <span className="text-xs font-semibold">Secure Sign In</span>
                </div>
              </div>
              <CardTitle className="text-3xl font-extrabold text-center tracking-tight">Welcome back</CardTitle>
              <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent className="pb-12 px-10 md:px-16">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-700/70">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={() => window.dispatchEvent(new CustomEvent('login-typing'))}
                      required
                      placeholder="Enter your email"
                      className="pl-9 h-11 text-base transition-all duration-200 focus:scale-[1.01] bg-white/40 backdrop-blur-sm border-white/30 placeholder:text-gray-600 focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-700/70">
                      <Lock className="h-4 w-4" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={() => window.dispatchEvent(new CustomEvent('login-typing'))}
                      required
                      placeholder="Enter your password"
                      className="pl-9 h-11 text-base transition-all duration-200 focus:scale-[1.01] bg-white/40 backdrop-blur-sm border-white/30 placeholder:text-gray-600 focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-700/70 hover:text-gray-900"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me and Forgot password */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-700/90">
                    <input type="checkbox" className="h-4 w-4 rounded border-white/40 bg-white/40" />
                    Remember me
                  </label>
                  <a href="#" className="text-blue-600 hover:underline">Forgot password?</a>
                </div>

                <Button type="submit" className="w-full h-11 text-base transition-transform active:scale-[0.99] hover:shadow-2xl bg-[var(--brand)] hover:opacity-90 text-white font-semibold tracking-wide" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                {/* Social sign in */}
                <div className="pt-3 border-t border-white/20">
                  <p className="text-center text-xs text-gray-700/80 mb-2">Or continue with</p>
                  <div className="flex gap-2 justify-center">
                    <button type="button" className="px-4 py-2 rounded-md bg-white/40 backdrop-blur-sm border border-white/30 text-xs font-semibold hover:bg-white/60 transition">Google</button>
                    <button type="button" className="px-4 py-2 rounded-md bg-white/40 backdrop-blur-sm border border-white/30 text-xs font-semibold hover:bg-white/60 transition">GitHub</button>
                  </div>
                </div>
              </form>

              <div className="mt-6 space-y-2">
                <p className="text-sm text-gray-600 text-center">Demo Accounts:</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent transition-transform active:scale-[0.99]"
                    onClick={() => fillDemoCredentials("recruiter")}
                  >
                    Use Recruiter Demo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-transparent transition-transform active:scale-[0.99]"
                    onClick={() => fillDemoCredentials("job_seeker")}
                  >
                    Use Job Seeker Demo
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center text-xs text-gray-600/90">
                <p>
                  By continuing you agree to our <a className="text-blue-600 hover:underline" href="#">Terms</a> and <a className="text-blue-600 hover:underline" href="#">Privacy</a>.
                </p>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
                    Sign up
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
          </div>
          </div>
        </div>
      </div>

      {/* Local styles for animations and stickers */}
      <style jsx>{`
        @keyframes floaty {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes tilt {
          0% { transform: perspective(800px) rotateX(6deg) rotateY(-8deg) translateZ(0); }
          50% { transform: perspective(800px) rotateX(8deg) rotateY(-10deg) translateZ(6px); }
          100% { transform: perspective(800px) rotateX(6deg) rotateY(-8deg) translateZ(0); }
        }
        @keyframes tiltSlow {
          0% { transform: perspective(800px) rotateX(-8deg) rotateY(10deg) translateZ(0); }
          50% { transform: perspective(800px) rotateX(-6deg) rotateY(8deg) translateZ(8px); }
          100% { transform: perspective(800px) rotateX(-8deg) rotateY(10deg) translateZ(0); }
        }
        .animate-tilt { animation: tilt 8s ease-in-out infinite; }
        .animate-tilt-slow { animation: tiltSlow 10s ease-in-out infinite; }
        .sticker { position:absolute; font-size:28px; filter: drop-shadow(0 8px 16px rgba(0,0,0,0.25)); animation: floaty 6s ease-in-out infinite; }
        .sticker-a { top: 36px; right: 40px; }
        .sticker-b { top: 120px; left: 40px; animation-delay: 0.6s; }
        .sticker-c { bottom: 130px; left: 90px; animation-delay: 1.2s; }
        .sticker-d { bottom: 36px; right: 80px; animation-delay: 1.8s; }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(20px, -30px) scale(1.05); }
          66% { transform: translate(-10px, 20px) scale(0.98); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob { animation: blob 12s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>

      {/* Lottie web component loader */}
      <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
    </div>
  );
}

function CanvasParticles({ brandColor, count }: { brandColor?: string; count?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = (canvas.width = canvas.offsetWidth);
    let h = (canvas.height = canvas.offsetHeight);

    const onResize = () => {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current.x = (e.clientX - rect.left) / rect.width - 0.5;
      mouse.current.y = (e.clientY - rect.top) / rect.height - 0.5;
    };

    const particles: { x: number; y: number; vx: number; vy: number; r: number; hue: number; boost?: number }[] = [];
    const COUNT = Math.max(20, Math.min(400, count ?? 110)); // configurable density

    // Convert hex brand color to hue fallback ~270 (indigo)
    const hex = (brandColor || "#6d28d9").replace('#','');
    const r = parseInt(hex.substring(0,2) || '6d', 16) / 255;
    const g = parseInt(hex.substring(2,4) || '28', 16) / 255;
    const b = parseInt(hex.substring(4,6) || 'd9', 16) / 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let hHue = 0; const d = max - min;
    if (d === 0) hHue = 0; else if (max === r) hHue = ((g-b)/d) % 6; else if (max === g) hHue = (b-r)/d + 2; else hHue = (r-g)/d + 4;
    hHue = Math.round((hHue*60 + 360) % 360) || 270;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: 1.6 + Math.random() * 2.0,
        hue: (hHue + (Math.random()*30 - 15) + 360) % 360,
        boost: 0,
      });
    }

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx + mouse.current.x * 0.3;
        p.y += p.vy + mouse.current.y * 0.3;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        ctx.beginPath();
        const radius = p.r + (p.boost || 0);
        p.boost = Math.max(0, (p.boost || 0) * 0.92); // decay
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 85%, 60%, 0.85)`;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 140 * 140) {
            const alpha = 1 - d2 / (140 * 140);
            ctx.strokeStyle = `rgba(255,255,255,${0.25 * alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    };

    window.addEventListener('resize', onResize);
    canvas.addEventListener('mousemove', onMouseMove);
    const onType = () => {
      // Pulse a handful of particles near the center
      for (let i = 0; i < particles.length; i += Math.floor(Math.random()*8)+7) {
        particles[i].boost = 1.6;
      }
    };
    window.addEventListener('login-typing', onType as any);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('login-typing', onType as any);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0">
      <canvas ref={ref} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
