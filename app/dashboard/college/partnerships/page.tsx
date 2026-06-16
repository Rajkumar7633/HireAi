"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  Plus,
  Building2,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  Search,
  Send,
  Mail,
  MapPin,
  RefreshCw,
  GraduationCap,
  Clock,
  CheckCircle2,
  X,
  Trash2,
  ArrowUpRight,
  ExternalLink,
  Activity,
  IndianRupee,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  ActivityTimeline,
  CampusPipelineGuide,
  InvitePipelineProgress,
} from "@/components/campus-drive-pipeline-card"

interface Recruiter {
  _id: string
  name: string
  email: string
  companyName: string
  companyDescription?: string
  businessLocation?: string
  website?: string
}

interface Invite {
  _id: string
  driveTitle: string
  driveDate: string
  roles: string[]
  description: string
  companyName?: string
  collegeName?: string
  status: string
  initiatedBy: string
  createdAt: string
  linkedDriveId?: string
  location?: string
  packageMin?: number
  packageMax?: number
  recruiterId?: { name?: string; email?: string; companyName?: string; businessLocation?: string }
}

const INVITE_FORM = {
  recruiterEmail: "",
  driveTitle: "",
  driveDate: "",
  roles: "",
  description: "",
  location: "",
}

export default function PartnershipsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [partnerships, setPartnerships] = useState<any[]>([])
  const [recruiters, setRecruiters] = useState<Recruiter[]>([])
  const [recruiterSearch, setRecruiterSearch] = useState("")
  const [sentInvites, setSentInvites] = useState<Invite[]>([])
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([])
  const [inviteStats, setInviteStats] = useState<any>({})
  const [activity, setActivity] = useState<any[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [selectedRecruiter, setSelectedRecruiter] = useState<Recruiter | null>(null)
  const [inviteForm, setInviteForm] = useState(INVITE_FORM)
  const [sending, setSending] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [newPartnership, setNewPartnership] = useState({
    recruiterId: "",
    companyId: "",
    partnershipType: "Placement",
    agreementDetails: "",
  })

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [partnersRes, partnersDataRes, recruitersRes] = await Promise.all([
        fetch("/api/college/partnerships"),
        fetch("/api/college/campus-partners"),
        fetch("/api/college/recruiters"),
      ])
      const partnershipsJson = await partnersRes.json()
      const campusJson = await partnersDataRes.json()
      const recruitersJson = await recruitersRes.json()

      if (partnershipsJson.partnerships) setPartnerships(partnershipsJson.partnerships)
      if (campusJson.sentInvites) setSentInvites(campusJson.sentInvites)
      if (campusJson.receivedInvites) setReceivedInvites(campusJson.receivedInvites)
      if (campusJson.stats) setInviteStats(campusJson.stats)
      if (campusJson.activity) setActivity(campusJson.activity)
      if (recruitersJson.recruiters) setRecruiters(recruitersJson.recruiters)
    } catch {
      toast({ title: "Failed to load", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const searchRecruiters = async () => {
    try {
      const params = new URLSearchParams()
      if (recruiterSearch) params.set("q", recruiterSearch)
      const res = await fetch(`/api/college/recruiters?${params}`)
      const json = await res.json()
      if (json.recruiters) setRecruiters(json.recruiters)
    } catch {}
  }

  const handleCreatePartnership = async () => {
    try {
      const response = await fetch("/api/college/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPartnership),
      })
      if (response.ok) {
        setShowCreateDialog(false)
        loadAll()
        toast({ title: "Partnership created" })
      }
    } catch {
      toast({ title: "Failed to create partnership", variant: "destructive" })
    }
  }

  const sendInvite = async () => {
    if (!inviteForm.recruiterEmail || !inviteForm.driveTitle || !inviteForm.driveDate) {
      toast({ title: "Fill required fields", variant: "destructive" })
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/college/campus-drive-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...inviteForm,
          roles: inviteForm.roles.split(/[,;\n]/).map((r) => r.trim()).filter(Boolean),
        }),
      })
      const json = await res.json()
      if (res.ok) {
        toast({ title: "Invitation sent", description: json.message })
        setShowInviteDialog(false)
        setInviteForm(INVITE_FORM)
        setSelectedRecruiter(null)
        loadAll()
      } else {
        toast({ title: "Error", description: json.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const respondInvite = async (id: string, status: "accepted" | "declined") => {
    setUpdating(id)
    try {
      const res = await fetch(`/api/college/campus-drive-invites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast({ title: status === "accepted" ? "Accepted — drive publishing" : "Declined" })
        loadAll()
      } else {
        const json = await res.json()
        toast({ title: "Error", description: json.message, variant: "destructive" })
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
      const res = await fetch(`/api/college/campus-drive-invites/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: "Invitation cancelled" })
        loadAll()
      }
    } finally {
      setUpdating(null)
    }
  }

  const openInviteToRecruiter = (recruiter: Recruiter) => {
    setSelectedRecruiter(recruiter)
    setInviteForm({ ...INVITE_FORM, recruiterEmail: recruiter.email })
    setShowInviteDialog(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800"
      case "Inactive":
        return "bg-gray-100 text-gray-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Terminated":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const inviteStatusBadge = (status: string) => {
    if (status === "accepted") return <Badge className="bg-green-600">Accepted</Badge>
    if (status === "declined") return <Badge variant="destructive">Declined</Badge>
    if (status === "cancelled") return <Badge variant="secondary">Cancelled</Badge>
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-400">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            Company Partnerships & Campus Invites
          </h1>
          <p className="text-gray-600">
            Browse recruiters, send drive invitations, and manage company partnerships
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/college/campus-drives">
              Campus drives
              <ArrowUpRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Partnership
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Partnerships", value: partnerships.length },
          { label: "Active", value: partnerships.filter((p) => p.status === "Active").length, color: "text-green-600" },
          { label: "Pending proposals", value: inviteStats.receivedPending ?? 0, color: "text-amber-600" },
          { label: "Sent invites", value: inviteStats.sentPending ?? 0, color: "text-blue-600" },
          { label: "Live drives", value: inviteStats.liveDrives ?? 0, color: "text-purple-600" },
          { label: "Companies listed", value: recruiters.length, color: "text-indigo-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CampusPipelineGuide role="college" />

      <Tabs defaultValue="companies" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="companies">Browse companies</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations
            {(inviteStats.receivedPending ?? 0) > 0 && (
              <Badge className="ml-2 bg-amber-500">{inviteStats.receivedPending}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="partnerships">Partnerships</TabsTrigger>
        </TabsList>

        {/* Browse companies */}
        <TabsContent value="companies" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search company name, recruiter, location..."
                className="pl-9"
                value={recruiterSearch}
                onChange={(e) => setRecruiterSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchRecruiters()}
              />
            </div>
            <Button onClick={searchRecruiters}>Search</Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recruiters.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No recruiters found on the platform yet.
                </CardContent>
              </Card>
            ) : (
              recruiters.map((r) => (
                <Card key={r._id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                        {r.companyName?.[0] || "C"}
                      </div>
                      <div>
                        <CardTitle className="text-base">{r.companyName}</CardTitle>
                        <CardDescription>{r.name}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {r.businessLocation && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {r.businessLocation}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="h-3 w-3" />
                      {r.email}
                    </p>
                    {r.companyDescription && (
                      <p className="text-xs line-clamp-2 text-gray-600">{r.companyDescription}</p>
                    )}
                    {r.website && (
                      <a
                        href={r.website.startsWith("http") ? r.website : `https://${r.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Company website
                      </a>
                    )}
                    <Button size="sm" className="w-full" onClick={() => openInviteToRecruiter(r)}>
                      <Send className="h-4 w-4 mr-2" />
                      Invite to campus drive
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Invitations */}
        <TabsContent value="invitations" className="space-y-6 mt-4">
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              Proposals from companies (for your college)
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              When a recruiter/company sends a drive proposal — accept or decline here.
            </p>
            {receivedInvites.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  No proposals received yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {receivedInvites.map((invite) => (
                  <Card
                    key={invite._id}
                    className={invite.status === "pending" ? "border-amber-200 bg-amber-50/30" : ""}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <p className="font-semibold">{invite.driveTitle}</p>
                          <p className="text-sm text-muted-foreground">
                            {invite.companyName ||
                              invite.recruiterId?.companyName ||
                              invite.recruiterId?.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(invite.driveDate), "MMM dd, yyyy")} ·{" "}
                            {formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {inviteStatusBadge(invite.status)}
                      </div>
                      {invite.description && (
                        <p className="text-sm mt-2 p-2 bg-white rounded border">{invite.description}</p>
                      )}
                      {(invite.roles?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {invite.roles!.map((r) => (
                            <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                        {invite.location && (
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{invite.location}</span>
                        )}
                        {(invite.packageMin || invite.packageMax) ? (
                          <span className="flex items-center gap-1 text-green-700">
                            <IndianRupee className="h-3 w-3" />{invite.packageMin}–{invite.packageMax} LPA
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3">
                        <InvitePipelineProgress invite={invite} />
                      </div>
                      {invite.linkedDriveId && (
                        <Button size="sm" className="mt-3" asChild>
                          <Link href={`/dashboard/college/campus-drives/${invite.linkedDriveId}`}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View live campus drive
                          </Link>
                        </Button>
                      )}
                      {invite.status === "pending" && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="bg-green-600"
                            disabled={updating === invite._id}
                            onClick={() => respondInvite(invite._id, "accepted")}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Accept & publish for students
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updating === invite._id}
                            onClick={() => respondInvite(invite._id, "declined")}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              Invitations you sent to companies
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Waiting for the company to accept or decline your invitation.
            </p>
            {sentInvites.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  Browse companies above to send your first invite
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sentInvites.map((invite) => (
                  <Card key={invite._id}>
                    <CardContent className="p-4 flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="font-medium">{invite.driveTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          To {invite.recruiterId?.companyName || invite.recruiterId?.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(invite.driveDate), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {inviteStatusBadge(invite.status)}
                        {invite.linkedDriveId && (
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/college/campus-drives/${invite.linkedDriveId}`}>
                              View drive
                            </Link>
                          </Button>
                        )}
                        {invite.status === "pending" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={updating === invite._id}
                            onClick={() => cancelInvite(invite._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-600" />
                Partnership activity
              </CardTitle>
              <CardDescription>Track every proposal, response, and published drive</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityTimeline role="college" items={activity} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Partnerships (existing) */}
        <TabsContent value="partnerships" className="mt-4">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            {(["active", "pending", "inactive", "all"] as const).map((tab) => {
              const filtered =
                tab === "all"
                  ? partnerships
                  : partnerships.filter((p) => p.status.toLowerCase() === tab)
              return (
                <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
                  {filtered.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No {tab === "all" ? "" : tab} partnerships
                      </CardContent>
                    </Card>
                  ) : (
                    filtered.map((partnership) => (
                      <Card key={partnership._id} className="border-2">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-xl">
                                {partnership.companyId?.name || partnership.companyName || "Company"}
                              </CardTitle>
                              <CardDescription>{partnership.partnershipType} Partnership</CardDescription>
                            </div>
                            <Badge className={getStatusColor(partnership.status)}>{partnership.status}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2 text-sm">
                              <TrendingUp className="h-4 w-4" />
                              {partnership.drivesConducted || 0} Drives
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="h-4 w-4" />
                              {partnership.studentsPlaced || 0} Placed
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4" />₹{partnership.totalPackageValue || 0}L
                            </div>
                            {partnership.startDate && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4" />
                                {new Date(partnership.startDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              )
            })}
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Create partnership dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Partnership</DialogTitle>
            <DialogDescription>Add a company partnership manually</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Company name</Label>
              <Input
                value={newPartnership.companyId}
                onChange={(e) => setNewPartnership({ ...newPartnership, companyId: e.target.value })}
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div>
              <Label>Partnership Type</Label>
              <Select
                value={newPartnership.partnershipType}
                onValueChange={(value) => setNewPartnership({ ...newPartnership, partnershipType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Placement">Placement</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                  <SelectItem value="Campus Drive">Campus Drive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Agreement Details</Label>
              <Textarea
                value={newPartnership.agreementDetails}
                onChange={(e) =>
                  setNewPartnership({ ...newPartnership, agreementDetails: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreatePartnership}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send invite dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite to campus drive</DialogTitle>
            <DialogDescription>
              Send invitation to {selectedRecruiter?.companyName || "recruiter"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recruiter email</Label>
              <Input value={inviteForm.recruiterEmail} disabled />
            </div>
            <div>
              <Label>Drive title</Label>
              <Input
                value={inviteForm.driveTitle}
                onChange={(e) => setInviteForm({ ...inviteForm, driveTitle: e.target.value })}
              />
            </div>
            <div>
              <Label>Drive date</Label>
              <Input
                type="date"
                value={inviteForm.driveDate}
                onChange={(e) => setInviteForm({ ...inviteForm, driveDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Roles</Label>
              <Input
                placeholder="SDE, QA Intern"
                value={inviteForm.roles}
                onChange={(e) => setInviteForm({ ...inviteForm, roles: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={inviteForm.description}
                onChange={(e) => setInviteForm({ ...inviteForm, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button disabled={sending} onClick={sendInvite}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
