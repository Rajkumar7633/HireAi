"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, Building2, Calendar, MapPin, Users, CheckCircle2,
  XCircle, AlertCircle, Send, MessageSquare, Briefcase, Clock
} from "lucide-react"
import { format } from "date-fns"

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-100 text-blue-700",
  shortlisted: "bg-yellow-100 text-yellow-700",
  selected: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
}

export default function CampusDrivesPage() {
  const [loading, setLoading] = useState(true)
  const [drives, setDrives] = useState<any[]>([])
  const [student, setStudent] = useState<any>(null)
  const [applying, setApplying] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [noCollege, setNoCollege] = useState(false)

  useEffect(() => { fetchDrives() }, [])

  async function fetchDrives() {
    setLoading(true)
    try {
      const res = await fetch("/api/job-seeker/campus-drives")
      const data = await res.json()
      if (data.message === "No college linked") { setNoCollege(true) }
      else { setDrives(data.drives || []); setStudent(data.student) }
    } catch { /**/ }
    finally { setLoading(false) }
  }

  async function applyToDrive(driveId: string) {
    setApplying(driveId)
    setMessage("")
    try {
      const res = await fetch(`/api/job-seeker/campus-drives/${driveId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage("Applied successfully!")
        setDrives(prev => prev.map(d => d._id === driveId ? { ...d, applied: true, applicationStatus: "applied", canApply: false } : d))
      } else {
        setMessage(data.error || "Failed to apply")
      }
    } catch { setMessage("Something went wrong") }
    finally { setApplying(null) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>

  if (noCollege) return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="text-center py-16">
        <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold mb-2">No College Linked</h2>
        <p className="text-gray-500 mb-4">Your account is not linked to any college yet. Contact your placement cell to get onboarded.</p>
      </div>
    </div>
  )

  const eligible = drives.filter(d => d.eligible && d.status === "active")
  const notEligible = drives.filter(d => !d.eligible && d.status === "active")
  const completed = drives.filter(d => d.status === "completed")

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-purple-600" /> Campus Drives</h1>
          <p className="text-sm text-gray-500 mt-0.5">Hiring drives from your college placement cell</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/job-seeker/contact-college">
            <MessageSquare className="h-4 w-4 mr-2" /> Contact College
          </Link>
        </Button>
      </div>

      {student && (
        <div className="flex flex-wrap gap-3 text-sm">
          {student.cgpa && <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">CGPA: <strong>{student.cgpa}</strong></span>}
          {student.department && <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full">{student.department}</span>}
          {student.batch && <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">Batch {student.batch}</span>}
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${message.includes("success") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message}
        </div>
      )}

      {/* Eligible Drives */}
      {eligible.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-green-700 flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="h-4 w-4" /> You are Eligible ({eligible.length})
          </h2>
          <div className="space-y-3">
            {eligible.map(drive => <DriveCard key={drive._id} drive={drive} onApply={applyToDrive} applying={applying} />)}
          </div>
        </div>
      )}

      {/* Not Eligible Drives */}
      {notEligible.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-red-600 flex items-center gap-1.5 mb-3">
            <XCircle className="h-4 w-4" /> Not Eligible ({notEligible.length})
          </h2>
          <div className="space-y-3">
            {notEligible.map(drive => <DriveCard key={drive._id} drive={drive} onApply={applyToDrive} applying={applying} />)}
          </div>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-1.5 mb-3">
            <Clock className="h-4 w-4" /> Completed Drives ({completed.length})
          </h2>
          <div className="space-y-3">
            {completed.map(drive => <DriveCard key={drive._id} drive={drive} onApply={applyToDrive} applying={applying} />)}
          </div>
        </div>
      )}

      {drives.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No drives yet</p>
          <p className="text-sm mt-1">Your college hasn't posted any campus drives yet</p>
        </div>
      )}
    </div>
  )
}

function DriveCard({ drive, onApply, applying }: { drive: any; onApply: (id: string) => void; applying: string | null }) {
  return (
    <Card className={`border-l-4 hover:shadow-sm transition-shadow ${drive.eligible ? "border-l-green-400" : "border-l-red-300"}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center font-bold text-purple-700 text-sm flex-shrink-0">
              {drive.companyName?.[0] || "C"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold">{drive.companyName}</span>
                <span className="text-sm text-gray-500">· {drive.role}</span>
                {drive.applied && (
                  <Badge className={`text-xs ${STATUS_COLORS[drive.applicationStatus] || "bg-gray-100 text-gray-600"}`}>
                    {drive.applicationStatus}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {drive.driveDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(drive.driveDate), "dd MMM yyyy")}</span>}
                {(drive.location || drive.venue) && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{drive.location || drive.venue}</span>}
                {(drive.packageMin || drive.packageMax) && <span className="text-green-700 font-medium">₹{drive.packageMin}–{drive.packageMax} LPA</span>}
                <span>{drive.jobType || "Full Time"}</span>
              </div>
              {!drive.eligible && drive.eligibilityReasons?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {drive.eligibilityReasons.map((r: string, i: number) => (
                    <span key={i} className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                      <XCircle className="h-3 w-3" />{r}
                    </span>
                  ))}
                </div>
              )}
              {drive.eligibility?.branches?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {drive.eligibility.branches.map((b: string) => <span key={b} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{b}</span>)}
                  {drive.eligibility.minCGPA > 0 && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">CGPA ≥{drive.eligibility.minCGPA}</span>}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {drive.canApply ? (
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                disabled={applying === drive._id} onClick={() => onApply(drive._id)}>
                {applying === drive._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5 mr-1" />Apply</>}
              </Button>
            ) : drive.applied ? (
              <span className="text-xs text-center text-gray-500 px-2 py-1 bg-gray-50 rounded">Applied</span>
            ) : !drive.eligible ? (
              <Button size="sm" variant="outline" className="text-xs text-purple-600" asChild>
                <Link href={`/dashboard/job-seeker/contact-college?type=eligibility_dispute&drive=${drive._id}`}>
                  <MessageSquare className="h-3 w-3 mr-1" /> Dispute
                </Link>
              </Button>
            ) : drive.deadlinePassed ? (
              <span className="text-xs text-red-500 text-center">Deadline passed</span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
