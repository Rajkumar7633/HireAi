"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  Filter,
  Loader2,
  Mail,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Users,
  Search,
  Send,
  GraduationCap,
} from "lucide-react"

interface StudentRow {
  _id: string
  name: string
  email: string
  department?: string
  batch?: string
  cgpa?: number | null
  marks10th?: number | null
  marks12th?: number | null
  backlogs?: number | null
  skills?: string[]
  placementStatus?: string
  reasons: string[]
  missingFields: string[]
}

interface MatchResult {
  summary: { total: number; eligible: number; ineligible: number; incomplete: number }
  eligible: StudentRow[]
  ineligible: StudentRow[]
  incomplete: StudentRow[]
  drive?: { companyName?: string; role?: string; driveId?: string }
}

export default function DriveShortlistPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const preselectedDrive = searchParams.get("driveId") || ""

  const [drives, setDrives] = useState<any[]>([])
  const [driveId, setDriveId] = useState(preselectedDrive)
  const [companyName, setCompanyName] = useState("")
  const [role, setRole] = useState("")
  const [loading, setLoading] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [result, setResult] = useState<MatchResult | null>(null)
  const [externalEmails, setExternalEmails] = useState("")
  const [customNote, setCustomNote] = useState("")
  const [tab, setTab] = useState("eligible")

  const [criteria, setCriteria] = useState({
    minCGPA: "",
    maxCGPA: "",
    minMarks10th: "",
    minMarks12th: "",
    maxBacklogs: "0",
    departments: "",
    batches: "",
    skills: "",
    onlyUnplaced: true,
  })

  useEffect(() => {
    fetch("/api/college/campus-drives", { credentials: "include" })
      .then((r) => r.ok ? r.json() : { drives: [] })
      .then((d) => setDrives(d.drives || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (driveId && drives.length) {
      const d = drives.find((x) => String(x._id) === driveId)
      if (d) {
        setCompanyName(d.companyName || "")
        setRole(d.role || "")
        const e = d.eligibility || {}
        setCriteria((c) => ({
          ...c,
          minCGPA: e.minCGPA ? String(e.minCGPA) : c.minCGPA,
          batches: (e.batches || []).join(", "),
          departments: (e.branches || []).join(", "),
          skills: (e.skills || []).join(", "),
          maxBacklogs: e.backlogsAllowed ? "" : "0",
        }))
      }
    }
  }, [driveId, drives])

  const buildCriteriaPayload = () => ({
    minCGPA: criteria.minCGPA ? parseFloat(criteria.minCGPA) : undefined,
    maxCGPA: criteria.maxCGPA ? parseFloat(criteria.maxCGPA) : undefined,
    minMarks10th: criteria.minMarks10th ? parseFloat(criteria.minMarks10th) : undefined,
    minMarks12th: criteria.minMarks12th ? parseFloat(criteria.minMarks12th) : undefined,
    maxBacklogs: criteria.maxBacklogs !== "" ? parseInt(criteria.maxBacklogs, 10) : undefined,
    departments: criteria.departments
      ? criteria.departments.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    batches: criteria.batches
      ? criteria.batches.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    requiredSkills: criteria.skills
      ? criteria.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    onlyUnplaced: criteria.onlyUnplaced,
  })

  const runMatch = useCallback(async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/college/eligibility-match", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveId: driveId || undefined,
          criteria: buildCriteriaPayload(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Filter failed", description: data.error || "Could not match students", variant: "destructive" })
        return
      }
      setResult(data)
      if (data.drive?.companyName) setCompanyName(data.drive.companyName)
      if (data.drive?.role) setRole(data.drive.role)
      toast({
        title: "Shortlist ready",
        description: `${data.summary.eligible} eligible · ${data.summary.ineligible} not eligible · ${data.summary.incomplete} need profile updates`,
      })
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [driveId, criteria, toast])

  useEffect(() => {
    if (!preselectedDrive) return
    setDriveId(preselectedDrive)
  }, [preselectedDrive])

  const sendNotify = async (notifyType: "eligible" | "update_profile", studentIds: string[]) => {
    if (studentIds.length === 0) {
      toast({ title: "No students selected", variant: "destructive" })
      return
    }
    setNotifying(true)
    try {
      const res = await fetch("/api/college/eligibility-match/notify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          notifyType,
          driveId: driveId || undefined,
          companyName,
          role,
          customNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Failed", description: data.error, variant: "destructive" })
        return
      }
      toast({
        title: "Messages sent",
        description: `${data.results.notifications} notifications · ${data.results.emailsSent} emails`,
      })
      if (data.note) toast({ title: "Email note", description: data.note })
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setNotifying(false)
    }
  }

  const inviteExternal = async () => {
    const emails = externalEmails.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean)
    if (!emails.length) {
      toast({ title: "Add email addresses", variant: "destructive" })
      return
    }
    setNotifying(true)
    try {
      const res = await fetch("/api/college/eligibility-match/notify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalEmails: emails,
          notifyType: "invite_external",
          driveId: driveId || undefined,
          companyName,
          role,
          customNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Failed", description: data.error, variant: "destructive" })
        return
      }
      toast({
        title: "Invites sent",
        description: `${data.results.externalInvites} external invite emails`,
      })
      setExternalEmails("")
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setNotifying(false)
    }
  }

  const exportCsv = (rows: StudentRow[], filename: string) => {
    const header = ["Name", "Email", "Department", "Batch", "CGPA", "10th", "12th", "Backlogs", "Status", "Notes"]
    const lines = rows.map((s) =>
      [
        s.name,
        s.email,
        s.department || "",
        s.batch || "",
        s.cgpa ?? "",
        s.marks10th ?? "",
        s.marks12th ?? "",
        s.backlogs ?? "",
        s.placementStatus || "",
        [...s.reasons, ...s.missingFields].join("; "),
      ].map((c) => `"${String(c).replace(/"/g, "'")}"`).join(","),
    )
    const csv = [header.join(","), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const StudentTable = ({ rows, emptyMsg }: { rows: StudentRow[]; emptyMsg: string }) => (
    rows.length === 0 ? (
      <p className="text-sm text-muted-foreground py-8 text-center">{emptyMsg}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left">
              <th className="p-3 font-medium">Student</th>
              <th className="p-3 font-medium">Dept / Batch</th>
              <th className="p-3 font-medium text-center">CGPA</th>
              <th className="p-3 font-medium text-center">10th</th>
              <th className="p-3 font-medium text-center">12th</th>
              <th className="p-3 font-medium text-center">BL</th>
              <th className="p-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((s) => (
              <tr key={s._id} className="hover:bg-muted/20">
                <td className="p-3">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.email}</p>
                </td>
                <td className="p-3 text-xs">
                  {s.department || "—"}
                  <br />
                  <span className="text-muted-foreground">Batch {s.batch || "—"}</span>
                </td>
                <td className="p-3 text-center font-semibold">{s.cgpa ?? "—"}</td>
                <td className="p-3 text-center">{s.marks10th ?? "—"}</td>
                <td className="p-3 text-center">{s.marks12th ?? "—"}</td>
                <td className="p-3 text-center">{s.backlogs ?? "—"}</td>
                <td className="p-3 text-xs text-muted-foreground max-w-[200px]">
                  {[...s.reasons, ...s.missingFields.map((m) => `Missing: ${m}`)].join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  )

  return (
    <div className="dashboard-page max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Filter className="h-7 w-7 text-purple-600" />
            Recruiter Drive Shortlist
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Filter students by CGPA, 10th/12th marks, department, and skills when a company visits campus
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/college/campus-drives">Back to drives</Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-purple-600" />
              Recruiter criteria
            </CardTitle>
            <CardDescription>Pick a drive or set custom filters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Campus drive (optional)</Label>
              <Select value={driveId || "none"} onValueChange={(v) => setDriveId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select drive" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Custom / manual</SelectItem>
                  {drives.map((d) => (
                    <SelectItem key={d._id} value={String(d._id)}>
                      {d.companyName} — {d.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Company</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="EPAM" />
              </div>
              <div>
                <Label>Role</Label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="SDE" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min CGPA</Label>
                <Input type="number" step="0.1" value={criteria.minCGPA} onChange={(e) => setCriteria({ ...criteria, minCGPA: e.target.value })} placeholder="7.0" />
              </div>
              <div>
                <Label>Max CGPA</Label>
                <Input type="number" step="0.1" value={criteria.maxCGPA} onChange={(e) => setCriteria({ ...criteria, maxCGPA: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min 10th %</Label>
                <Input type="number" value={criteria.minMarks10th} onChange={(e) => setCriteria({ ...criteria, minMarks10th: e.target.value })} placeholder="60" />
              </div>
              <div>
                <Label>Min 12th %</Label>
                <Input type="number" value={criteria.minMarks12th} onChange={(e) => setCriteria({ ...criteria, minMarks12th: e.target.value })} placeholder="65" />
              </div>
            </div>
            <div>
              <Label>Max backlogs</Label>
              <Input type="number" min="0" value={criteria.maxBacklogs} onChange={(e) => setCriteria({ ...criteria, maxBacklogs: e.target.value })} />
            </div>
            <div>
              <Label>Departments / branches</Label>
              <Input value={criteria.departments} onChange={(e) => setCriteria({ ...criteria, departments: e.target.value })} placeholder="CSE, IT, ECE" />
            </div>
            <div>
              <Label>Batches</Label>
              <Input value={criteria.batches} onChange={(e) => setCriteria({ ...criteria, batches: e.target.value })} placeholder="2025, 2026" />
            </div>
            <div>
              <Label>Required skills</Label>
              <Input value={criteria.skills} onChange={(e) => setCriteria({ ...criteria, skills: e.target.value })} placeholder="Java, Python" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={criteria.onlyUnplaced} onChange={(e) => setCriteria({ ...criteria, onlyUnplaced: e.target.checked })} />
              Only unplaced students
            </label>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={runMatch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Apply filter
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {result && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: result.summary.total, color: "text-slate-700" },
                { label: "Eligible", value: result.summary.eligible, color: "text-emerald-600" },
                { label: "Not eligible", value: result.summary.ineligible, color: "text-red-600" },
                { label: "Incomplete", value: result.summary.incomplete, color: "text-amber-600" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Shortlist results</CardTitle>
                {result && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => sendNotify("eligible", result.eligible.map((s) => s._id))} disabled={notifying}>
                      <Mail className="h-3.5 w-3.5 mr-1" /> Email eligible
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendNotify("update_profile", result.incomplete.map((s) => s._id))} disabled={notifying}>
                      <Send className="h-3.5 w-3.5 mr-1" /> Ask to update profile
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => exportCsv(result.eligible, "eligible-students.csv")}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Export eligible
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!result ? (
                <Alert>
                  <GraduationCap className="h-4 w-4" />
                  <AlertDescription>Set recruiter criteria and click <strong>Apply filter</strong> to build a shortlist.</AlertDescription>
                </Alert>
              ) : (
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList>
                    <TabsTrigger value="eligible" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Eligible ({result.eligible.length})
                    </TabsTrigger>
                    <TabsTrigger value="ineligible" className="gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Not eligible ({result.ineligible.length})
                    </TabsTrigger>
                    <TabsTrigger value="incomplete" className="gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Incomplete ({result.incomplete.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="eligible" className="mt-4">
                    <StudentTable rows={result.eligible} emptyMsg="No students match all criteria." />
                  </TabsContent>
                  <TabsContent value="ineligible" className="mt-4">
                    <StudentTable rows={result.ineligible} emptyMsg="No ineligible students in this run." />
                  </TabsContent>
                  <TabsContent value="incomplete" className="mt-4">
                    <StudentTable rows={result.incomplete} emptyMsg="All students have required academic data." />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Students not on platform
              </CardTitle>
              <CardDescription>Invite by email — they will receive a signup link to join HireAI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="student1@college.edu, student2@college.edu"
                value={externalEmails}
                onChange={(e) => setExternalEmails(e.target.value)}
                rows={3}
              />
              <Textarea
                placeholder="Optional note for students..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                rows={2}
              />
              <Button onClick={inviteExternal} disabled={notifying} className="bg-indigo-600 hover:bg-indigo-700">
                {notifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Send invite emails
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
