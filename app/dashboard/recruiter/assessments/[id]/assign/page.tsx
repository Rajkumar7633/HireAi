"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Users, ArrowLeft, Search, UserCheck, Briefcase } from "lucide-react"

interface AppCandidate {
  _id: string
  jobSeekerId: { _id: string; name: string; email: string }
  jobDescriptionId: { _id: string; title: string }
  status: string
}

interface DirectUser {
  _id: string
  name: string
  email: string
  skills?: string[]
  department?: string
}

type TabKey = "applicants" | "users"

export default function AssignAssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const assessmentId = params.id as string
  const { toast } = useToast()

  const [tab, setTab] = useState<TabKey>("applicants")
  const [assessment, setAssessment] = useState<any>(null)

  // Applicants tab state
  const [applicants, setApplicants] = useState<AppCandidate[]>([])
  const [applicantsLoading, setApplicantsLoading] = useState(true)
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([])

  // Users tab state
  const [users, setUsers] = useState<DirectUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    if (!assessmentId) return
    fetch(`/api/assessments/${assessmentId}`)
      .then((r) => r.json())
      .then((d) => setAssessment(d.assessment))
      .catch(console.error)
    fetchApplicants()
  }, [assessmentId])

  const fetchApplicants = async () => {
    setApplicantsLoading(true)
    try {
      const res = await fetch("/api/applications/unassigned")
      if (res.ok) {
        const data = await res.json()
        setApplicants(data.applications || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setApplicantsLoading(false)
    }
  }

  const fetchUsers = useCallback(async (q = "") => {
    setUsersLoading(true)
    try {
      const res = await fetch(`/api/users/job-seekers?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  // Load users when tab switches to "users"
  useEffect(() => {
    if (tab === "users" && users.length === 0) fetchUsers()
  }, [tab])

  // Debounce search
  useEffect(() => {
    if (tab !== "users") return
    const t = setTimeout(() => fetchUsers(userSearch), 350)
    return () => clearTimeout(t)
  }, [userSearch])

  const toggleApp = (id: string) =>
    setSelectedAppIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const toggleUser = (id: string) =>
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const totalSelected =
    tab === "applicants" ? selectedAppIds.length : selectedUserIds.length

  const handleAssign = async () => {
    if (totalSelected === 0) {
      toast({ title: "No candidates selected", variant: "destructive" })
      return
    }

    setAssigning(true)
    try {
      const body: any = { assessmentId }
      if (tab === "applicants") body.applicationIds = selectedAppIds
      else body.userIds = selectedUserIds

      const res = await fetch("/api/assessments/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      toast({
        title: "Assessment assigned",
        description: data.message,
      })
      router.push("/dashboard/recruiter/assessments")
    } catch (e: any) {
      toast({ title: "Assignment failed", description: e.message, variant: "destructive" })
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="p-6 space-y-6 w-full">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Assign Assessment</h1>
          <p className="text-muted-foreground text-sm">
            {assessment ? `"${assessment.title}"` : "Loading…"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${tab === "applicants" ? "border-b-2 border-blue-600 text-blue-600" : "text-muted-foreground"}`}
          onClick={() => setTab("applicants")}
        >
          <Briefcase className="h-4 w-4" />
          Job Applicants
          {applicants.length > 0 && (
            <Badge variant="outline" className="text-xs">{applicants.length}</Badge>
          )}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${tab === "users" ? "border-b-2 border-blue-600 text-blue-600" : "text-muted-foreground"}`}
          onClick={() => setTab("users")}
        >
          <Users className="h-4 w-4" />
          All Job Seekers
        </button>
      </div>

      {/* ── Applicants Tab ── */}
      {tab === "applicants" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Candidates who applied to your jobs</CardTitle>
            <CardDescription>
              These candidates applied for your job postings and haven&apos;t been assigned this assessment yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {applicantsLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading applicants…
              </div>
            ) : applicants.length === 0 ? (
              <div className="py-12 text-center">
                <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="font-medium text-sm">No pending applicants</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Switch to the &quot;All Job Seekers&quot; tab to assign directly to any registered user.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {applicants.map((c) => (
                  <label
                    key={c._id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedAppIds.includes(c._id)}
                      onCheckedChange={() => toggleApp(c._id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{c.jobSeekerId?.name}</p>
                      <p className="text-xs text-muted-foreground">{c.jobSeekerId?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Applied for: {c.jobDescriptionId?.title}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{c.status}</Badge>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── All Users Tab ── */}
      {tab === "users" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Search all registered job seekers</CardTitle>
            <CardDescription>
              Assign this assessment to any job seeker, even if they haven&apos;t applied to your jobs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {usersLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Searching…
              </div>
            ) : users.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No job seekers found{userSearch ? ` for "${userSearch}"` : ""}.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {users.map((u) => (
                  <label
                    key={u._id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedUserIds.includes(u._id)}
                      onCheckedChange={() => toggleUser(u._id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      {u.skills && u.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {u.skills.slice(0, 4).map((s) => (
                            <Badge key={s} variant="outline" className="text-xs py-0">{s}</Badge>
                          ))}
                          {u.skills.length > 4 && (
                            <Badge variant="outline" className="text-xs py-0">+{u.skills.length - 4}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedUserIds.includes(u._id) && (
                      <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
                    )}
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalSelected > 0
            ? `${totalSelected} candidate${totalSelected !== 1 ? "s" : ""} selected`
            : "No candidates selected"}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={totalSelected === 0 || assigning}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
          >
            {assigning ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning…</>
            ) : (
              `Assign to ${totalSelected} Candidate${totalSelected !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
