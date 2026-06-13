"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow, isFuture } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Users,
  X,
  Briefcase,
  Handshake,
  Bell,
  ExternalLink,
  IndianRupee,
  Activity,
} from "lucide-react"
import {
  ActivityTimeline,
  CampusPipelineGuide,
  InvitePipelineProgress,
} from "@/components/campus-drive-pipeline-card"

interface College {
  _id: string
  name: string
  email: string
  collegeName: string
  collegeLocation: string
  totalStudents?: number
  placementRate?: number
}

interface Invite {
  _id: string
  collegeName: string
  companyName?: string
  collegeId?: { name?: string; collegeName?: string; collegeLocation?: string; email?: string }
  recruiterId?: { name?: string; companyName?: string; email?: string }
  driveTitle: string
  driveDate: string
  roles: string[]
  description: string
  location?: string
  packageMin?: number
  packageMax?: number
  initiatedBy: "college" | "recruiter"
  createdByRole?: "college" | "recruiter"
  status: "pending" | "accepted" | "declined" | "cancelled"
  linkedDriveId?: string
  createdAt: string
  updatedAt?: string
}

interface DashboardData {
  profile: { companyName: string }
  stats: {
    receivedPending: number
    sentPending: number
    accepted: number
    declined: number
    upcoming: number
    collegesAvailable: number
    activePartnerships: number
    liveDrives?: number
  }
  receivedInvites: Invite[]
  sentInvites: Invite[]
  colleges: College[]
  partnerships: any[]
  activity?: Array<{
    id: string
    title: string
    status: string
    initiatedBy: string
    companyName?: string
    collegeName?: string
    updatedAt: string
    linkedDriveId?: string
  }>
}

const EMPTY_FORM = {
  collegeId: "",
  collegeEmail: "",
  driveTitle: "",
  driveDate: "",
  roles: "",
  description: "",
  location: "",
  packageMin: "",
  packageMax: "",
}

