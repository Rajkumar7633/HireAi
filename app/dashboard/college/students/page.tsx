"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import {
  Users, UserPlus, Search, GraduationCap, Building2,
  CheckCircle2, Clock, Download, Upload, ChevronDown,
  Loader2, Mail, Phone, BookOpen, Award, Pencil, X, Eye
} from "lucide-react"

interface Student {
  _id: string
  name: string
  email: string
  phone?: string
  department?: string
  batch?: string
  cgpa?: number
  marks10th?: number
  marks12th?: number
  backlogs?: number
  skills: string[]
  placementStatus: "unplaced" | "placed" | "offer_received"
  companyPlacedAt?: string
  packageLPA?: number
  placedAt?: string
  createdAt: string
}

const DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil", "Chemical", "MBA", "MCA", "Other"]

export default function CollegeStudentsPage() {
  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>([])
  const [filtered, setFiltered] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [deptFilter, setDeptFilter] = useState("all")
  const [addOpen, setAddOpen] = useState(false)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [tempPass, setTempPass] = useState<string | null>(null)
  const [collegeName, setCollegeName] = useState("")
  const csvRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: "", email: "", phone: "", department: "", batch: "",
    skills: "", cgpa: "", marks10th: "", marks12th: "", backlogs: "0",
    generatePassword: true, customPassword: "",
  })

  useEffect(() => { fetchStudents() }, [])

  useEffect(() => {
    let list = students
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q))
    }
    if (statusFilter !== "all") list = list.filter(s => s.placementStatus === statusFilter)
    if (deptFilter !== "all") list = list.filter(s => s.department === deptFilter)
    setFiltered(list)
  }, [students, search, statusFilter, deptFilter])

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/college/onboard-student", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setStudents(data.students || [])
        setCollegeName(data.collegeName || "")
      }
    } catch {}
    finally { setLoading(false) }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/college/onboard-student", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          skills: form.skills,
          cgpa: form.cgpa ? Number(form.cgpa) : undefined,
          marks10th: form.marks10th ? Number(form.marks10th) : undefined,
          marks12th: form.marks12th ? Number(form.marks12th) : undefined,
          backlogs: form.backlogs !== "" ? Number(form.backlogs) : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast({ title: "Student onboarded", description: `${form.name} added successfully.` })
        if (data.temporaryPassword) setTempPass(data.temporaryPassword)
        setAddOpen(false)
        setForm({ name: "", email: "", phone: "", department: "", batch: "", skills: "", cgpa: "", generatePassword: true, customPassword: "" })
        fetchStudents()
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdatePlacement = async (studentId: string, update: Partial<Student>) => {
    try {
      const res = await fetch(`/api/college/onboard-student/${studentId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      })
      if (res.ok) {
        toast({ title: "Updated", description: "Placement status updated." })
        fetchStudents()
        setEditStudent(null)
      } else {
        const data = await res.json()
        toast({ title: "Error", description: data.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" })
    }
  }

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean)
    const header = lines[0].split(",").map(h => h.trim().toLowerCase())
    const nameIdx = header.indexOf("name")
    const emailIdx = header.indexOf("email")
    const deptIdx = header.indexOf("department")
    const batchIdx = header.indexOf("batch")
    const skillsIdx = header.indexOf("skills")
    if (nameIdx < 0 || emailIdx < 0) {
      toast({ title: "Invalid CSV", description: "CSV must have 'name' and 'email' columns.", variant: "destructive" })
      return
    }
    let success = 0, failed = 0
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map(c => c.trim())
      const payload = {
        name: cols[nameIdx],
        email: cols[emailIdx],
        department: deptIdx >= 0 ? cols[deptIdx] : "",
        batch: batchIdx >= 0 ? cols[batchIdx] : "",
        skills: skillsIdx >= 0 ? cols[skillsIdx] : "",
        generatePassword: true,
      }
      try {
        const res = await fetch("/api/college/onboard-student", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (res.ok) success++ ; else failed++
      } catch { failed++ }
    }
    toast({ title: "CSV Import Complete", description: `${success} added, ${failed} failed.` })
    fetchStudents()
    if (csvRef.current) csvRef.current.value = ""
  }

  const exportCSV = () => {
    const header = "Name,Email,Department,Batch,CGPA,Skills,Placement Status,Company,Package (LPA)"
    const rows = students.map(s =>
      [s.name, s.email, s.department || "", s.batch || "", s.cgpa || "", (s.skills || []).join(";"), s.placementStatus, s.companyPlacedAt || "", s.packageLPA || ""].join(",")
    )
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = "students.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  const statusBadge = (status: Student["placementStatus"]) => {
    switch (status) {
      case "placed": return <Badge className="bg-green-600 text-white">Placed</Badge>
      case "offer_received": return <Badge className="bg-blue-600 text-white">Offer Received</Badge>
      default: return <Badge variant="secondary">Unplaced</Badge>
    }
  }

  const stats = {
    total: students.length,
    placed: students.filter(s => s.placementStatus === "placed").length,
    offers: students.filter(s => s.placementStatus === "offer_received").length,
    unplaced: students.filter(s => s.placementStatus === "unplaced").length,
  }
  const placementRate = stats.total ? Math.round(((stats.placed + stats.offers) / stats.total) * 100) : 0

  const uniqueDepts = Array.from(new Set(students.map(s => s.department).filter(Boolean))) as string[]

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-blue-600" />
            Student Placement Management
          </h1>
          <p className="text-muted-foreground mt-1">{collegeName} — manage and track all registered students</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportCSV} size="sm">
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <UserPlus className="h-4 w-4 mr-2" /> Onboard Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Onboard New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Full Name *</Label>
                    <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Raj Kumar" />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="raj@college.edu" />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
                      <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Batch / Year</Label>
                    <Input value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))} placeholder="2024" />
                  </div>
                  <div>
                    <Label>CGPA</Label>
                    <Input type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={e => setForm(f => ({ ...f, cgpa: e.target.value }))} placeholder="8.5" />
                  </div>
                  <div>
                    <Label>10th %</Label>
                    <Input type="number" min="0" max="100" value={form.marks10th} onChange={e => setForm(f => ({ ...f, marks10th: e.target.value }))} placeholder="85" />
                  </div>
                  <div>
                    <Label>12th %</Label>
                    <Input type="number" min="0" max="100" value={form.marks12th} onChange={e => setForm(f => ({ ...f, marks12th: e.target.value }))} placeholder="78" />
                  </div>
                  <div>
                    <Label>Backlogs</Label>
                    <Input type="number" min="0" value={form.backlogs} onChange={e => setForm(f => ({ ...f, backlogs: e.target.value }))} placeholder="0" />
                  </div>
                </div>
                <div>
                  <Label>Skills (comma-separated)</Label>
                  <Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="React, Node.js, Python" />
                </div>
                <div className="space-y-2">
                  <Label>Login Password</Label>
                  <div className="flex gap-2 items-center">
                    <input type="checkbox" id="genpass" checked={form.generatePassword} onChange={e => setForm(f => ({ ...f, generatePassword: e.target.checked }))} />
                    <label htmlFor="genpass" className="text-sm cursor-pointer">Auto-generate temporary password</label>
                  </div>
                  {!form.generatePassword && (
                    <Input type="password" value={form.customPassword} onChange={e => setForm(f => ({ ...f, customPassword: e.target.value }))} placeholder="Set a password for the student" />
                  )}
                </div>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Create Account & Onboard
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Temporary password alert */}
      {tempPass && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-800">Temporary Password Generated</p>
              <p className="text-amber-700 text-sm">Share this with the student: <code className="font-mono bg-amber-100 px-2 py-0.5 rounded text-base">{tempPass}</code></p>
              <p className="text-amber-600 text-xs mt-1">The student should change their password after first login.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setTempPass(null)}><X className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-blue-100 text-sm mt-1">Total Students</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{stats.placed}</div>
            <div className="text-green-100 text-sm mt-1">Placed</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{placementRate}%</div>
            <div className="text-purple-100 text-sm mt-1">Placement Rate</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{stats.unplaced}</div>
            <div className="text-orange-100 text-sm mt-1">Unplaced</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, email, dept..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="unplaced">Unplaced</SelectItem>
            <SelectItem value="offer_received">Offer Received</SelectItem>
            <SelectItem value="placed">Placed</SelectItem>
          </SelectContent>
        </Select>
        {uniqueDepts.length > 0 && (
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {uniqueDepts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <span className="text-xs text-muted-foreground">{filtered.length} / {students.length} students</span>
      </div>

      {/* CSV format hint */}
      <p className="text-xs text-muted-foreground">CSV import format: <code>name, email, department, batch, skills</code> (header row required)</p>

      {/* Student list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold mb-2">No students yet</h3>
            <p className="text-muted-foreground mb-4">Onboard your first student or import from a CSV file.</p>
            <Button onClick={() => setAddOpen(true)}><UserPlus className="h-4 w-4 mr-2" /> Onboard Student</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(student => (
            <Card key={student._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{student.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3" /> {student.email}
                    </CardDescription>
                  </div>
                  {statusBadge(student.placementStatus)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {student.department && <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{student.department}</span>}
                  {student.batch && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />Batch {student.batch}</span>}
                  {student.cgpa != null && <span className="flex items-center gap-1"><Award className="h-3 w-3" />CGPA {student.cgpa}</span>}
                  {student.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{student.phone}</span>}
                </div>

                {student.skills && student.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {student.skills.slice(0, 5).map((sk, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{sk}</Badge>
                    ))}
                    {student.skills.length > 5 && <Badge variant="outline" className="text-xs">+{student.skills.length - 5}</Badge>}
                  </div>
                )}

                {student.placementStatus === "placed" && (
                  <div className="bg-green-50 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium text-green-800 flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {student.companyPlacedAt}
                    </span>
                    {student.packageLPA && <span className="text-green-700 text-xs ml-4">₹{student.packageLPA} LPA</span>}
                  </div>
                )}

                {/* Update placement */}
                <div className="flex gap-2 pt-1">
                  <Select
                    value={student.placementStatus}
                    onValueChange={v => {
                      if (v === "placed" || v === "offer_received") {
                        setEditStudent(student)
                      } else {
                        handleUpdatePlacement(student._id, { placementStatus: v as any })
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1 h-8 text-xs">
                      <SelectValue />
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unplaced">Unplaced</SelectItem>
                      <SelectItem value="offer_received">Offer Received</SelectItem>
                      <SelectItem value="placed">Placed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setEditStudent(student)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1 text-purple-600 hover:text-purple-700 hover:border-purple-300" asChild>
                    <Link href={`/dashboard/college/students/${student._id}`}>
                      <Eye className="h-3 w-3" /> View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit / placement details dialog */}
      {editStudent && (
        <PlacementDialog
          student={editStudent}
          onSave={(update) => handleUpdatePlacement(editStudent._id, update)}
          onClose={() => setEditStudent(null)}
        />
      )}
    </div>
  )
}

function PlacementDialog({ student, onSave, onClose }: { student: Student; onSave: (u: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    placementStatus: student.placementStatus,
    companyPlacedAt: student.companyPlacedAt || "",
    packageLPA: student.packageLPA?.toString() || "",
    cgpa: student.cgpa?.toString() || "",
    department: student.department || "",
    batch: student.batch || "",
  })

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update — {student.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Placement Status</Label>
            <Select value={form.placementStatus} onValueChange={v => setForm(f => ({ ...f, placementStatus: v as any }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unplaced">Unplaced</SelectItem>
                <SelectItem value="offer_received">Offer Received</SelectItem>
                <SelectItem value="placed">Placed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(form.placementStatus === "placed" || form.placementStatus === "offer_received") && (
            <>
              <div>
                <Label>Company Name</Label>
                <Input value={form.companyPlacedAt} onChange={e => setForm(f => ({ ...f, companyPlacedAt: e.target.value }))} placeholder="Infosys, TCS, Google..." />
              </div>
              <div>
                <Label>Package (LPA)</Label>
                <Input type="number" step="0.1" value={form.packageLPA} onChange={e => setForm(f => ({ ...f, packageLPA: e.target.value }))} placeholder="8.5" />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CGPA</Label>
              <Input type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={e => setForm(f => ({ ...f, cgpa: e.target.value }))} />
            </div>
            <div>
              <Label>Batch</Label>
              <Input value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department} onValueChange={v => setForm(f => ({ ...f, department: v }))}>
              <SelectTrigger><SelectValue placeholder="Select dept" /></SelectTrigger>
              <SelectContent>
                {["Computer Science","Electronics","Mechanical","Civil","Chemical","MBA","MCA","Other"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => onSave({
              placementStatus: form.placementStatus,
              companyPlacedAt: form.companyPlacedAt,
              packageLPA: form.packageLPA ? Number(form.packageLPA) : undefined,
              cgpa: form.cgpa ? Number(form.cgpa) : undefined,
              department: form.department,
              batch: form.batch,
            })}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Save
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
