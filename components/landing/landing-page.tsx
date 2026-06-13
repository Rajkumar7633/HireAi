"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Code2,
  GraduationCap,
  Handshake,
  LineChart,
  Menu,
  MessageSquare,
  Mic,
  Shield,
  Sparkles,
  Target,
  Users,
  Video,
  X,
  Zap,
  Bell,
  FileText,
} from "lucide-react"

const NAV_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#features", label: "Features" },
  { href: "#roles", label: "For Teams" },
  { href: "#campus", label: "Campus Drives" },
  { href: "#how-it-works", label: "How it works" },
]

const STATS = [
  { value: "4", label: "User roles" },
  { value: "250+", label: "API endpoints" },
  { value: "AI", label: "Matching & coaching" },
  { value: "24/7", label: "Proctored tests" },
]

const ROLE_CARDS = [
  {
    icon: Users,
    title: "Job Seekers",
    color: "from-violet-500 to-purple-600",
    items: [
      "AI resume builder & ATS analysis",
      "Skill gap analyzer with learning paths",
      "Interview coach & mock interviews",
      "Coding tests with live Monaco editor",
      "Campus drive applications",
      "Job matches & application tracking",
    ],
    cta: "Find opportunities",
    href: "/signup",
  },
  {
    icon: Briefcase,
    title: "Recruiters",
    color: "from-indigo-500 to-blue-600",
    items: [
      "AI candidate matching & screening",
      "Create & assign coding assessments",
      "Test analytics & leaderboards",
      "Campus Drive Hub — propose to colleges",
      "Video interviews & scorecards",
      "Offer letters & talent pool",
    ],
    cta: "Hire smarter",
    href: "/signup",
  },
  {
    icon: GraduationCap,
    title: "Colleges",
    color: "from-purple-500 to-fuchsia-600",
    items: [
      "Campus drives & company partnerships",
      "Student onboarding & bulk operations",
      "Placement analytics & readiness",
      "Assign tests to batches",
      "Multi-year student tracking",
      "Leaderboards & placement reports",
    ],
    cta: "Run placements",
    href: "/signup",
  },
]

const FEATURES = [
  {
    icon: Bot,
    title: "AI-Powered Matching",
    description: "Match candidates to roles using skills, experience, and JD analysis — not just keywords.",
  },
  {
    icon: Code2,
    title: "Live Coding Tests",
    description: "Monaco editor, Judge0 execution, proctoring, and recruiter analytics with deduped leaderboards.",
  },
  {
    icon: Target,
    title: "Skill Gap Analyzer",
    description: "Role-based readiness scores, radar charts, and personalized learning roadmaps for candidates.",
  },
  {
    icon: Mic,
    title: "Interview Coach",
    description: "STAR framework practice, filler detection, AI questions, and session history.",
  },
  {
    icon: Handshake,
    title: "Campus Drive Hub",
    description: "Bidirectional proposals between recruiters and colleges — discover, propose, confirm, publish.",
  },
  {
    icon: Video,
    title: "Video Interviews",
    description: "Schedule, join rooms, collect structured scorecards, and track hiring decisions.",
  },
  {
    icon: Shield,
    title: "Proctored Assessments",
    description: "Violation detection, environment scans, and secure test delivery at scale.",
  },
  {
    icon: Bell,
    title: "Notification Center",
    description: "Real-time alerts with deep links, categories, bulk actions, and SSE updates.",
  },
  {
    icon: LineChart,
    title: "Advanced Analytics",
    description: "Hiring funnels, placement readiness, test KPIs, and exportable reports.",
  },
]

const STEPS = [
  { step: "01", title: "Sign up by role", desc: "Job seeker, recruiter, college admin, or platform admin." },
  { step: "02", title: "Build your profile", desc: "Resume, company branding, or student batch data." },
  { step: "03", title: "Match & assess", desc: "AI matching, coding tests, interviews, campus proposals." },
  { step: "04", title: "Hire & place", desc: "Offers, partnerships, live campus drives for students." },
]

