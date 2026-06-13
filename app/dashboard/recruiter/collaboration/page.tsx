"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Mail,
  UserPlus,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Shield,
  Eye,
  Briefcase,
  Crown,
  MoreHorizontal,
  Copy,
  SendHorizonal,
  UserCheck,
  AlertCircle,
  Loader2,
} from "lucide-react"

type InviteRole = "admin" | "recruiter" | "viewer"

interface Invite {
  _id: string
  email: string
  role: string
  status: "pending" | "accepted" | "revoked"
  createdAt?: string
  expiresAt?: string
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode; perms: string[] }> = {
  admin: {
    label: "Admin",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    icon: <Crown className="h-3.5 w-3.5" />,
    perms: ["Create & edit jobs", "Review all candidates", "Assign tests", "Invite teammates"],
  },
  recruiter: {
    label: "Recruiter",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    icon: <Briefcase className="h-3.5 w-3.5" />,
    perms: ["Create & edit jobs", "Review candidates", "Assign tests"],
  },
  viewer: {
    label: "Viewer",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    icon: <Eye className="h-3.5 w-3.5" />,
    perms: ["View jobs & candidates (read-only)"],
  },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role?.toLowerCase()] || ROLE_CONFIG["viewer"]
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "accepted")
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1"><CheckCircle2 className="h-3 w-3" />Accepted</Badge>
  if (status === "pending")
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs gap-1"><Clock className="h-3 w-3" />Pending</Badge>
  return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs gap-1"><XCircle className="h-3 w-3" />Revoked</Badge>
}

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase()
}

