"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Loader2, Plus, Building2, Calendar, Users, MapPin, Search,
  Eye, Briefcase, CheckCircle2, Clock, XCircle, ArrowRight,
  Download, Bell, Filter,
} from "lucide-react"
import { format } from "date-fns"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  active:    { label: "Active",     color: "bg-green-100 text-green-800 border-green-200",  icon: CheckCircle2 },
  draft:     { label: "Draft",      color: "bg-gray-100 text-gray-700 border-gray-200",     icon: Clock },
  completed: { label: "Completed",  color: "bg-blue-100 text-blue-800 border-blue-200",     icon: CheckCircle2 },
  cancelled: { label: "Cancelled",  color: "bg-red-100 text-red-800 border-red-200",        icon: XCircle },
}

export default function CampusDrivesPage() {
  const [loading, setLoading] = useState(true)
  const [drives, setDrives] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => { fetchDrives() }, [])

  async function fetchDrives() {
    setLoading(true)
    try {
      const res = await fetch("/api/college/campus-drives")
      const data = await res.json()
      setDrives(data.drives || [])
    } catch { setDrives([]) }
    finally { setLoading(false) }
  }

  const filtered = drives.filter(d => {
    const matchSearch = !search || d.companyName?.toLowerCase().includes(search.toLowerCase()) || d.role?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || d.status === statusFilter
    return matchSearch && matchStatus
  })

  const stats = {
    total: drives.length,
    active: drives.filter(d => d.status === "active").length,
    completed: drives.filter(d => d.status === "completed").length,
    totalApplicants: drives.reduce((sum, d) => sum + (d.applicantCount || 0), 0),
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
    </div>
  )

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-purple-600" /> Campus Drives
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage placement drives for your students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/college/partnerships">
              <Building2 className="h-4 w-4 mr-2" /> Company partners
            </Link>
          </Button>
          <Button asChild className="bg-purple-600 hover:bg-purple-700">
            <Link href="/dashboard/college/campus-drives/create">
              <Plus className="h-4 w-4 mr-2" /> New Drive
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Drives", value: stats.total, icon: Building2, color: "text-purple-600 bg-purple-50" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-green-600 bg-green-50" },
          { label: "Completed", value: stats.completed, icon: Briefcase, color: "text-blue-600 bg-blue-50" },
          { label: "Total Applicants", value: stats.totalApplicants, icon: Users, color: "text-orange-600 bg-orange-50" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search company or role..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drive Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium text-lg">No campus drives yet</p>
          <p className="text-sm mt-1">Create your first drive to start hiring for your students</p>
          <Button asChild className="mt-4 bg-purple-600 hover:bg-purple-700">
            <Link href="/dashboard/college/campus-drives/create">
              <Plus className="h-4 w-4 mr-2" /> Create First Drive
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((drive) => {
            const statusCfg = STATUS_CONFIG[drive.status] || STATUS_CONFIG.draft
            const Icon = statusCfg.icon
            return (
              <Card key={drive._id} className="border hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center font-bold text-purple-700 flex-shrink-0 text-sm">
                          {drive.companyName?.[0] || "C"}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{drive.companyName}</h3>
                          <p className="text-sm text-gray-500">{drive.role} · {drive.jobType || "Full Time"}</p>
                        </div>
                        <Badge className={`ml-1 text-xs px-2 py-0.5 border ${statusCfg.color} font-medium`}>
                          <Icon className="h-3 w-3 mr-1 inline" />{statusCfg.label}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Drive: {drive.driveDate ? format(new Date(drive.driveDate), "dd MMM yyyy") : "TBD"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {drive.location || drive.venue || "TBD"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {drive.applicantCount || drive.totalApplicants || 0} Applicants
                        </span>
                        {(drive.packageMin || drive.packageMax) && (
                          <span className="flex items-center gap-1 text-green-700 font-medium">
                            ₹{drive.packageMin}–{drive.packageMax} LPA
                          </span>
                        )}
                      </div>

                      {drive.eligibility?.branches?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {drive.eligibility.branches.map((b: string) => (
                            <span key={b} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{b}</span>
                          ))}
                          {drive.eligibility.minCGPA > 0 && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              CGPA ≥ {drive.eligibility.minCGPA}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button size="sm" asChild className="bg-purple-600 hover:bg-purple-700">
                        <Link href={`/dashboard/college/drive-shortlist?driveId=${drive._id}`}>
                          <Filter className="h-3.5 w-3.5 mr-1" /> Shortlist
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/college/campus-drives/${drive._id}`}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Manage
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/dashboard/college/campus-drives/${drive._id}?tab=applicants`}>
                          <Download className="h-3.5 w-3.5 mr-1" /> Applicants
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
