"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, ArrowLeft } from "lucide-react"
import { CustomChart } from "@/components/charts"

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [role, setRole] = useState<string>("")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [bulkRole, setBulkRole] = useState<string>("")
  const { toast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<"role" | "delete" | null>(null)
  const [preview, setPreview] = useState<any | null>(null)
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'createdAt'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [showAdmins, setShowAdmins] = useState(false)

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    if (debouncedQuery) p.set("q", debouncedQuery)
    if (role) p.set("role", role)
    p.set("page", String(page))
    p.set("limit", String(limit))
    return `?${p.toString()}`
  }, [debouncedQuery, role, page, limit])

  const sortedUsers = useMemo(() => {
    const arr = [...users]
    arr.sort((a: any, b: any) => {
      const av = (sortBy === 'name' ? (a.name || a.email) : sortBy === 'role' ? a.role : a.createdAt) || ''
      const bv = (sortBy === 'name' ? (b.name || b.email) : sortBy === 'role' ? b.role : b.createdAt) || ''
      const cmp = String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [users, sortBy, sortDir])

  // Visible list: hide admins unless explicitly shown
  const displayUsers = useMemo(() => {
    return sortedUsers.filter((u: any) => showAdmins || u.role !== 'admin')
  }, [sortedUsers, showAdmins])

  const fetchUsers = async (signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/admin/users${qs}`, { cache: "no-store", signal })
      if (!res.ok) throw new Error(`Failed to load users (${res.status})`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.items || data.users || [])
      setUsers(list)
      setTotal(data.total)
      if (data.page) setPage(data.page)
      if (data.limit) setLimit(data.limit)
    } catch (e: any) {
      if (e.name !== "AbortError") setError(e.message || "Failed to load users")
    }
  }

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const run = async () => {
      setLoading(true)
      setError(null)
      await fetchUsers(controller.signal)
      if (!cancelled) setLoading(false)
    }
    run()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [qs])

  // Debounce search query
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(id)
  }, [query])

  // Persist filters
  const persistKey = "admin:users:filters"
  useEffect(() => {
    try {
      const saved = localStorage.getItem(persistKey)
      if (saved) {
        const { q, r, l } = JSON.parse(saved)
        if (typeof q === "string") setQuery(q)
        if (typeof r === "string") setRole(r)
        if (typeof l === "number") setLimit(l)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(persistKey, JSON.stringify({ q: query, r: role, l: limit }))
    } catch {}
  }, [query, role, limit])

  const totalPages = total && limit ? Math.max(1, Math.ceil(total / limit)) : undefined
  const hasPreview = !!preview

  return (
    <div className="flex-1 space-y-6 p-0">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor all users in your system</p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/admin"><ArrowLeft className="h-4 w-4"/> Back</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border p-5 shadow-sm bg-gradient-to-tr from-primary/10 via-muted to-background">
          <div className="text-sm text-muted-foreground">Total Users</div>
          <div className="mt-2 text-3xl font-semibold">{total ?? users.length}</div>
          <div className="mt-1 text-xs text-green-600">Active</div>
        </div>
        <div className="rounded-2xl border p-5 shadow-sm bg-gradient-to-tr from-purple-500/10 via-muted to-background">
          <div className="text-sm text-muted-foreground">Selected</div>
          <div className="mt-2 text-3xl font-semibold">{Object.values(selected).filter(Boolean).length}</div>
          <div className="mt-1 text-xs text-muted-foreground">for bulk actions</div>
        </div>
        <div className="rounded-2xl border p-5 shadow-sm bg-gradient-to-tr from-sky-500/10 via-muted to-background">
          <div className="text-sm text-muted-foreground">Current Page</div>
          <div className="mt-2 text-3xl font-semibold">{page}</div>
          <div className="mt-1 text-xs text-muted-foreground">of {totalPages ?? 1}</div>
        </div>
      </div>

      <Card className="rounded-2xl border bg-card sticky top-0 z-10">
        <CardHeader className="px-6 pt-6 pb-2">
          <CardTitle className="text-xl">Filters & Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">Selected {Object.values(selected).filter(Boolean).length}</div>
            <div className="flex items-center gap-2">
              <select className="h-9 px-3 border rounded" value={bulkRole} onChange={(e) => setBulkRole(e.target.value)}>
                <option value="">Set role…</option>
                <option value="admin">Admin</option>
                <option value="recruiter">Recruiter</option>
                <option value="job_seeker">Job Seeker</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={!Object.values(selected).some(Boolean) || !bulkRole}
                onClick={() => { setConfirmAction("role"); setConfirmOpen(true) }}
              >Change Role</Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!Object.values(selected).some(Boolean)}
                onClick={() => { setConfirmAction("delete"); setConfirmOpen(true) }}
              >Delete</Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3 mb-4">
            <div className="col-span-12 md:col-span-6">
              <Label htmlFor="q">Search</Label>
              <Input id="q" placeholder="Search name or email" value={query} onChange={(e) => { setPage(1); setQuery(e.target.value) }} />
            </div>
            <div className="col-span-6 md:col-span-3">
              <Label htmlFor="role">Role</Label>
              <select id="role" className="h-10 px-3 border rounded w-full" value={role} onChange={(e) => { setPage(1); setRole(e.target.value) }}>
                <option value="">All</option>
                <option value="admin">Admin</option>
                <option value="recruiter">Recruiter</option>
                <option value="job_seeker">Job Seeker</option>
              </select>
            </div>
            <div className="col-span-6 md:col-span-3">
              <Label htmlFor="limit">Per Page</Label>
              <select id="limit" className="h-10 px-3 border rounded w-full" value={limit} onChange={(e) => { setPage(1); setLimit(parseInt(e.target.value) || 10) }}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="col-span-6 md:col-span-3 flex items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showAdmins} onChange={(e)=> setShowAdmins(e.target.checked)} />
                <span>Show admins</span>
              </label>
            </div>
            <div className="col-span-6 md:col-span-3">
              <Label>Density</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" variant={density==='comfortable'?'default':'outline'} size="sm" onClick={()=>setDensity('comfortable')}>Comfort</Button>
                <Button type="button" variant={density==='compact'?'default':'outline'} size="sm" onClick={()=>setDensity('compact')}>Compact</Button>
              </div>
            </div>
            <div className="col-span-6 md:col-span-3">
              <Label htmlFor="sortBy">Sort by</Label>
              <div className="flex gap-2">
                <select id="sortBy" className="h-10 px-3 border rounded w-full" value={sortBy} onChange={(e)=>setSortBy(e.target.value as any)}>
                  <option value="name">Name</option>
                  <option value="role">Role</option>
                  <option value="createdAt">Created</option>
                </select>
                <select className="h-10 px-3 border rounded" value={sortDir} onChange={(e)=>setSortDir(e.target.value as any)}>
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>
            </div>
            <div className="col-span-12 flex items-center justify-end">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => {
                const headers = ["id","name","email","role"]
                const rows = displayUsers.map((u) => [u.id || u._id, (u.name || "").toString().replaceAll(',', ' '), u.email, u.role])
                const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `users_export_${new Date().toISOString().slice(0,10)}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                URL.revokeObjectURL(url)
                toast({ title: "Exported", description: `${rows.length} users exported` })
              }}><Download className="h-4 w-4"/> Export CSV</Button>
            </div>
          </div>

          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
              ))}
            </div>
          )}
          {error && (
            <div className="flex items-center justify-between text-red-600 border rounded p-3">
              <div className="truncate">{error}</div>
              <Button variant="outline" size="sm" onClick={() => fetchUsers()}>Retry</Button>
            </div>
          )}
          {!loading && !error && users.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10 border rounded">No users found. Try adjusting filters.</div>
          )}
          {!loading && !error && users.length > 0 && (
            <div className="grid grid-cols-12 gap-6">
              <div className={`col-span-12 ${hasPreview ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-2`}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" aria-label="Select all" checked={displayUsers.length > 0 && displayUsers.every((u) => selected[u.id || u._id])} onChange={(e) => {
                    const next: Record<string, boolean> = {}
                    if (e.target.checked) displayUsers.forEach((u) => { next[u.id || u._id] = true })
                    setSelected(next)
                  }} />
                  <span className="text-sm">Select all</span>
                </div>
                {displayUsers.map((u, idx) => {
                  const id = u.id || u._id
                  const isSelected = !!selected[id]
                  return (
                    <div key={id} className={`flex items-center justify-between border rounded transition-colors ${idx % 2 === 0 ? 'bg-muted/20' : ''} hover:bg-muted/50 ${density==='compact'?'px-2 py-1':'px-3 py-2'}`} onClick={() => setPreview(u)}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={isSelected} onChange={(e) => setSelected((s) => ({ ...s, [id]: e.target.checked }))} onClick={(e) => e.stopPropagation()} />
                        <div className={`${density==='compact'?'h-7 w-7 text-[10px]':'h-8 w-8 text-xs'} rounded-full bg-primary/10 text-primary grid place-items-center font-semibold`}>
                          {(u.name || u.email || "U").slice(0,2).toUpperCase()}
                        </div>
                        <div className="min-w-[0]">
                          <div className="font-medium flex items-center gap-2">
                            <span className="truncate max-w-[32ch]">{u.name || u.email}</span>
                            <Badge variant={u.role === 'admin' ? 'default' : u.role === 'recruiter' ? 'secondary' : 'outline'}>{u.role}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-[48ch]">{u.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setPreview(u) }}>Preview</Button>
                        <Button asChild size="sm" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/dashboard/admin/users/${id}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
              {hasPreview && (
              <div className="col-span-12 lg:col-span-5">
                <div className="rounded-2xl border p-6 bg-card h-full">
                  {!preview ? (
                    <div className="text-sm text-muted-foreground">Select a user to preview</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-semibold">
                          {(preview.name || preview.email || 'U').slice(0,2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{preview.name || preview.email}</div>
                          <div className="text-sm text-muted-foreground truncate">{preview.email}</div>
                        </div>
                        <Badge className="ml-auto" variant={preview.role === 'admin' ? 'default' : preview.role === 'recruiter' ? 'secondary' : 'outline'}>{preview.role}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">Role</div>
                          <div className="text-sm font-medium">{preview.role || '—'}</div>
                        </div>
                        <div className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">Created</div>
                          <div className="text-sm font-medium">{(preview.createdAt || '').toString().slice(0,10) || '—'}</div>
                        </div>
                        <div className="rounded-lg bg-[#0b1220] p-3">
                          <div className="text-xs text-white/70">ID</div>
                          <div className="text-xs font-mono truncate">{preview.id || preview._id || '—'}</div>
                        </div>
                      </div>
                      <div className="rounded-xl border bg-[#0b1220] text-white p-3">
                        <div className="text-xs text-white/70 mb-2">Activity (spark)</div>
                        <CustomChart type="spark" data={(preview.activity || []).map((d:any)=>({name:d.date||'',value:d.count||0}))} dataKey="value" height={56} themeVariant="neon" />
                      </div>
                      <div className="flex gap-2">
                        <Button asChild className="flex-1">
                          <Link href={`/dashboard/admin/users/${preview.id || preview._id}`}>Open Full Profile</Link>
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => setPreview(null)}>Clear</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>
          )}

          {totalPages && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          )}

          {Object.values(selected).some(Boolean) && (
            <div className="sticky bottom-2 mt-4">
              <div className="mx-auto max-w-screen-xl">
                <div className="rounded-xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 shadow-lg flex items-center justify-between">
                  <div className="text-sm">{Object.values(selected).filter(Boolean).length} selected</div>
                  <div className="flex items-center gap-2">
                    <select className="h-9 px-3 border rounded" value={bulkRole} onChange={(e) => setBulkRole(e.target.value)}>
                      <option value="">Set role…</option>
                      <option value="admin">Admin</option>
                      <option value="recruiter">Recruiter</option>
                      <option value="job_seeker">Job Seeker</option>
                    </select>
                    <Button variant="outline" size="sm" disabled={!bulkRole} onClick={() => { setConfirmAction('role'); setConfirmOpen(true) }}>Apply</Button>
                    <Button variant="destructive" size="sm" onClick={() => { setConfirmAction('delete'); setConfirmOpen(true) }}>Delete</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{confirmAction === "delete" ? "Delete selected users?" : "Change role for selected users?"}</DialogTitle>
                <DialogDescription>
                  {confirmAction === "delete"
                    ? "This action cannot be undone. The selected accounts will be permanently removed."
                    : `Selected accounts will be updated to role: ${bulkRole || "(choose a role)"}.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button onClick={async () => {
                  const ids = Object.keys(selected).filter((k) => selected[k])
                  setLoading(true)
                  setError(null)
                  try {
                    if (confirmAction === "role") {
                      for (const id of ids) {
                        await fetch(`/api/admin/users/${id}`, {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ role: bulkRole }),
                        })
                      }
                      toast({ title: "Role updated", description: `${ids.length} user(s) updated to ${bulkRole}` })
                    } else if (confirmAction === "delete") {
                      for (const id of ids) {
                        await fetch(`/api/admin/users/${id}`, { method: "DELETE" })
                      }
                      toast({ title: "Users deleted", description: `${ids.length} user(s) removed`, variant: "destructive" })
                    }
                  } catch (e: any) {
                    toast({ title: "Action failed", description: e.message || "Request error", variant: "destructive" })
                  } finally {
                    setConfirmOpen(false)
                    setConfirmAction(null)
                    setSelected({})
                    await fetchUsers()
                    setLoading(false)
                  }
                }}>{confirmAction === "delete" ? "Delete" : "Confirm"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  )
}