export default function RecruiterCampusDrivesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [collegeSearch, setCollegeSearch] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [inviteFilter, setInviteFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("overview")
  const [updating, setUpdating] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [browseColleges, setBrowseColleges] = useState<College[]>([])

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      const res = await fetch("/api/recruiter/campus-drives", {
        credentials: "include",
        cache: "no-store",
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setBrowseColleges(json.colleges || [])
      } else if (!silent) {
        const err = await res.json().catch(() => ({}))
        toast({
          title: "Failed to load",
          description: err.message || "Could not fetch campus drive data.",
          variant: "destructive",
        })
      }
    } catch {
      toast({ title: "Failed to load", description: "Could not fetch campus drive data.", variant: "destructive" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [toast])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const searchColleges = async () => {
    try {
      const params = new URLSearchParams()
      if (collegeSearch) params.set("q", collegeSearch)
      if (locationFilter) params.set("location", locationFilter)
      const res = await fetch(`/api/recruiter/colleges?${params}`, { credentials: "include" })
      if (res.ok) {
        const json = await res.json()
        setBrowseColleges(json.colleges || [])
      }
    } catch {}
  }

  const respond = async (id: string, status: "accepted" | "declined") => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/college/campus-drive-invites/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast({
          title: status === "accepted" ? "Accepted — drive publishing" : "Invitation declined",
          description:
            status === "accepted"
              ? "A campus drive will be published for college students."
              : `Campus drive invitation ${status}.`,
        })
        loadDashboard(true)
      } else {
        const d = await res.json()
        toast({ title: "Error", description: d.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  const cancelInvite = async (id: string) => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/college/campus-drive-invites/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        toast({ title: "Cancelled", description: "Proposal withdrawn." })
        loadDashboard(true)
      }
    } catch {
      toast({ title: "Failed to cancel", variant: "destructive" })
    } finally {
      setUpdating(null)
    }
  }

  const sendProposal = async () => {
    if (!form.driveTitle || !form.driveDate || (!form.collegeId && !form.collegeEmail)) {
      toast({ title: "Missing fields", description: "Select a college, title and date.", variant: "destructive" })
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/recruiter/campus-drives", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (res.ok) {
        toast({ title: "Proposal sent", description: json.message })
        setSendOpen(false)
        setForm(EMPTY_FORM)
        setSelectedCollege(null)
        setActiveTab("sent")
        if (json.invite) {
          setData((prev) => {
            if (!prev) return prev
            const sent = [json.invite, ...prev.sentInvites.filter((i) => i._id !== json.invite._id)]
            return {
              ...prev,
              sentInvites: sent,
              stats: {
                ...prev.stats,
                sentPending: sent.filter((i) => i.status === "pending").length,
              },
              activity: [
                {
                  id: json.invite._id,
                  title: json.invite.driveTitle,
                  status: json.invite.status,
                  initiatedBy: "recruiter",
                  collegeName: json.invite.collegeName,
                  updatedAt: json.invite.createdAt,
                },
                ...(prev.activity || []),
              ],
            }
          })
        }
        loadDashboard(true)
      } else {
        toast({ title: "Could not send", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const openSendToCollege = (college: College) => {
    setSelectedCollege(college)
    setForm({
      ...EMPTY_FORM,
      collegeId: college._id,
      collegeEmail: college.email,
    })
    setSendOpen(true)
  }

  const statusBadge = (status: Invite["status"]) => {
    switch (status) {
      case "accepted":
        return (
          <Badge className="bg-green-600 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" />Accepted
          </Badge>
        )
      case "declined":
        return (
          <Badge variant="destructive">
            <X className="h-3 w-3 mr-1" />Declined
          </Badge>
        )
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>
      default:
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-400">
            <Clock className="h-3 w-3 mr-1" />Pending
          </Badge>
        )
    }
  }

  const filteredReceived = useMemo(() => {
    const list = data?.receivedInvites || []
    if (inviteFilter === "all") return list
    return list.filter((i) => i.status === inviteFilter)
  }, [data?.receivedInvites, inviteFilter])

  const filteredSent = useMemo(() => {
    const list = data?.sentInvites || []
    if (inviteFilter === "all") return list
    return list.filter((i) => i.status === inviteFilter)
  }, [data?.sentInvites, inviteFilter])

  const upcomingDrives = useMemo(() => {
    const all = [...(data?.receivedInvites || []), ...(data?.sentInvites || [])]
    return all
      .filter((i) => i.status === "accepted" && isFuture(new Date(i.driveDate)))
      .sort((a, b) => new Date(a.driveDate).getTime() - new Date(b.driveDate).getTime())
      .slice(0, 5)
  }, [data])

  const exportCsv = () => {
    const rows = [
      ["Type", "College", "Title", "Date", "Status", "Roles"],
      ...(data?.receivedInvites || []).map((i) => [
        "Received",
        i.collegeName,
        i.driveTitle,
        format(new Date(i.driveDate), "yyyy-MM-dd"),
        i.status,
        i.roles.join("; "),
      ]),
      ...(data?.sentInvites || []).map((i) => [
        "Sent",
        i.collegeName,
        i.driveTitle,
        format(new Date(i.driveDate), "yyyy-MM-dd"),
        i.status,
        i.roles.join("; "),
      ]),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "campus-drives.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const stats = data?.stats

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-purple-600" />
            Campus Drive Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse colleges, send drive proposals, and manage invitations from placement cells
          </p>
          {data?.profile?.companyName && (
            <p className="text-sm text-purple-700 mt-1 flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              Representing {data.profile.companyName}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => loadDashboard(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Link>
          </Button>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => setSendOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Send Proposal
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Pending received", value: stats?.receivedPending ?? 0, color: "text-amber-600" },
          { label: "Pending sent", value: stats?.sentPending ?? 0, color: "text-blue-600" },
          { label: "Accepted", value: stats?.accepted ?? 0, color: "text-green-600" },
          { label: "Upcoming drives", value: stats?.upcoming ?? 0, color: "text-purple-600" },
          { label: "Colleges", value: stats?.collegesAvailable ?? 0, color: "text-indigo-600" },
          { label: "Live drives", value: stats?.liveDrives ?? 0, color: "text-teal-600" },
          { label: "Partnerships", value: stats?.activePartnerships ?? 0, color: "text-emerald-600" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CampusPipelineGuide role="recruiter" />

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        {[
          { href: "/dashboard/recruiter/tests", label: "Assign tests", icon: Briefcase },
          { href: "/dashboard/recruiter/jobs", label: "Post jobs", icon: Building2 },
          { href: "/dashboard/recruiter/candidates", label: "Candidates", icon: Users },
        ].map((link) => (
          <Button key={link.href} variant="outline" size="sm" asChild>
            <Link href={link.href}>
              <link.icon className="h-4 w-4 mr-2" />
              {link.label}
              <ArrowUpRight className="h-3 w-3 ml-1 opacity-50" />
            </Link>
          </Button>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="colleges">Browse colleges</TabsTrigger>
          <TabsTrigger value="received">
            Received
            {(stats?.receivedPending ?? 0) > 0 && (
              <Badge className="ml-2 h-5 px-1.5 bg-amber-500">{stats?.receivedPending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent proposals</TabsTrigger>
          <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  College invitations for your company
                </CardTitle>
                <CardDescription>
                  Only when a college invites EPAM — accept or decline here
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data?.receivedInvites || []).filter((i) => i.status === "pending").length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No pending invitations</p>
                    <Button size="sm" className="mt-3" variant="outline" asChild>
                      <Link href="#colleges" onClick={() => document.querySelector('[value="colleges"]')?.dispatchEvent(new Event("click", { bubbles: true }))}>
                        Browse colleges to send a proposal
                      </Link>
                    </Button>
                  </div>
                ) : (
                  (data?.receivedInvites || [])
                    .filter((i) => i.status === "pending")
                    .slice(0, 3)
                    .map((invite) => (
                      <div key={invite._id} className="p-3 rounded-lg border bg-amber-50/50 space-y-2">
                        <p className="font-medium">{invite.driveTitle}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {invite.collegeName}
                          {invite.location && (
                            <>
                              <span>·</span>
                              <MapPin className="h-3.5 w-3.5" />
                              {invite.location}
                            </>
                          )}
                        </p>
                        {invite.roles?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {invite.roles.map((r) => (
                              <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                            ))}
                          </div>
                        )}
                        <InvitePipelineProgress invite={invite} />
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={updating === invite._id}
                            onClick={() => respond(invite._id, "accepted")}
                          >
                            Accept invitation
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updating === invite._id}
                            onClick={() => respond(invite._id, "declined")}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-purple-500" />
                  Recent activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline role="recruiter" items={data?.activity || []} />
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Upcoming drives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingDrives.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No confirmed upcoming drives</p>
                ) : (
                  upcomingDrives.map((d) => (
                    <div key={d._id} className="flex justify-between items-start p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{d.driveTitle}</p>
                        <p className="text-sm text-muted-foreground">{d.collegeName}</p>
                        {d.linkedDriveId && (
                          <Badge className="mt-1 bg-green-600 text-[10px]">Drive live for students</Badge>
                        )}
                      </div>
                      <Badge variant="outline">{format(new Date(d.driveDate), "MMM dd")}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-indigo-500" />
                  Featured colleges
                </CardTitle>
                <CardDescription>{stats?.collegesAvailable ?? 0} colleges on HireAI</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(data?.colleges || []).slice(0, 3).map((college) => (
                  <div key={college._id} className="flex items-center justify-between gap-2 p-2 rounded-lg border">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{college.collegeName}</p>
                      <p className="text-xs text-muted-foreground truncate">{college.collegeLocation || college.email}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openSendToCollege(college)}>
                      Propose
                    </Button>
                  </div>
                ))}
                {(data?.colleges?.length ?? 0) > 3 && (
                  <Button variant="link" className="px-0" asChild>
                    <Link href="#" onClick={(e) => { e.preventDefault(); (document.querySelector('[value="colleges"]') as HTMLElement)?.click() }}>
                      View all colleges →
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Browse colleges */}
        <TabsContent value="colleges" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search college name or email..."
                className="pl-9"
                value={collegeSearch}
                onChange={(e) => setCollegeSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchColleges()}
              />
            </div>
            <Input
              placeholder="Location filter"
              className="max-w-[180px]"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
            <Button onClick={searchColleges}>Search</Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {browseColleges.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No colleges found. Try a different search.
                </CardContent>
              </Card>
            ) : (
              browseColleges.map((college) => (
                <Card key={college._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center font-bold text-purple-700">
                        {(college.collegeName || college.name)?.[0] || "C"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{college.collegeName || college.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {college.collegeLocation || "Location not set"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {(college.totalStudents ?? 0) > 0 && (
                        <Badge variant="secondary">{college.totalStudents} students</Badge>
                      )}
                      {(college.placementRate ?? 0) > 0 && (
                        <Badge variant="outline">{college.placementRate}% placement</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {college.email}
                    </p>
                    <Button
                      size="sm"
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={() => openSendToCollege(college)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Propose campus drive
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Received — college invited this company */}
        <TabsContent value="received" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Proposals sent <strong>by colleges</strong> to your company ({data?.profile?.companyName || "you"}). You accept or decline.
          </p>
          <div className="flex gap-3 items-center">
            <Select value={inviteFilter} onValueChange={setInviteFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredReceived.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <GraduationCap className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-semibold">No invitations yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Colleges will invite you here, or browse colleges to send a proposal.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredReceived.map((invite) => (
              <InviteCard
                key={invite._id}
                invite={invite}
                updating={updating}
                statusBadge={statusBadge}
                onAccept={() => respond(invite._id, "accepted")}
                onDecline={() => respond(invite._id, "declined")}
                showActions={invite.status === "pending"}
              />
            ))
          )}
        </TabsContent>

        {/* Sent — recruiter proposed to college */}
        <TabsContent value="sent" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Proposals <strong>you sent</strong> to colleges — waiting for the college to accept or decline.
          </p>
          {filteredSent.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Send className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-40" />
                <h3 className="text-lg font-semibold">No proposals sent</h3>
                <Button className="mt-4 bg-purple-600" onClick={() => setSendOpen(true)}>
                  Send your first proposal
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredSent.map((invite) => (
              <InviteCard
                key={invite._id}
                invite={invite}
                updating={updating}
                statusBadge={statusBadge}
                showActions={invite.status === "pending"}
                onCancel={() => cancelInvite(invite._id)}
                isSent
              />
            ))
          )}
        </TabsContent>

        {/* Partnerships */}
        <TabsContent value="partnerships" className="space-y-4">
          {(data?.partnerships || []).length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Handshake className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-40" />
                <p className="text-muted-foreground">Accept invitations to build active partnerships</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {(data?.partnerships || []).map((p: any) => (
                <Card key={p._id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{p.companyName}</p>
                      <p className="text-sm text-muted-foreground">{p.partnershipType}</p>
                    </div>
                    <Badge className="bg-green-600">{p.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Send proposal dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Propose campus drive</DialogTitle>
            <DialogDescription>
              Send a drive proposal to a college placement cell
              {selectedCollege && ` — ${selectedCollege.collegeName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedCollege && (
              <div>
                <Label>College email</Label>
                <Input
                  type="email"
                  placeholder="placement@college.edu"
                  value={form.collegeEmail}
                  onChange={(e) => setForm({ ...form, collegeEmail: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Drive title</Label>
              <Input
                placeholder="e.g. Software Engineer Campus Drive 2026"
                value={form.driveTitle}
                onChange={(e) => setForm({ ...form, driveTitle: e.target.value })}
              />
            </div>
            <div>
              <Label>Drive date</Label>
              <Input
                type="date"
                value={form.driveDate}
                onChange={(e) => setForm({ ...form, driveDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Roles (comma separated)</Label>
              <Input
                placeholder="SDE-1, SDE-2, DevOps Intern"
                value={form.roles}
                onChange={(e) => setForm({ ...form, roles: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Package min (LPA)</Label>
                <Input
                  type="number"
                  value={form.packageMin}
                  onChange={(e) => setForm({ ...form, packageMin: e.target.value })}
                />
              </div>
              <div>
                <Label>Package max (LPA)</Label>
                <Input
                  type="number"
                  value={form.packageMax}
                  onChange={(e) => setForm({ ...form, packageMax: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Location / venue</Label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="Eligibility, rounds, number of openings..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSendOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                disabled={sending}
                onClick={sendProposal}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send proposal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InviteCard({
  invite,
  updating,
  statusBadge,
  showActions,
  onAccept,
  onDecline,
  onCancel,
  isSent,
}: {
  invite: Invite
  updating: string | null
  statusBadge: (s: Invite["status"]) => React.ReactNode
  showActions?: boolean
  onAccept?: () => void
  onDecline?: () => void
  onCancel?: () => void
  isSent?: boolean
}) {
  const isPending = invite.status === "pending"
  return (
    <Card className={isPending ? "border-amber-200 bg-amber-50/30" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg">{invite.driveTitle}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <Building2 className="h-4 w-4" />
              {invite.collegeName || invite.collegeId?.collegeName}
              {isSent && (
                <Badge variant="outline" className="ml-2 text-xs">
                  You proposed · awaiting college
                </Badge>
              )}
              {!isSent && invite.createdByRole !== "recruiter" && (
                <Badge variant="outline" className="ml-2 text-xs text-amber-700 border-amber-300">
                  College invited you
                </Badge>
              )}
            </CardDescription>
          </div>
          {statusBadge(invite.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(invite.driveDate), "MMMM dd, yyyy")}
          </span>
          {invite.roles?.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {invite.roles.join(", ")}
            </span>
          )}
          {(invite.packageMin || invite.packageMax) ? (
            <span className="flex items-center gap-1 text-green-700 font-medium">
              <IndianRupee className="h-3.5 w-3.5" />
              {invite.packageMin}–{invite.packageMax} LPA
            </span>
          ) : null}
          {invite.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {invite.location}
            </span>
          )}
          <span className="text-xs">
            {formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })}
          </span>
        </div>
        {invite.description && (
          <p className="text-sm bg-white rounded-lg p-3 border">{invite.description}</p>
        )}
        <InvitePipelineProgress invite={invite} />
        {invite.linkedDriveId && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
            <CheckCircle2 className="h-4 w-4" />
            Campus drive is live — students at {invite.collegeName} can now apply
          </div>
        )}
        {showActions && !isSent && onAccept && onDecline && (
          <div className="flex gap-2">
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={updating === invite._id}
              onClick={onAccept}
            >
              {updating === invite._id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Accept invitation
            </Button>
            <Button
              variant="outline"
              className="border-red-300 text-red-600"
              disabled={updating === invite._id}
              onClick={onDecline}
            >
              <X className="h-4 w-4 mr-2" /> Decline
            </Button>
          </div>
        )}
        {showActions && isSent && onCancel && (
          <Button
            variant="outline"
            size="sm"
            disabled={updating === invite._id}
            onClick={onCancel}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Withdraw proposal
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
