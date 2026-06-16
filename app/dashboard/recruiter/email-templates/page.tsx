"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  Mail,
  Plus,
  Edit,
  Trash2,
  Send,
  Zap,
  FileText,
  CheckCircle2,
  Search,
  Copy,
  Download,
  Upload,
  Eye,
  LayoutGrid,
  List,
  Settings2,
  Clock,
  Filter,
  Sparkles,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buildProfessionalTemplate } from "@/lib/email-templates"
import { renderTemplate } from "@/lib/template-render"
import { HIRING_STATUSES } from "@/lib/email-default-templates"

interface EmailTemplate {
  _id: string
  name: string
  subject: string
  content: string
  category: string
  variables: string[]
  linkedStatus?: string | null
  isDefault: boolean
  createdAt: string
}

interface EmailLogRow {
  _id: string
  to: string
  subject: string
  sentAt: string
}

const CATEGORY_LABELS: Record<string, string> = {
  application_update: "Application",
  interview: "Interview",
  offer: "Offer",
  rejection: "Rejection",
  follow_up: "Follow Up",
  all: "All",
}

const CATEGORY_COLORS: Record<string, string> = {
  application_update: "bg-blue-100 text-blue-800",
  interview: "bg-purple-100 text-purple-800",
  offer: "bg-emerald-100 text-emerald-800",
  rejection: "bg-red-100 text-red-800",
  follow_up: "bg-amber-100 text-amber-800",
}

const VARIABLE_GLOSSARY: Record<string, string> = {
  candidateName: "Candidate's full name",
  jobTitle: "Job position title",
  companyName: "Your company name",
  recruiterName: "Recruiter's name",
  interviewDate: "Interview date (YYYY-MM-DD)",
  interviewTime: "Interview time (HH:mm)",
  interviewLocation: "Interview location or Online",
  duration: "Duration in minutes",
  dashboardUrl: "Link to candidate dashboard",
}

const SAMPLE_VARS: Record<string, string> = {
  candidateName: "John Smith",
  jobTitle: "Senior Software Engineer",
  companyName: "Acme Corp",
  recruiterName: "Jane Recruiter",
  interviewDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  interviewTime: "10:00",
  interviewLocation: "Online (Video)",
  duration: "60",
}

