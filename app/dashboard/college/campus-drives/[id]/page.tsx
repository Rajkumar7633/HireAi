"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2, ArrowLeft, Building2, Calendar, MapPin, Users, Download,
  CheckCircle2, XCircle, Clock, Star, Mail, Phone, GraduationCap, Briefcase
} from "lucide-react"
import { format } from "date-fns"

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-100 text-blue-800",
  shortlisted: "bg-yellow-100 text-yellow-800",
  selected: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
}

export default function DriveDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [drive, setDrive] = useState<any>(null)
  const [applicants, setApplicants] = useState<any[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [tab, setTab] = useState(searchParams.get("tab") || "overview")

  useEffect(() => {
    if (id) fetchDrive()
  }, [id])

  async function fetchDrive() {
    setLoading(true)
    try {
      const res = await fetch(`/api/college/campus-drives/${id}`)
      const data = await res.json()
      setDrive(data.drive)
      setApplicants(data.applicants || [])
    } catch { /**/ }
    finally { setLoading(false) }
  }

  async function updateStatus(applicationId: string, status: string) {
    setUpdating(applicationId)
    try {
      const res = await fetch(`/api/college/campus-drives/${id}/applicants`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, status }),
      })
      if (res.ok) {
        setApplicants(prev => prev.map(a => a._id === applicationId ? { ...a, status } : a))
      }
    } catch { /**/ }
    finally { setUpdating(null) }
  }

  async function updateDriveStatus(status: string) {
    const res = await fetch(`/api/college/campus-drives/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const data = await res.json()
      setDrive(data.drive)
    }
  }

  function downloadCSV() {
    const headers = ["Name", "Email", "Phone", "CGPA", "Department", "Batch", "Skills", "Status", "Applied At"]
    const rows = applicants.map(a => [
      a.studentSnapshot?.name || "",
      a.studentSnapshot?.email || "",
      a.studentSnapshot?.phone || "",
      a.studentSnapshot?.cgpa || "",
      a.studentSnapshot?.department || "",
      a.studentSnapshot?.batch || "",
      (a.studentSnapshot?.skills || []).join("; "),
      a.status,
      a.appliedAt ? format(new Date(a.appliedAt), "dd/MM/yyyy") : "",
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${drive?.companyName || "drive"}_applicants.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="dashboard-loading"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
  if (!drive) return <div className="p-8 text-center text-gray-500">Drive not found</div>

  const statusCounts = applicants.reduce((acc: any, a) => { acc[a.status] = (acc[a.status]||0)+1; return acc }, {})

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center font-bold text-purple-700 text-lg">
              {drive.companyName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{drive.companyName}</h1>
              <p className="text-gray-500">{drive.role} · {drive.jobType}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={drive.status} onValueChange={updateDriveStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: applicants.length, color: "text-gray-700" },
          { label: "Applied", value: statusCounts.applied || 0, color: "text-blue-600" },
          { label: "Shortlisted", value: statusCounts.shortlisted || 0, color: "text-yellow-600" },
          { label: "Selected", value: statusCounts.selected || 0, color: "text-green-600" },
          { label: "Rejected", value: statusCounts.rejected || 0, color: "text-red-600" },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applicants">Applicants ({applicants.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Drive Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  { icon: Calendar, label: "Drive Date", val: drive.driveDate ? format(new Date(drive.driveDate), "dd MMM yyyy") : "TBD" },
                  { icon: Clock, label: "Deadline", val: drive.applicationDeadline ? format(new Date(drive.applicationDeadline), "dd MMM yyyy") : "TBD" },
                  { icon: MapPin, label: "Location", val: drive.location || drive.venue || "TBD" },
                  { icon: Briefcase, label: "Package", val: drive.packageMin || drive.packageMax ? `₹${drive.packageMin}–${drive.packageMax} LPA` : "Not specified" },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <row.icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500 w-24">{row.label}</span>
                    <span className="font-medium">{row.val}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Eligibility</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {drive.eligibility?.minCGPA > 0 && <div><span className="text-gray-500">Min CGPA: </span><span className="font-medium">{drive.eligibility.minCGPA}</span></div>}
                {drive.eligibility?.branches?.length > 0 && (
                  <div>
                    <p className="text-gray-500 mb-1">Branches:</p>
                    <div className="flex flex-wrap gap-1">{drive.eligibility.branches.map((b: string) => <span key={b} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">{b}</span>)}</div>
                  </div>
                )}
                {drive.eligibility?.batches?.length > 0 && (
                  <div>
                    <p className="text-gray-500 mb-1">Batches:</p>
                    <div className="flex flex-wrap gap-1">{drive.eligibility.batches.map((b: string) => <span key={b} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{b}</span>)}</div>
                  </div>
                )}
                <div><span className="text-gray-500">Backlogs: </span><span className="font-medium">{drive.eligibility?.backlogsAllowed ? "Allowed" : "Not Allowed"}</span></div>
              </CardContent>
            </Card>
          </div>
          {drive.description && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-gray-700 whitespace-pre-line">{drive.description}</p></CardContent>
            </Card>
          )}
          {drive.rounds?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-semibold text-gray-700">Interview Rounds</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {drive.rounds.map((r: string, i: number) => (
                    <span key={r} className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm">
                      <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">{i+1}</span>{r}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Applicants Tab */}
        <TabsContent value="applicants" className="mt-4">
          {applicants.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No applicants yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applicants.map(app => (
                <Card key={app._id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center font-semibold text-purple-700 flex-shrink-0">
                          {app.studentSnapshot?.name?.[0] || "S"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{app.studentSnapshot?.name}</span>
                            <Badge className={`text-xs ${STATUS_COLORS[app.status]}`}>{app.status}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{app.studentSnapshot?.email}</span>
                            {app.studentSnapshot?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{app.studentSnapshot.phone}</span>}
                            <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{app.studentSnapshot?.department} · Batch {app.studentSnapshot?.batch}</span>
                            <span className="flex items-center gap-1"><Star className="h-3 w-3" />CGPA: <strong>{app.studentSnapshot?.cgpa}</strong></span>
                          </div>
                          {app.studentSnapshot?.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {app.studentSnapshot.skills.slice(0,5).map((s: string) => (
                                <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{s}</span>
                              ))}
                              {app.studentSnapshot.skills.length > 5 && <span className="text-xs text-gray-400">+{app.studentSnapshot.skills.length-5}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        {app.status !== "selected" && app.status !== "rejected" && (
                          <>
                            <Button size="sm" className="h-7 text-xs bg-yellow-500 hover:bg-yellow-600 text-white"
                              disabled={updating === app._id} onClick={() => updateStatus(app._id, "shortlisted")}>
                              {updating===app._id?<Loader2 className="h-3 w-3 animate-spin"/>:"Shortlist"}
                            </Button>
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700"
                              disabled={updating === app._id} onClick={() => updateStatus(app._id, "selected")}>
                              Select
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                              disabled={updating === app._id} onClick={() => updateStatus(app._id, "rejected")}>
                              Reject
                            </Button>
                          </>
                        )}
                        {app.studentSnapshot?.resumeUrl && (
                          <a href={app.studentSnapshot.resumeUrl} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline" className="h-7 text-xs w-full">Resume</Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