const TESTIMONIALS = [
  {
    quote: "Campus Drive Hub cut our placement coordination time in half. Recruiters and colleges finally speak the same language.",
    role: "Placement Officer",
    org: "Engineering College",
  },
  {
    quote: "Coding test analytics with deduped candidates gave us a clean leaderboard — no more duplicate rows for the same person.",
    role: "Technical Recruiter",
    org: "Enterprise IT Services",
  },
  {
    quote: "Skill gap and interview coach helped our students prepare before assessments — readiness scores went up noticeably.",
    role: "Career Services",
    org: "University Program",
  },
]

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 overflow-x-hidden">
      {/* Background mesh */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-purple-400/20 blur-3xl" />
        <div className="absolute top-1/3 -left-32 h-[500px] w-[500px] rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-300/10 blur-3xl" />
      </div>

      {/* Navbar */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-white/90 backdrop-blur-lg shadow-sm border-b border-slate-200/80" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-shadow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Hire<span className="text-violet-600">AI</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Button variant="ghost" asChild className="text-slate-700">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-500/20"
            >
              <Link href="/signup">
                Get started free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <button
            type="button"
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t bg-white px-4 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="block py-2 text-slate-700 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="outline" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="bg-violet-600">
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative px-4 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <Badge className="mb-6 bg-violet-100 text-violet-700 hover:bg-violet-100 border-violet-200 px-4 py-1.5">
                AI recruitment & campus placement platform
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                Hire talent.{" "}
                <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Place students.
                </span>{" "}
                One intelligent platform.
              </h1>
              <p className="text-lg text-slate-600 mb-8 max-w-xl leading-relaxed">
                HireAI connects job seekers, recruiters, and college placement cells with AI matching,
                proctored coding tests, campus drive workflows, interview coaching, and real-time analytics.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <Button
                  size="lg"
                  asChild
                  className="h-12 px-8 text-base bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25"
                >
                  <Link href="/signup">
                    Start for free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base border-slate-300 bg-white/80">
                  <Link href="/login">Sign in to dashboard</Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                {["OTP-secured login", "Role-based dashboards", "MongoDB + real-time notifications"].map(
                  (item) => (
                    <span key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm shadow-2xl shadow-violet-500/10 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  </div>
                  <Badge variant="outline" className="text-xs">HireAI Dashboard</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "Match score", value: "87%", color: "text-emerald-600" },
                    { label: "Tests assigned", value: "124", color: "text-violet-600" },
                    { label: "Campus drives", value: "12", color: "text-indigo-600" },
                    { label: "Placements", value: "89%", color: "text-fuchsia-600" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                      <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-600 flex items-center justify-center">
                      <Code2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Coding assessment</p>
                      <p className="text-xs text-slate-500">Monaco · Judge0 · Proctored</p>
                    </div>
                    <Badge className="ml-auto bg-emerald-100 text-emerald-700 text-xs">Live</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Campus Drive Hub</p>
                      <p className="text-xs text-slate-500">College ↔ Recruiter proposals</p>
                    </div>
                    <Badge className="ml-auto bg-amber-100 text-amber-700 text-xs">2 pending</Badge>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-xl bg-white border shadow-lg p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Offer accepted</p>
                  <p className="text-xs text-slate-500">Full-stack developer · EPAM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="text-center rounded-2xl border border-slate-200/80 bg-white/60 backdrop-blur-sm py-6 px-4"
              >
                <p className="text-3xl font-bold text-violet-600">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform tagline */}
      <section id="platform" className="py-16 px-4 border-y border-slate-200/80 bg-white/50">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-600 mb-3">The platform</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything hiring and placement needs — in one place
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            From resume parsing and AI job matching to campus drive proposals, proctored assessments,
            and placement analytics — built for modern teams.
          </p>
        </div>
      </section>

      {/* Role cards */}
      <section id="roles" className="py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 border-violet-200 text-violet-700">Built for every team</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose your path</h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Dedicated dashboards for job seekers, recruiters, college placement cells, and admins.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {ROLE_CARDS.map((role) => (
              <Card
                key={role.title}
                className="group border-slate-200/80 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/5 transition-all duration-300 overflow-hidden"
              >
                <div className={`h-1.5 bg-gradient-to-r ${role.color}`} />
                <CardContent className="p-8">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${role.color} text-white mb-6 shadow-lg`}
                  >
                    <role.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{role.title}</h3>
                  <ul className="space-y-3 mb-8">
                    {role.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <ChevronRight className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-600 transition-colors"
                    asChild
                  >
                    <Link href={role.href}>
                      {role.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="py-24 px-4 bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-violet-500/20 text-violet-200 border-violet-500/30">Capabilities</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Powerful features, production-ready</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              AI, assessments, campus workflows, and analytics — the same tools your team uses inside the dashboard.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-slate-700/80 bg-slate-800/50 p-6 hover:bg-slate-800 hover:border-violet-500/40 transition-all duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-600/20 text-violet-300 mb-4">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campus drives spotlight */}
      <section id="campus" className="py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-purple-100 text-purple-700">Campus Drive Hub</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Recruiters and colleges — connected end to end
              </h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Browse partners, send drive proposals, accept or decline invitations, and auto-publish
                live campus drives for students. Full pipeline: Discover → Propose → Confirm → Publish.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { from: "Recruiter", to: "College", action: "Send proposal → college accepts" },
                  { from: "College", to: "Company", action: "Invite recruiter → company accepts" },
                  { from: "System", to: "Students", action: "Drive goes live → eligible students notified" },
                ].map((flow) => (
                  <div key={flow.action} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-200">
                    <div className="flex items-center gap-2 text-sm font-medium shrink-0">
                      <Building2 className="h-4 w-4 text-violet-600" />
                      {flow.from}
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      {flow.to}
                    </div>
                    <p className="text-sm text-slate-600">{flow.action}</p>
                  </div>
                ))}
              </div>
              <Button asChild className="bg-violet-600 hover:bg-violet-700">
                <Link href="/signup">
                  Explore campus drives
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-white shadow-2xl shadow-violet-500/30">
              <GraduationCap className="h-12 w-12 mb-6 opacity-90" />
              <h3 className="text-2xl font-bold mb-4">Placement cell toolkit</h3>
              <ul className="space-y-3 text-violet-100">
                {[
                  "Company directory & partnership tracking",
                  "Bulk student import & eligibility filters",
                  "Placement analytics & readiness heatmaps",
                  "Test assignment to batches",
                  "Leaderboards & export reports",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How HireAI works</h2>
            <p className="text-slate-600">Four steps from signup to hire or placement.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-violet-300 to-transparent" />
                )}
                <div className="text-4xl font-bold text-violet-100 mb-4">{step.step}</div>
                <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Trusted by hiring & placement teams</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <Card key={t.org} className="border-slate-200 bg-white/80">
                <CardContent className="p-8">
                  <MessageSquare className="h-8 w-8 text-violet-400 mb-4" />
                  <p className="text-slate-700 mb-6 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="font-semibold text-sm">{t.role}</p>
                    <p className="text-xs text-slate-500">{t.org}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700 p-12 md:p-16 text-center text-white shadow-2xl shadow-violet-500/30">
          <Zap className="h-12 w-12 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to transform hiring & placement?</h2>
          <p className="text-violet-100 text-lg mb-8 max-w-xl mx-auto">
            Join HireAI — AI matching, coding tests, campus drives, and analytics in one professional platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild className="h-12 px-8 text-base">
              <Link href="/signup">Create free account</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 px-8 text-base border-white/30 text-white hover:bg-white/10 bg-transparent"
            >
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-950 text-slate-400 py-16 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white">HireAI</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                AI-powered recruitment and campus placement platform. Connect talent, run assessments,
                manage campus drives, and make data-driven hiring decisions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#campus" className="hover:text-white transition-colors">Campus drives</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Get started</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/signup" className="hover:text-white transition-colors">Sign up</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign in</Link></li>
                <li><span className="text-slate-500">Job seeker · Recruiter · College</span></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-slate-800 text-sm">
            <p>© {new Date().getFullYear()} HireAI. All rights reserved.</p>
            <div className="flex items-center gap-2 text-slate-500">
              <FileText className="h-4 w-4" />
              <span>AI recruitment · Campus placement · Proctored assessments</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