export default function EmailTemplatesPage() {
  const searchParams = useSearchParams()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<EmailLogRow[]>([])
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showUseDialog, setShowUseDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importJson, setImportJson] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [cardPreviewHtml, setCardPreviewHtml] = useState("")
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    content: "",
    category: "application_update",
    linkedStatus: "",
    variables: [] as string[],
  })
  const [sendForm, setSendForm] = useState({
    to: "",
    subjectOverride: "",
    ctaUrl: "",
    ctaLabel: "",
    vars: {} as Record<string, string>,
    sending: false,
  })
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    fetchTemplates()
    fetchLogs()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/communication/email-templates")
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch templates.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/communication/email/logs?limit=8")
      if (res.ok) {
        const j = await res.json()
        setLogs(j.logs || [])
      }
    } catch {
      /* ignore */
    }
  }

  const extractVariables = (text: string) => {
    const matches = text.match(/\{\{\s*(\w+)\s*\}\}/g) || []
    return Array.from(new Set(matches.map((m) => m.replace(/\{\{\s*|\s*\}\}/g, ""))))
  }

  const filteredTemplates = useMemo(() => {
    let list = [...templates]
    if (categoryFilter !== "all") list = list.filter((t) => t.category === categoryFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q),
      )
    }
    list.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name)
      if (sortBy === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortBy === "category") return a.category.localeCompare(b.category)
      return 0
    })
    return list
  }, [templates, search, categoryFilter, sortBy])

  const applyInterviewDefaults = (vars: Record<string, string>) => {
    if ("interviewDate" in vars && !vars.interviewDate) {
      const d = new Date()
      d.setDate(d.getDate() + 1)
      vars.interviewDate = d.toISOString().slice(0, 10)
    }
    if ("interviewTime" in vars && !vars.interviewTime) vars.interviewTime = "10:00"
    if ("duration" in vars && !vars.duration) vars.duration = "60"
  }

  const buildPreviewHtml = (tpl: EmailTemplate, vars: Record<string, string>) => {
    const rawContent = renderTemplate(tpl.content, vars)
    const contentHasGreeting = /^\s*(hello|dear|hi)\b/i.test(rawContent)
    return buildProfessionalTemplate({
      recipientName: vars.candidateName || "there",
      heading: "Hello",
      messageHtml: rawContent.replace(/\n/g, "<br/>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
      badge: tpl.category === "interview" ? "Interview" : tpl.category === "offer" ? "Offer" : "Update",
      includeGreeting: !contentHasGreeting,
    })
  }

  const handleCardPreview = (tpl: EmailTemplate) => {
    const vars: Record<string, string> = {}
    ;(tpl.variables || []).forEach((k) => (vars[k] = SAMPLE_VARS[k] || ""))
    setCardPreviewHtml(buildPreviewHtml(tpl, vars))
    setSelectedTemplate(tpl)
    setShowPreview(true)
  }

  const handlePreview = () => {
    if (!selectedTemplate) return
    const vars = { ...sendForm.vars }
    applyInterviewDefaults(vars)
    setPreviewHtml(buildPreviewHtml(selectedTemplate, vars))
    setShowPreview(true)
  }

  useEffect(() => {
    if (loading || !templates.length || !searchParams) return
    const tplId = searchParams.get("templateId")
    if (!tplId) return
    const tpl = templates.find((t) => t._id === tplId)
    if (tpl) openUseTemplate(tpl)
  }, [loading, templates, searchParams])

  const openUseTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl)
    const v: Record<string, string> = {}
    ;(tpl.variables || []).forEach((k) => (v[k] = ""))
    applyInterviewDefaults(v)
    setSendForm({ to: "", subjectOverride: "", ctaUrl: "", ctaLabel: "View Application", vars: v, sending: false })
    setShowUseDialog(true)
  }

  const fillSampleData = () => {
    if (!selectedTemplate) return
    const v: Record<string, string> = { ...sendForm.vars }
    ;(selectedTemplate.variables || []).forEach((k) => {
      if (SAMPLE_VARS[k]) v[k] = SAMPLE_VARS[k]
    })
    setSendForm((p) => ({ ...p, vars: v }))
    toast({ title: "Sample data filled" })
  }

  const openEditTemplate = (tpl: EmailTemplate) => {
    setEditingTemplate(tpl)
    setNewTemplate({
      name: tpl.name,
      subject: tpl.subject,
      content: tpl.content,
      category: tpl.category,
      linkedStatus: tpl.linkedStatus || "",
      variables: tpl.variables || [],
    })
    setShowEditDialog(true)
  }

  const handleSend = async () => {
    if (!selectedTemplate || !sendForm.to) {
      toast({ title: "Missing recipient", variant: "destructive" })
      return
    }
    setSendForm((p) => ({ ...p, sending: true }))
    try {
      const res = await fetch("/api/communication/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: sendForm.to,
          templateId: selectedTemplate._id,
          variables: sendForm.vars,
          subjectOverride: sendForm.subjectOverride || undefined,
          ctaUrl: sendForm.ctaUrl || undefined,
          ctaLabel: sendForm.ctaLabel || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "Failed to send")
      toast({ title: "Email sent" })
      setShowUseDialog(false)
      fetchLogs()
    } catch (e: unknown) {
      toast({ title: "Send failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" })
    } finally {
      setSendForm((p) => ({ ...p, sending: false }))
    }
  }

  const handleCreateTemplate = async () => {
    const vars = extractVariables(newTemplate.subject + newTemplate.content)
    try {
      const res = await fetch("/api/communication/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTemplate, variables: vars, linkedStatus: newTemplate.linkedStatus || null }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Template created" })
      setShowCreateDialog(false)
      setNewTemplate({ name: "", subject: "", content: "", category: "application_update", linkedStatus: "", variables: [] })
      fetchTemplates()
    } catch {
      toast({ title: "Error", description: "Failed to create template.", variant: "destructive" })
    }
  }

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return
    const vars = extractVariables(newTemplate.subject + newTemplate.content)
    try {
      const res = await fetch(`/api/communication/email-templates/${editingTemplate._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTemplate, variables: vars, linkedStatus: newTemplate.linkedStatus || null }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Template updated" })
      setShowEditDialog(false)
      setEditingTemplate(null)
      fetchTemplates()
    } catch {
      toast({ title: "Error", description: "Failed to update template.", variant: "destructive" })
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return
    try {
      const res = await fetch(`/api/communication/email-templates/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast({ title: "Template deleted" })
      fetchTemplates()
    } catch {
      toast({ title: "Error", description: "Cannot delete default templates.", variant: "destructive" })
    }
  }

  const handleDuplicate = async (tpl: EmailTemplate) => {
    try {
      const res = await fetch("/api/communication/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${tpl.name} (Copy)`,
          subject: tpl.subject,
          content: tpl.content,
          category: tpl.category,
          variables: tpl.variables,
          linkedStatus: null,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Template duplicated" })
      fetchTemplates()
    } catch {
      toast({ title: "Duplicate failed", variant: "destructive" })
    }
  }

  const handleExport = (tpl: EmailTemplate) => {
    const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${tpl.name.replace(/\s+/g, "-").toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importJson)
      const res = await fetch("/api/communication/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: parsed.name || "Imported Template",
          subject: parsed.subject,
          content: parsed.content,
          category: parsed.category || "application_update",
          variables: parsed.variables || extractVariables((parsed.subject || "") + (parsed.content || "")),
          linkedStatus: parsed.linkedStatus || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast({ title: "Template imported" })
      setShowImportDialog(false)
      setImportJson("")
      fetchTemplates()
    } catch {
      toast({ title: "Invalid JSON or import failed", variant: "destructive" })
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: `Copied ${label}` })
  }

  const linkedCount = templates.filter((t) => t.linkedStatus).length
  const defaultCount = templates.filter((t) => t.isDefault).length
  const customCount = templates.filter((t) => !t.isDefault).length

  const TemplateFormFields = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <Input placeholder="Template name" value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).filter(([k]) => k !== "all").map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={newTemplate.linkedStatus || "none"} onValueChange={(v) => setNewTemplate({ ...newTemplate, linkedStatus: v === "none" ? "" : v })}>
          <SelectTrigger><SelectValue placeholder="Auto-send on status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No auto-send link</SelectItem>
            {HIRING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>Auto-send → {s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input placeholder="Subject ({{variableName}})" value={newTemplate.subject} onChange={(e) => setNewTemplate({ ...newTemplate, subject: e.target.value })} />
      <Textarea placeholder="Body with {{candidateName}}, {{jobTitle}}, etc." value={newTemplate.content} onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })} className="min-h-32" />
      <p className="text-xs text-muted-foreground">Variables: {extractVariables(newTemplate.subject + newTemplate.content).join(", ") || "none"}</p>
      <Button onClick={onSubmit} className="bg-violet-600 hover:bg-violet-700">{submitLabel}</Button>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        <span>Loading email templates…</span>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-violet-50/40 to-background">
      <div className="dashboard-subheader">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-7 w-7 text-violet-600" />
              Email Templates
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Search, preview, export, and auto-send on hiring status changes</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/recruiter/settings/email"><Settings2 className="h-4 w-4 mr-1" /> Email Settings</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-violet-600 hover:bg-violet-700"><Plus className="h-4 w-4 mr-2" /> New Template</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Template</DialogTitle>
                  <DialogDescription>Link a hiring status for automatic sending</DialogDescription>
                </DialogHeader>
                <TemplateFormFields onSubmit={handleCreateTemplate} submitLabel="Create Template" />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-violet-100"><CardContent className="pt-5 flex items-center gap-3"><FileText className="h-8 w-8 text-violet-600" /><div><p className="text-2xl font-bold">{templates.length}</p><p className="text-xs text-muted-foreground">Templates</p></div></CardContent></Card>
          <Card><CardContent className="pt-5 flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-emerald-600" /><div><p className="text-2xl font-bold">{linkedCount}</p><p className="text-xs text-muted-foreground">Auto-linked</p></div></CardContent></Card>
          <Card><CardContent className="pt-5 flex items-center gap-3"><Zap className="h-8 w-8 text-amber-500" /><div><p className="text-2xl font-bold">{defaultCount}</p><p className="text-xs text-muted-foreground">Defaults</p></div></CardContent></Card>
          <Card><CardContent className="pt-5 flex items-center gap-3"><Edit className="h-8 w-8 text-blue-600" /><div><p className="text-2xl font-bold">{customCount}</p><p className="text-xs text-muted-foreground">Custom</p></div></CardContent></Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* Search & filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search templates…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px]"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort: Name</SelectItem>
                  <SelectItem value="date">Sort: Date</SelectItem>
                  <SelectItem value="category">Sort: Category</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
                <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
              </div>
            </div>

            <Tabs value={categoryFilter} onValueChange={setCategoryFilter}>
              <TabsList>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <TabsTrigger key={k} value={k}>{v}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Templates */}
            <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>
              {filteredTemplates.map((template) => (
                <Card key={template._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{template.name}</CardTitle>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        {template.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                        <Badge className={`text-xs ${CATEGORY_COLORS[template.category] || ""}`}>{CATEGORY_LABELS[template.category]}</Badge>
                      </div>
                    </div>
                    <CardDescription className="text-xs line-clamp-1">{template.subject}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{template.content}</p>
                    {template.linkedStatus && (
                      <div className="flex items-center gap-1 text-xs text-violet-700 bg-violet-50 rounded px-2 py-1">
                        <Zap className="h-3 w-3" /> Auto: <strong>{template.linkedStatus}</strong>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(template.variables || []).slice(0, 3).map((v) => (
                        <Badge key={v} variant="outline" className="text-xs">{`{{${v}}}`}</Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      <Button size="sm" variant="outline" onClick={() => openUseTemplate(template)}><Send className="h-3.5 w-3.5 mr-1" />Send</Button>
                      <Button size="sm" variant="outline" onClick={() => handleCardPreview(template)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(template.content, "body")}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleExport(template)}><Download className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDuplicate(template)}><Copy className="h-3.5 w-3.5 mr-1" />Dup</Button>
                      {!template.isDefault && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => openEditTemplate(template)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="outline" onClick={() => handleDeleteTemplate(template._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {filteredTemplates.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No templates match your search.</p>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-violet-600" /> Variable Glossary</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {Object.entries(VARIABLE_GLOSSARY).map(([k, desc]) => (
                  <div key={k} className="flex justify-between gap-2 border-b pb-2 last:border-0">
                    <code className="text-xs bg-muted px-1 rounded">{`{{${k}}}`}</code>
                    <span className="text-xs text-muted-foreground text-right">{desc}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" /> Status Map</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {HIRING_STATUSES.slice(0, 6).map((status) => {
                  const linked = templates.find((t) => t.linkedStatus === status)
                  return (
                    <div key={status} className="flex justify-between text-xs py-1 border-b last:border-0">
                      <span>{status}</span>
                      <span className="text-muted-foreground truncate max-w-[120px]">{linked?.name || "—"}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Recent Sends</CardTitle></CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No sends yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {logs.map((log) => (
                      <li key={log._id} className="text-xs border-b pb-2 last:border-0">
                        <p className="font-medium line-clamp-1">{log.subject}</p>
                        <p className="text-muted-foreground">{log.to}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Template</DialogTitle></DialogHeader>
          <TemplateFormFields onSubmit={handleUpdateTemplate} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Import Template JSON</DialogTitle></DialogHeader>
          <Textarea className="min-h-32 font-mono text-xs" placeholder='{"name":"...","subject":"...","content":"..."}' value={importJson} onChange={(e) => setImportJson(e.target.value)} />
          <Button onClick={handleImport} className="bg-violet-600 hover:bg-violet-700">Import</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showUseDialog} onOpenChange={setShowUseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>Fill details or use sample data</DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="Recipient email" value={sendForm.to} onChange={(e) => setSendForm((p) => ({ ...p, to: e.target.value }))} />
                <Input placeholder="Subject override" value={sendForm.subjectOverride} onChange={(e) => setSendForm((p) => ({ ...p, subjectOverride: e.target.value }))} />
              </div>
              {selectedTemplate.variables?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedTemplate.variables.map((k) => (
                    <Input key={k} placeholder={k} value={sendForm.vars[k] || ""} onChange={(e) => setSendForm((p) => ({ ...p, vars: { ...p.vars, [k]: e.target.value } }))} />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-end">
                <Button variant="outline" onClick={fillSampleData}>Fill Sample</Button>
                <Button variant="outline" onClick={() => setShowUseDialog(false)}>Cancel</Button>
                <Button variant="outline" onClick={handlePreview}>Preview</Button>
                <Button onClick={handleSend} disabled={sendForm.sending} className="bg-violet-600 hover:bg-violet-700">
                  {sendForm.sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl h-[80vh]">
          <DialogHeader><DialogTitle>Email Preview</DialogTitle></DialogHeader>
          <div className="w-full h-full overflow-auto bg-muted rounded">
            <div dangerouslySetInnerHTML={{ __html: previewHtml || cardPreviewHtml }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
