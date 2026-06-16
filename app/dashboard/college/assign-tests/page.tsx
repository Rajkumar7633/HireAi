"use client"

import { useState, useEffect } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2, ClipboardList, Users, Code2, FileText, Calendar,
  Plus, Trash2, CheckCircle2, Clock, Search, Send, BarChart3,
  ListOrdered, Zap, Layers, Eye,
} from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Test {
  _id: string
  title: string
  description?: string
  durationMinutes: number
  questions: any[]
  createdAt: string
}

interface Student {
  _id: string
  name: string
  email: string
  department: string
  year: number
  batch: string
}

interface Assignment {
  _id: string
  testId: string
  testTitle: string
  department: string
  year: number
  batch: string
  dueDate: string | null
  assignedAt: string
  studentIds: string[]
  completions: { studentId: string; studentName: string; status: string; score?: number }[]
}

const DEPARTMENTS = ["CSE", "IT", "ECE", "EEE", "ME", "CE", "MBA", "MCA"]
const YEARS = [1, 2, 3, 4]

export default function AssignTestsPage() {
  const [tests, setTests] = useState<Test[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchStudents, setSearchStudents] = useState("")
  const [filterDept, setFilterDept] = useState("all")
  const [filterYear, setFilterYear] = useState("all")

  // Form state
  const [selectedTest, setSelectedTest] = useState<Test | null>(null)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [dueDate, setDueDate] = useState("")
  const [assignMode, setAssignMode] = useState<"individual" | "batch">("individual")
  const [batchDept, setBatchDept] = useState("all")
  const [batchYear, setBatchYear] = useState("all")
  const [activeTab, setActiveTab] = useState("tests")
  const [deletingTestId, setDeletingTestId] = useState<string | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    Promise.all([fetchTests(), fetchStudents(), fetchAssignments()]).finally(() =>
      setLoading(false)
    )
  }, [])

  const fetchTests = async () => {
    try {
      const res = await fetch("/api/college/tests")
      if (res.ok) {
        const data = await res.json()
        setTests(Array.isArray(data) ? data : data.tests || [])
      }
    } catch { /**/ }
  }

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/college/onboard-student")
      if (res.ok) {
        const data = await res.json()
        const arr = data.students || []
        setStudents(
          arr.map((s: { _id: string; name?: string; email?: string; department?: string; batch?: string }) => ({
            _id: s._id,
            name: s.name || "Unknown",
            email: s.email || "",
            department: s.department || "",
            year: inferYearFromBatch(s.batch),
            batch: s.batch || "",
          })),
        )
      }
    } catch { /**/ }
  }

  function inferYearFromBatch(batch?: string): number {
    if (!batch) return 1
    const m = batch.match(/(\d)/)
    return m ? Number(m[1]) : 1
  }

  const fetchAssignments = async () => {
    try {
      const res = await fetch("/api/college/assign-test")
      if (res.ok) {
        const data = await res.json()
        setAssignments(data.assignments || [])
      }
    } catch { /**/ }
  }

  const filteredStudents = students.filter((s) => {
    const q = searchStudents.toLowerCase()
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    const matchDept = filterDept === "all" || s.department === filterDept
    const matchYear = filterYear === "all" || String(s.year) === filterYear
    return matchSearch && matchDept && matchYear
  })

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s._id)))
    }
  }

  const handleAssign = async () => {
    if (!selectedTest) {
      toast({ title: "Error", description: "Please select a test.", variant: "destructive" })
      return
    }

    let ids: string[] = []
    if (assignMode === "batch") {
      ids = students
        .filter((s) => {
          const matchDept = batchDept === "all" || s.department === batchDept
          const matchYear = batchYear === "all" || String(s.year) === batchYear
          return matchDept && matchYear
        })
        .map((s) => s._id)
    } else {
      ids = [...selectedStudentIds]
    }

    if (ids.length === 0) {
      toast({ title: "Error", description: "Select at least one student.", variant: "destructive" })
      return
    }

    setAssigning(true)
    try {
      const res = await fetch("/api/college/assign-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: selectedTest._id,
          testTitle: selectedTest.title,
          studentIds: ids,
          department: batchDept !== "all" ? batchDept : filterDept !== "all" ? filterDept : "",
          year: batchYear !== "all" ? Number(batchYear) : null,
          dueDate: dueDate || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const count = data.assignedCount ?? ids.length
        toast({
          title: "Assigned!",
          description: `Test assigned to ${count} student(s).`,
        })
        if (data.skippedCount > 0) {
          toast({
            title: "Some students skipped",
            description: `${data.skippedCount} student(s) were not onboarded by your college.`,
          })
        }
        setDialogOpen(false)
        setSelectedTest(null)
        setSelectedStudentIds(new Set())
        setDueDate("")
        setActiveTab("assignments")
        await fetchAssignments()
      } else {
        const err = await res.json()
        toast({ title: "Error", description: err.error || "Failed to assign.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" })
    } finally {
      setAssigning(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this assignment?")) return
    try {
      const res = await fetch(`/api/college/assign-test?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: "Removed", description: "Assignment removed." })
        setAssignments((prev) => prev.filter((a) => a._id !== id))
      }
    } catch { /**/ }
  }

  const handleDeleteTest = async (id: string) => {
    if (!window.confirm("Delete this test? Assigned history may still reference it.")) return
    setDeletingTestId(id)
    try {
      const res = await fetch(`/api/college/tests/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: "Deleted", description: "Test removed." })
        setTests((prev) => prev.filter((t) => t._id !== id))
        if (selectedTest?._id === id) setSelectedTest(null)
      } else {
        toast({ title: "Error", description: "Could not delete test.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" })
    } finally {
      setDeletingTestId(null)
    }
  }

  const getTestType = (t: Test) => {
    if (!t.questions?.length) return "mcq"
    if (t.questions.every((q: any) => q.type === "code_snippet")) return "coding"
    if (t.questions.some((q: any) => q.type === "code_snippet")) return "mixed"
    return "mcq"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Test Center</h1>
          <p className="text-muted-foreground mt-1">
            Create MCQ or coding tests and assign them to onboarded students
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/dashboard/college/tests/create">
              <FileText className="h-4 w-4" /> Create MCQ
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/dashboard/college/tests/create/coding">
              <Code2 className="h-4 w-4" /> Create Coding
            </Link>
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 gap-2"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" /> Assign Test
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-purple-50 border-purple-100">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{assignments.length}</p>
              <p className="text-xs text-muted-foreground">Total Assignments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">
                {assignments.reduce((s, a) => s + a.studentIds.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Students Assigned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">
                {assignments.reduce(
                  (s, a) => s + a.completions.filter((c) => c.status === "completed").length,
                  0
                )}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="pt-4 pb-4 px-4 flex items-center gap-3">
            <ClipboardList className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{tests.length}</p>
              <p className="text-xs text-muted-foreground">Available Tests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="tests">My Tests</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {tests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-14 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tests yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create an MCQ quiz or coding challenge, then assign it from here.
                </p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/college/tests/create">Create MCQ</Link>
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700" asChild>
                    <Link href="/dashboard/college/tests/create/coding">Create Coding</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tests.map((t) => {
                const type = getTestType(t)
                return (
                  <Card key={t._id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
                            type === "coding" ? "bg-purple-100" : type === "mixed" ? "bg-orange-100" : "bg-blue-100"
                          }`}>
                            {type === "coding"
                              ? <Code2 className="h-4 w-4 text-purple-600" />
                              : type === "mixed"
                              ? <Zap className="h-4 w-4 text-orange-600" />
                              : <ListOrdered className="h-4 w-4 text-blue-600" />}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">{t.title}</CardTitle>
                            <CardDescription className="text-xs">
                              {t.questions?.length || 0} questions • {t.durationMinutes || 60} min
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-destructive"
                          disabled={deletingTestId === t._id}
                          onClick={() => handleDeleteTest(t._id)}
                        >
                          {deletingTestId === t._id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <Link href={`/dashboard/college/tests/${t._id}/preview`}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <Link href={`/dashboard/college/tests/${t._id}/analytics`}>
                            <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
                          </Link>
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <Link href={`/dashboard/college/tests/${t._id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <Link href={`/dashboard/college/tests/${t._id}/results`}>
                            Results
                          </Link>
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 w-full"
                        onClick={() => {
                          setSelectedTest(t)
                          setDialogOpen(true)
                        }}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" /> Assign
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments">
      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No assignments yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Click "New Assignment" to assign a test to your students.
            </p>
            <Button className="bg-purple-600 hover:bg-purple-700 gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> New Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((a) => {
            const completed = a.completions.filter((c) => c.status === "completed").length
            const pct = a.studentIds.length > 0 ? Math.round((completed / a.studentIds.length) * 100) : 0
            return (
              <Card key={a._id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{a.testTitle}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Assigned {format(new Date(a.assignedAt), "MMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(a._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {a.department && (
                      <Badge variant="secondary" className="text-xs">{a.department}</Badge>
                    )}
                    {a.year && (
                      <Badge variant="outline" className="text-xs">Year {a.year}</Badge>
                    )}
                    {a.dueDate && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        Due {format(new Date(a.dueDate), "MMM d")}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />{a.studentIds.length} students
                    </span>
                    <span>{completed} completed ({pct}%)</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Completion</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" asChild>
                      <Link href={`/dashboard/college/tests/${a.testId}/analytics`}>
                        <BarChart3 className="h-3 w-3 mr-1" /> Analytics
                      </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" asChild>
                      <Link href={`/dashboard/college/tests/${a.testId}/preview`}>
                        <Eye className="h-3 w-3 mr-1" /> Preview
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
        </TabsContent>
      </Tabs>

      {/* Assign Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Test to Students</DialogTitle>
            <DialogDescription>
              Select a test and choose which students to assign it to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Step 1: Pick test */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">1. Select Test</Label>
              {tests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tests yet.{" "}
                  <Link href="/dashboard/college/tests/create" className="text-purple-600 underline">
                    Create an MCQ
                  </Link>
                  {" or "}
                  <Link href="/dashboard/college/tests/create/coding" className="text-purple-600 underline">
                    coding test
                  </Link>
                  .
                </p>
              ) : (
                <div className="grid gap-2 max-h-52 overflow-y-auto pr-1">
                  {tests.map((t) => {
                    const type = getTestType(t)
                    return (
                      <div
                        key={t._id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTest?._id === t._id
                            ? "border-purple-500 bg-purple-50"
                            : "hover:border-muted-foreground/40"
                        }`}
                        onClick={() => setSelectedTest(t)}
                      >
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                          type === "coding" ? "bg-purple-100" : type === "mixed" ? "bg-orange-100" : "bg-blue-100"
                        }`}>
                          {type === "coding"
                            ? <Code2 className="h-4 w-4 text-purple-600" />
                            : type === "mixed"
                            ? <Zap className="h-4 w-4 text-orange-600" />
                            : <ListOrdered className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.questions.length} questions • {t.durationMinutes} min
                          </p>
                        </div>
                        {selectedTest?._id === t._id && (
                          <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Assign mode */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">2. Assignment Mode</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={assignMode === "individual" ? "default" : "outline"}
                  onClick={() => setAssignMode("individual")}
                  className={assignMode === "individual" ? "bg-purple-600 hover:bg-purple-700" : ""}
                >
                  <Users className="h-3.5 w-3.5 mr-1.5" /> Individual
                </Button>
                <Button
                  size="sm"
                  variant={assignMode === "batch" ? "default" : "outline"}
                  onClick={() => setAssignMode("batch")}
                  className={assignMode === "batch" ? "bg-purple-600 hover:bg-purple-700" : ""}
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5" /> Batch
                </Button>
              </div>
            </div>

            {/* Step 3: Select students / batch */}
            {assignMode === "batch" ? (
              <div>
                <Label className="text-sm font-semibold mb-2 block">3. Select Batch</Label>
                <div className="flex gap-3">
                  <Select value={batchDept} onValueChange={setBatchDept}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Department (all)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={batchYear} onValueChange={setBatchYear}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Year (all)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {YEARS.map((y) => <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {students.filter((s) => {
                    const md = batchDept === "all" || s.department === batchDept
                    const my = batchYear === "all" || String(s.year) === batchYear
                    return md && my
                  }).length} students will be assigned
                </p>
              </div>
            ) : (
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  3. Select Students ({selectedStudentIds.size} selected)
                </Label>
                <div className="space-y-2 mb-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search students…"
                        value={searchStudents}
                        onChange={(e) => setSearchStudents(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                    <Select value={filterDept} onValueChange={setFilterDept}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Dept" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Depts</SelectItem>
                        {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filterYear} onValueChange={setFilterYear}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {YEARS.map((y) => <SelectItem key={y} value={String(y)}>Yr {y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                    {selectedStudentIds.size === filteredStudents.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students onboarded yet.</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                    {filteredStudents.map((s) => (
                      <div
                        key={s._id}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          selectedStudentIds.has(s._id) ? "border-purple-400 bg-purple-50" : "hover:bg-muted/40"
                        }`}
                        onClick={() => toggleStudent(s._id)}
                      >
                        <Checkbox checked={selectedStudentIds.has(s._id)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.department} • Year {s.year}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Due date */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">Due Date (optional)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 gap-2"
              onClick={handleAssign}
              disabled={assigning}
            >
              {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Assign Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