function getAvatarColor(email: string) {
  const colors = ["#7c3aed", "#2563eb", "#0891b2", "#16a34a", "#d97706", "#dc2626", "#db2777"]
  return colors[email.charCodeAt(0) % colors.length]
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "—"
  const ms = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(ms / 86_400_000)
  if (d === 0) return "Today"
  if (d === 1) return "Yesterday"
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

export default function RecruiterCollaborationPage() {
  const { toast } = useToast()
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<InviteRole>("recruiter")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])

  const fetchInvites = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/recruiter/invites")
      if (res.ok) {
        const data = await res.json()
        setInvites(data.invites || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvites()
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({ title: "Email required", description: "Enter your teammate's email address.", variant: "destructive" })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" })
      return
    }
    setSending(true)
    try {
      const res = await fetch("/api/recruiter/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || "Failed to send invite")
      toast({ title: "Invitation sent!", description: `${inviteEmail} has been invited as ${ROLE_CONFIG[inviteRole].label}.` })
      setInviteEmail("")
      fetchInvites()
    } catch (e: any) {
      toast({ title: "Failed to send invite", description: e?.message || "Please try again.", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const actionInvite = async (id: string, action: "resend" | "revoke" | "delete") => {
    setActionLoading(id + action)
    try {
      if (action === "delete") {
        const res = await fetch(`/api/recruiter/invites/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to delete invite")
        toast({ title: "Invite removed" })
      } else {
        const res = await fetch(`/api/recruiter/invites/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        })
        if (!res.ok) throw new Error(`Failed to ${action} invite`)
        toast({ title: action === "resend" ? "Invite resent!" : "Invite revoked", description: action === "resend" ? "A fresh invite link has been sent." : "The invite has been revoked." })
      }
      fetchInvites()
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || `Could not ${action} invite`, variant: "destructive" })
    } finally {
      setActionLoading(null)
    }
  }

  const copyInviteLink = (id: string) => {
    const link = `${window.location.origin}/invite/${id}`
    navigator.clipboard.writeText(link).catch(() => { })
    toast({ title: "Link copied!", description: "Share this link with your teammate." })
  }

  const accepted = invites.filter(i => i.status === "accepted")
  const pending = invites.filter(i => i.status === "pending")
  const revoked = invites.filter(i => i.status === "revoked")

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-600" />
            Team Collaboration
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Invite teammates and manage workspace access levels
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInvites} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Members", value: accepted.length, icon: <UserCheck className="h-5 w-5 text-green-600" />, bg: "bg-green-50" },
          { label: "Pending Invites", value: pending.length, icon: <Clock className="h-5 w-5 text-amber-600" />, bg: "bg-amber-50" },
          { label: "Total Sent", value: invites.length, icon: <SendHorizonal className="h-5 w-5 text-purple-600" />, bg: "bg-purple-50" },
        ].map(stat => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className={`p-4 flex items-center gap-3 ${stat.bg} rounded-lg`}>
              <div className="p-2 bg-white rounded-lg shadow-sm">{stat.icon}</div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Invite form ── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-purple-600" />
            Invite a Teammate
          </CardTitle>
          <CardDescription>
            Send an invitation by email. They'll receive a link to join your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs font-medium">Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleInvite()}
                className="h-9"
              />
            </div>
            <div className="space-y-1 w-full sm:w-40">
              <Label className="text-xs font-medium">Role</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as InviteRole)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG[string]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-1.5">{cfg.icon} {cfg.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleInvite} disabled={sending} className="h-9 bg-purple-600 hover:bg-purple-700 gap-2 w-full sm:w-auto">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {sending ? "Sending…" : "Send Invite"}
              </Button>
            </div>
          </div>

          {/* Role permission preview */}
          <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Shield className="h-3 w-3" /> {ROLE_CONFIG[inviteRole].label} Permissions
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLE_CONFIG[inviteRole].perms.map(perm => (
                <span key={perm} className="flex items-center gap-1 text-xs bg-white border rounded-full px-2 py-0.5">
                  <CheckCircle2 className="h-3 w-3 text-green-500" /> {perm}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Active members ── */}
      {accepted.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Active Team Members
              <Badge className="bg-green-100 text-green-700 border-green-200 ml-1">{accepted.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {accepted.map(inv => (
              <div key={inv._id} className="flex items-center gap-3 p-3 rounded-lg border bg-green-50/30 hover:bg-green-50/60 transition-colors">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: getAvatarColor(inv.email) }}
                >
                  {getInitials(inv.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">Joined {timeAgo(inv.createdAt)}</p>
                </div>
                <RoleBadge role={inv.role} />
                <StatusBadge status={inv.status} />
                <button
                  onClick={() => actionInvite(inv._id, "delete")}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  title="Remove member"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Pending invites ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Pending Invitations
            {pending.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 ml-1">{pending.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Invites that haven't been accepted yet. Links expire after 7 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading invites…
            </div>
          ) : pending.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Users className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No pending invitations.</p>
              <p className="text-xs text-muted-foreground">Invite a colleague using the form above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map(inv => (
                <div key={inv._id} className="flex items-center gap-3 p-3 rounded-lg border bg-amber-50/30 hover:bg-amber-50/60 transition-colors">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: getAvatarColor(inv.email) }}
                  >
                    {getInitials(inv.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">Invited {timeAgo(inv.createdAt)}</p>
                  </div>
                  <RoleBadge role={inv.role} />
                  <StatusBadge status={inv.status} />
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => copyInviteLink(inv._id)}
                      title="Copy invite link"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => actionInvite(inv._id, "resend")}
                      disabled={actionLoading === inv._id + "resend"}
                    >
                      {actionLoading === inv._id + "resend"
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <RefreshCw className="h-3 w-3" />}
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => actionInvite(inv._id, "revoke")}
                      disabled={actionLoading === inv._id + "revoke"}
                    >
                      {actionLoading === inv._id + "revoke"
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <XCircle className="h-3 w-3" />}
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Revoked ── */}
      {revoked.length > 0 && (
        <Card className="opacity-70">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4" />
              Revoked Invitations ({revoked.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {revoked.map(inv => (
              <div key={inv._id} className="flex items-center gap-3 p-2.5 rounded-lg border">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                  {getInitials(inv.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground truncate">{inv.email}</p>
                </div>
                <RoleBadge role={inv.role} />
                <StatusBadge status={inv.status} />
                <button
                  onClick={() => actionInvite(inv._id, "delete")}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Permission guide ── */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Shield className="h-4 w-4" /> Permission Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-3">
            {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG[string]][]).map(([key, cfg]) => (
              <div key={key} className="rounded-lg border p-3 space-y-2" style={{ borderColor: cfg.border, background: cfg.bg + "66" }}>
                <div className="flex items-center gap-1.5 font-medium text-sm" style={{ color: cfg.color }}>
                  {cfg.icon} {cfg.label}
                </div>
                <ul className="space-y-1">
                  {cfg.perms.map(p => (
                    <li key={p} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" style={{ color: cfg.color }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
