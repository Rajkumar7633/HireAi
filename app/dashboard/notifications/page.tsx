"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronRight,
  Filter,
  Loader2,
  MailOpen,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-session"
import {
  type AppNotification,
  type NotificationCategory,
  NOTIFICATION_CATEGORIES,
  getNotificationLink,
  getNotificationMeta,
  groupNotificationsByDate,
  matchesCategory,
} from "@/lib/notification-utils"

type StatusFilter = "all" | "unread" | "read"

interface NotificationStats {
  total: number
  unread: number
  today: number
  read: number
  byType: Record<string, number>
}

const EMPTY_STATS: NotificationStats = { total: 0, unread: 0, today: 0, read: 0, byType: {} }

export default function NotificationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { session } = useSession()
  const role = session?.role || session?.user?.role

  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [stats, setStats] = useState<NotificationStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory>("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pushEnabled, setPushEnabled] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushEnabled(window.Notification.permission === "granted")
    }
  }, [])

  const fetchNotifications = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        category: categoryFilter,
        limit: "100",
      })
      if (debouncedSearch) params.set("search", debouncedSearch)

      const res = await fetch(`/api/notifications?${params}`, { credentials: "include", cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "Failed to load notifications")

      setNotifications(data.notifications || [])
      setStats(data.stats || EMPTY_STATS)
      setSelected(new Set())
    } catch (e: any) {
      toast({ title: "Could not load notifications", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [statusFilter, categoryFilter, debouncedSearch, toast])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Live updates via SSE
  useEffect(() => {
    if (!session?.id && !session?.user?.id) return

    const es = new EventSource("/api/notifications/stream", { withCredentials: true })
    esRef.current = es

    es.addEventListener("new", () => {
      fetchNotifications(true)
    })

    es.onerror = () => {
      es.close()
      esRef.current = null
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [session?.id, session?.user?.id, fetchNotifications])

  const filteredLocally = useMemo(() => {
    return notifications.filter(n => matchesCategory(n, categoryFilter))
  }, [notifications, categoryFilter])

  const grouped = useMemo(() => groupNotificationsByDate(filteredLocally), [filteredLocally])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filteredLocally.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredLocally.map(n => n._id)))
    }
  }

  const markAsRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" })
    if (res.ok) {
      setNotifications(prev => prev.map(n => (n._id === id ? { ...n, read: true } : n)))
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1), read: prev.read + 1 }))
    }
  }

  const markAllRead = async () => {
    const res = await fetch("/api/notifications/mark-all-read", { method: "PATCH", credentials: "include" })
    if (res.ok) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setStats(prev => ({ ...prev, unread: 0, read: prev.total }))
      toast({ title: "All notifications marked as read" })
    }
  }

  const bulkAction = async (action: "mark_read" | "mark_unread" | "delete") => {
    const ids = Array.from(selected)
    if (!ids.length) return

    const res = await fetch("/api/notifications/bulk", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, notificationIds: ids }),
    })

    if (res.ok) {
      toast({
        title: action === "delete" ? "Notifications removed" : "Notifications updated",
      })
      fetchNotifications(true)
    } else {
      toast({ title: "Action failed", variant: "destructive" })
    }
  }

  const deleteOne = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}`, { method: "DELETE", credentials: "include" })
    if (res.ok) {
      setNotifications(prev => prev.filter(n => n._id !== id))
      fetchNotifications(true)
    }
  }

  const openNotification = async (notification: AppNotification) => {
    if (!notification.read) await markAsRead(notification._id)
    const href = getNotificationLink(notification, role)
    if (href) router.push(href)
  }

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      toast({ title: "Browser notifications not supported", variant: "destructive" })
      return
    }
    const permission = await window.Notification.requestPermission()
    setPushEnabled(permission === "granted")
    toast({
      title: permission === "granted" ? "Desktop alerts enabled" : "Notifications blocked in browser",
      variant: permission === "granted" ? "default" : "destructive",
    })
  }

  const roleLabel =
    role === "recruiter"
      ? "Recruiter"
      : role === "job_seeker"
        ? "Job Seeker"
        : role === "college" || role === "college_admin"
          ? "College"
          : role === "admin"
            ? "Admin"
            : "User"

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Notification Center</h1>
              <p className="text-sm text-muted-foreground">
                Stay connected — tests, applications, interviews & messages for {roleLabel}s
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={requestPushPermission}
            className="gap-1.5"
          >
            {pushEnabled ? <Bell className="h-4 w-4 text-emerald-600" /> : <BellOff className="h-4 w-4" />}
            {pushEnabled ? "Alerts on" : "Enable alerts"}
          </Button>
          {stats.unread > 0 && (
            <Button size="sm" onClick={markAllRead} className="gap-1.5 bg-purple-600 hover:bg-purple-700">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, tone: "from-slate-50 to-white border-slate-200" },
          { label: "Unread", value: stats.unread, tone: "from-purple-50 to-white border-purple-200 text-purple-700" },
          { label: "Today", value: stats.today, tone: "from-blue-50 to-white border-blue-200 text-blue-700" },
          { label: "Read", value: stats.read, tone: "from-emerald-50 to-white border-emerald-200 text-emerald-700" },
        ].map(item => (
          <Card key={item.label} className={`border bg-gradient-to-br ${item.tone}`}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
            <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">
                  Unread
                  {stats.unread > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                      {stats.unread}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="read">Read</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search notifications…"
                className="pl-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground mr-1" />
            {NOTIFICATION_CATEGORIES.map(cat => (
              <Button
                key={cat.id}
                size="sm"
                variant={categoryFilter === cat.id ? "default" : "outline"}
                className={categoryFilter === cat.id ? "bg-purple-600 hover:bg-purple-700" : ""}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-100">
              <span className="text-sm font-medium text-purple-800">{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => bulkAction("mark_read")}>
                <Check className="h-3.5 w-3.5 mr-1" /> Mark read
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkAction("mark_unread")}>
                <MailOpen className="h-3.5 w-3.5 mr-1" /> Mark unread
              </Button>
              <Button size="sm" variant="destructive" onClick={() => bulkAction("delete")}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* List */}
      {filteredLocally.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <Bell className="h-14 w-14 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No notifications here</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {statusFilter === "unread"
                ? "You're all caught up! New alerts for tests, applications, and messages will appear here."
                : "When recruiters assign tests, update applications, or send messages, you'll see them instantly."}
            </p>
            {role === "job_seeker" && (
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <Button asChild variant="outline" size="sm"><Link href="/dashboard/job-seeker/tests">My Tests</Link></Button>
                <Button asChild variant="outline" size="sm"><Link href="/dashboard/job-seeker/applications">Applications</Link></Button>
                <Button asChild variant="outline" size="sm"><Link href="/dashboard/messages">Messages</Link></Button>
              </div>
            )}
            {role === "recruiter" && (
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <Button asChild variant="outline" size="sm"><Link href="/dashboard/recruiter/tests">Manage Tests</Link></Button>
                <Button asChild variant="outline" size="sm"><Link href="/dashboard/recruiter/candidates">Candidates</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredLocally.length > 1 && (
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={selected.size === filteredLocally.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select all on this page</span>
            </div>
          )}

          {grouped.map(group => (
            <section key={group.label}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                {group.label}
              </h2>
              <div className="space-y-2">
                {group.items.map(notification => {
                  const meta = getNotificationMeta(notification.type)
                  const Icon = meta.icon
                  const href = getNotificationLink(notification, role)
                  const isSelected = selected.has(notification._id)

                  return (
                    <Card
                      key={notification._id}
                      className={`transition-all border ${
                        !notification.read
                          ? "border-purple-200 bg-purple-50/40 shadow-sm"
                          : "border-gray-200 hover:border-gray-300"
                      } ${isSelected ? "ring-2 ring-purple-400" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(notification._id)}
                            className="mt-1"
                          />

                          <div
                            className={`h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.tone}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="outline" className="text-[10px] font-medium">
                                    {meta.label}
                                  </Badge>
                                  {!notification.read && (
                                    <span className="h-2 w-2 rounded-full bg-purple-600" />
                                  )}
                                </div>
                                <p
                                  className={`mt-1.5 text-sm leading-relaxed ${
                                    !notification.read ? "font-medium text-gray-900" : "text-gray-600"
                                  }`}
                                >
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                  {" · "}
                                  {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {!notification.read && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 text-xs"
                                    onClick={() => markAsRead(notification._id)}
                                  >
                                    <Check className="h-3.5 w-3.5 mr-1" />
                                    Read
                                  </Button>
                                )}
                                {href && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs gap-1"
                                    onClick={() => openNotification(notification)}
                                  >
                                    Open
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                                  onClick={() => deleteOne(notification._id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Quick links footer */}
      <Card className="bg-gradient-to-r from-purple-50 via-white to-indigo-50 border-purple-100">
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick connections</h3>
          <div className="flex flex-wrap gap-2">
            {(role === "job_seeker"
              ? [
                  { label: "My Tests", href: "/dashboard/job-seeker/tests" },
                  { label: "Applications", href: "/dashboard/job-seeker/applications" },
                  { label: "Interviews", href: "/dashboard/job-seeker/interviews" },
                  { label: "Messages", href: "/dashboard/messages" },
                  { label: "Campus Drives", href: "/dashboard/job-seeker/campus-drives" },
                ]
              : role === "recruiter"
                ? [
                    { label: "Tests", href: "/dashboard/recruiter/tests" },
                    { label: "Candidates", href: "/dashboard/recruiter/candidates" },
                    { label: "Assessments", href: "/dashboard/recruiter/assessments" },
                    { label: "Messages", href: "/dashboard/messages" },
                    { label: "Campus Drives", href: "/dashboard/recruiter/campus-drives" },
                  ]
                : [
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Messages", href: "/dashboard/messages" },
                  ]
            ).map(link => (
              <Button key={link.href} asChild variant="outline" size="sm" className="bg-white/80">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
