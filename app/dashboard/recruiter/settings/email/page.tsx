"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { buildProfessionalTemplate } from "@/lib/email-templates"
import {
  Loader2,
  Mail,
  Send,
  Settings2,
  Palette,
  Eye,
  Copy,
  CheckCircle2,
  XCircle,
  BarChart3,
  Clock,
  MousePointerClick,
  FileText,
  ExternalLink,
  Server,
  Sparkles,
  RefreshCw,
} from "lucide-react"

interface CompanyBranding {
  name: string
  logoUrl?: string
  description?: string
  website?: string
  brandColor?: string
  emailSignature?: string
  replyToEmail?: string
  defaultCtaUrl?: string
}

interface EmailSettings {
  smtp: { configured: boolean; host: string; user: string; from: string; port: number; secure: boolean }
  autoSendEnabled: boolean
  stats: {
    totalSent: number
    sentThisWeek: number
    totalOpens: number
    totalClicks: number
    openRate: number
  }
}

interface EmailLogRow {
  _id: string
  to: string
  subject: string
  category?: string
  sentAt: string
  opens?: number
  clicks?: number
}

const ENV_TEMPLATE = `SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com`

export default function RecruiterEmailSettingsPage() {
  const { toast } = useToast()
  const [loadingTest, setLoadingTest] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [companyLoading, setCompanyLoading] = useState(true)
  const [savingCompany, setSavingCompany] = useState(false)
  const [logsLoading, setLogsLoading] = useState(true)
  const [to, setTo] = useState("")
  const [testSubject, setTestSubject] = useState("HireAI — SMTP Test")
  const [settings, setSettings] = useState<EmailSettings | null>(null)
  const [logs, setLogs] = useState<EmailLogRow[]>([])
  const [company, setCompany] = useState<CompanyBranding | null>(null)
  const [showPreview, setShowPreview] = useState(true)

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/communication/email/settings")
      if (res.ok) setSettings(await res.json())
    } catch {
      /* ignore */
    } finally {
      setLoadingSettings(false)
    }
  }

  const loadLogs = async () => {
    try {
      const res = await fetch("/api/communication/email/logs?limit=15")
      if (res.ok) {
        const j = await res.json()
        setLogs(j.logs || [])
      }
    } catch {
      /* ignore */
    } finally {
      setLogsLoading(false)
    }
  }

  const loadCompany = async () => {
    try {
      const res = await fetch("/api/company/me")
      const j = await res.json()
      if (!res.ok) throw new Error(j?.message || "Failed to load company")
      setCompany({
        name: j.company?.name || "",
        logoUrl: j.company?.logoUrl || "",
        description: j.company?.description || "",
        website: j.company?.website || "",
        brandColor: j.company?.brandColor || "#6d28d9",
        emailSignature: j.company?.emailSignature || "",
        replyToEmail: j.company?.replyToEmail || "",
        defaultCtaUrl: j.company?.defaultCtaUrl || "",
      })
    } catch (e: unknown) {
      toast({
        title: "Load failed",
        description: e instanceof Error ? e.message : "Could not load branding",
        variant: "destructive",
      })
    } finally {
      setCompanyLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
    loadLogs()
    loadCompany()
  }, [])

  const previewHtml = useMemo(() => {
    if (!company) return ""
    return buildProfessionalTemplate({
      recipientName: "Candidate",
      heading: "Hello",
      messageHtml:
        "This is a <strong>live preview</strong> of how your branded candidate emails appear — with your logo, colors, and signature.",
      ctaUrl: company.defaultCtaUrl || company.website || "https://hireai.example.com",
      ctaLabel: "View Dashboard",
      companyName: company.name || "Your Company",
      companyWebsite: company.website || undefined,
      logoUrl: company.logoUrl || undefined,
      brandColor: company.brandColor || "#6d28d9",
      badge: "Preview",
      signatureHtml: company.emailSignature
        ? `<p style="margin:0">${company.emailSignature.replace(/\n/g, "<br/>")}</p>`
        : undefined,
    })
  }, [company])

  const saveCompany = async () => {
    if (!company) return
    try {
      setSavingCompany(true)
      const res = await fetch("/api/company/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.message || "Failed to save")
      setCompany({ ...company, ...j.company })
      toast({ title: "Branding saved", description: "Email appearance updated." })
    } catch (e: unknown) {
      toast({
        title: "Save failed",
        description: e instanceof Error ? e.message : "Error",
        variant: "destructive",
      })
    } finally {
      setSavingCompany(false)
    }
  }

  const sendTest = async () => {
    try {
      setLoadingTest(true)
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: testSubject,
          ctaUrl: company?.defaultCtaUrl || company?.website,
          ctaLabel: "Open Dashboard",
          name: "Recruiter",
        }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.message || "Failed to send test")
      toast({ title: "Test email sent", description: `Delivered to ${j.to}` })
      loadLogs()
      loadSettings()
    } catch (e: unknown) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Check SMTP settings",
        variant: "destructive",
      })
    } finally {
      setLoadingTest(false)
    }
  }

  const copyEnv = () => {
    navigator.clipboard.writeText(ENV_TEMPLATE)
    toast({ title: "Copied", description: "SMTP env template copied to clipboard." })
  }

  const smtpOk = settings?.smtp?.configured

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-50 via-violet-50/30 to-background">
      {/* Hero */}
      <div className="border-b bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="h-7 w-7 text-violet-600" />
              Email Studio
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              SMTP delivery, branding, signatures, and send analytics for candidate communications
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { loadSettings(); loadLogs() }}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/recruiter/email-templates">
                <FileText className="h-4 w-4 mr-1" />
                Templates
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className={smtpOk ? "border-emerald-200" : "border-amber-200"}>
            <CardContent className="pt-5 flex items-center gap-3">
              {smtpOk ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : <XCircle className="h-8 w-8 text-amber-500" />}
              <div>
                <p className="text-sm font-semibold">{smtpOk ? "SMTP Connected" : "SMTP Not Configured"}</p>
                <p className="text-xs text-muted-foreground">{settings?.smtp?.from || "Set env variables"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <Send className="h-8 w-8 text-violet-600" />
              <div>
                <p className="text-2xl font-bold">{loadingSettings ? "—" : settings?.stats.totalSent ?? 0}</p>
                <p className="text-xs text-muted-foreground">Emails Sent</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{loadingSettings ? "—" : `${settings?.stats.openRate ?? 0}%`}</p>
                <p className="text-xs text-muted-foreground">Open Rate</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <MousePointerClick className="h-8 w-8 text-indigo-600" />
              <div>
                <p className="text-2xl font-bold">{loadingSettings ? "—" : settings?.stats.totalClicks ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* SMTP + Test */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="h-4 w-4 text-violet-600" />
                  SMTP & Test Delivery
                </CardTitle>
                <CardDescription>Verify your mail server and send a branded test email</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant={smtpOk ? "default" : "secondary"}>
                    {smtpOk ? "Configured" : "Not configured"}
                  </Badge>
                  {settings?.smtp?.host && <span className="text-muted-foreground">Host: {settings.smtp.host}</span>}
                  {settings?.smtp?.port && <span className="text-muted-foreground">Port: {settings.smtp.port}</span>}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input type="email" placeholder="Test recipient email" value={to} onChange={(e) => setTo(e.target.value)} />
                  <Input placeholder="Test subject" value={testSubject} onChange={(e) => setTestSubject(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={sendTest} disabled={loadingTest || !to}>
                    {loadingTest ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                    Send Test Email
                  </Button>
                  <Button variant="outline" onClick={copyEnv}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy .env Template
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Branding */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4 text-violet-600" />
                  Company Branding
                </CardTitle>
                <CardDescription>Logo, colors, and signature used in all candidate emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {companyLoading ? (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading…
                  </div>
                ) : (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Company Name</label>
                        <Input value={company?.name || ""} onChange={(e) => setCompany((c) => ({ ...(c || { name: "" }), name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Logo URL</label>
                        <Input placeholder="https://…" value={company?.logoUrl || ""} onChange={(e) => setCompany((c) => ({ ...(c || { name: "" }), logoUrl: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Website</label>
                        <Input placeholder="https://company.com" value={company?.website || ""} onChange={(e) => setCompany((c) => ({ ...(c || { name: "" }), website: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Brand Color</label>
                        <div className="flex gap-2">
                          <Input type="color" className="w-14 h-10 p-1" value={company?.brandColor || "#6d28d9"} onChange={(e) => setCompany((c) => ({ ...(c || { name: "" }), brandColor: e.target.value }))} />
                          <Input value={company?.brandColor || "#6d28d9"} onChange={(e) => setCompany((c) => ({ ...(c || { name: "" }), brandColor: e.target.value }))} />
                        </div>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Reply-To Email</label>
                        <Input type="email" placeholder="recruiting@company.com" value={company?.replyToEmail || ""} onChange={(e) => setCompany((c) => ({ ...(c || { name: "" }), replyToEmail: e.target.value }))} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Default CTA Link</label>
                        <Input placeholder="https://app/dashboard" value={company?.defaultCtaUrl || ""} onChange={(e) => setCompany((c) => ({ ...(c || { name: "" }), defaultCtaUrl: e.target.value }))} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Description</label>
                        <Input value={company?.description || ""} onChange={(e) => setCompany((c) => ({ ...(c || { name: "" }), description: e.target.value }))} />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium">Email Signature</label>
                        <Textarea
                          placeholder="Best regards,\nJane Smith\nSenior Recruiter"
                          className="min-h-20"
                          value={company?.emailSignature || ""}
                          onChange={(e) => setCompany((c) => ({ ...(c || { name: "" }), emailSignature: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button onClick={saveCompany} disabled={savingCompany} className="bg-violet-600 hover:bg-violet-700">
                      {savingCompany ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Save Branding
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Setup guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SMTP Setup Guide</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="gmail">
                  <TabsList>
                    <TabsTrigger value="gmail">Gmail</TabsTrigger>
                    <TabsTrigger value="outlook">Outlook</TabsTrigger>
                    <TabsTrigger value="custom">Custom SMTP</TabsTrigger>
                  </TabsList>
                  <TabsContent value="gmail" className="text-sm text-muted-foreground space-y-2 mt-3">
                    <p>1. Enable 2FA on your Google account</p>
                    <p>2. Create an App Password under Google Account → Security</p>
                    <p>3. Use <code className="bg-muted px-1 rounded">smtp.gmail.com</code> port <code className="bg-muted px-1 rounded">587</code></p>
                  </TabsContent>
                  <TabsContent value="outlook" className="text-sm text-muted-foreground space-y-2 mt-3">
                    <p>Host: <code className="bg-muted px-1 rounded">smtp.office365.com</code> — Port 587 — TLS enabled</p>
                    <p>Use your Microsoft 365 credentials or app-specific password.</p>
                  </TabsContent>
                  <TabsContent value="custom" className="text-sm text-muted-foreground space-y-2 mt-3">
                    <p>Set <code className="bg-muted px-1 rounded">SMTP_HOST</code>, <code className="bg-muted px-1 rounded">SMTP_PORT</code>, <code className="bg-muted px-1 rounded">SMTP_USER</code>, <code className="bg-muted px-1 rounded">SMTP_PASS</code>, <code className="bg-muted px-1 rounded">SMTP_FROM</code> in <code className="bg-muted px-1 rounded">.env.local</code></p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Live preview */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Live Preview
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                    {showPreview ? "Hide" : "Show"}
                  </Button>
                </div>
              </CardHeader>
              {showPreview && (
                <CardContent>
                  <div className="rounded-lg border bg-muted/40 overflow-auto max-h-[420px] text-xs">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Quick links */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/recruiter/email-templates">
                    <FileText className="h-4 w-4 mr-2" /> Manage Templates
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/recruiter/candidates">
                    <ExternalLink className="h-4 w-4 mr-2" /> Update Candidate Status
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/dashboard/recruiter/ai-matching">
                    <Send className="h-4 w-4 mr-2" /> Bulk Email (AI Matching)
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent activity */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Sends
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No emails sent yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {logs.map((log) => (
                      <li key={log._id} className="text-sm border-b pb-2 last:border-0">
                        <p className="font-medium line-clamp-1">{log.subject}</p>
                        <p className="text-xs text-muted-foreground">{log.to}</p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{new Date(log.sentAt).toLocaleString()}</span>
                          {log.opens ? <span>· {log.opens} opens</span> : null}
                          {log.clicks ? <span>· {log.clicks} clicks</span> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
