"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Activity, Award } from "lucide-react"
import { CustomChart } from "@/components/charts"

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const userId = params?.id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [user, setUser] = useState<any | null>(null)

  // Derived datasets for charts (defensive to various shapes)
  const skillsPie = useMemo(() => {
    const src = (user?.skills || user?.profile?.skills || []) as any
    const arr: Array<{ name: string; value: number }> = []
    if (Array.isArray(src)) {
      for (const s of src) {
        const name = (s?.name || s?.skill || String(s)).trim()
        if (!name) continue
        const level = Number(s?.level ?? s?.score ?? 1) || 1
        const found = arr.find((x) => x.name === name)
        if (found) found.value += level
        else arr.push({ name, value: level })
      }
    } else if (typeof src === "string") {
      src.split(",").map((t) => t.trim()).filter(Boolean).forEach((name) => {
        const found = arr.find((x) => x.name === name)
        if (found) found.value += 1
        else arr.push({ name, value: 1 })
      })
    }
    return arr
  }, [user])

  const performanceSeries = useMemo(() => {
    const daily = (user?.metrics?.activity?.daily || user?.activity || []) as any[]
    if (Array.isArray(daily) && daily.length) {
      return daily.map((r) => ({ name: r.date || r.day || r._id || "", value: Number(r.count ?? r.value ?? 0) }))
    }
    // Fallback to simple series with account created
    if (user?.createdAt) {
      return [{ name: String(user.createdAt).slice(0, 10), value: 1 }]
    }
    return []
  }, [user])

  const careerBars = useMemo(() => {
    const exp = (user?.experience || user?.profile?.experience || []) as any[]
    const out: Array<{ name: string; value: number }> = []
    if (Array.isArray(exp)) {
      for (const e of exp) {
        const name = (e?.title || e?.role || e?.company || "Experience").toString()
        const years = Number(e?.years || e?.durationYears || 1) || 1
        out.push({ name, value: years })
      }
    }
    return out
  }, [user])

  useEffect(() => {
    if (!userId) return
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" })
        if (!res.ok) throw new Error(`Failed to load user (${res.status})`)
        const data = await res.json()
        setUser(data.user || data)
      } catch (e: any) {
        setError(e.message || "Failed to load user")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [userId])

  const onSave = async () => {
    if (!user) return
    setSaving(true)
    setMsg(null)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: user.name, role: user.role }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to update user")
      setMsg("Saved")
    } catch (e: any) {
      setError(e.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!userId) return
    if (!confirm("Delete this user?")) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to delete user")
      router.push("/dashboard/admin/users")
    } catch (e: any) {
      setError(e.message || "Failed to delete")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-background p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary grid place-items-center text-lg font-bold">
              {(user?.name || user?.email || "U").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">User Detail</h2>
              {user && (
                <>
                  <p className="text-sm text-muted-foreground mt-1">{user.email} • <Badge variant="secondary">{user.role || "user"}</Badge></p>
                  <p className="text-xs text-muted-foreground mt-0.5">Created {String(user.createdAt || "").slice(0, 10) || "—"} • Last active {String(user.lastActive || user.metrics?.lastActive || user.updatedAt || "").slice(0, 10) || "—"}</p>
                </>
              )}
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link href="/dashboard/admin/users">Back</Link>
          </Button>
        </div>

      {/* Profile Card */}
      <Card className="rounded-2xl shadow-lg border bg-white">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <div>Loading…</div>}
          {error && <div className="text-red-600">{error}</div>}
          {msg && <div className="text-green-600">{msg}</div>}
          {user && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={user.name || ""} onChange={(e) => setUser({ ...user, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email || ""} disabled />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={user.role || ""} onChange={(e) => setUser({ ...user, role: e.target.value })} />
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={onSave} disabled={saving || !user}>Save</Button>
            <Button variant="destructive" onClick={onDelete} disabled={saving || !userId}>Delete</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-2xl border bg-gradient-to-tr from-primary/5 via-muted to-background p-6 shadow-md hover:shadow-xl transition">
          <div className="text-sm text-muted-foreground flex items-center gap-2"><Award className="h-4 w-4"/> Skills</div>
          <div className="mt-1 text-3xl font-semibold">{skillsPie.length}</div>
        </div>
        <div className="rounded-2xl border bg-gradient-to-tr from-purple-500/5 via-muted to-background p-6 shadow-md hover:shadow-xl transition">
          <div className="text-sm text-muted-foreground flex items-center gap-2"><BarChart3 className="h-4 w-4"/> Experience (yrs)</div>
          <div className="mt-1 text-3xl font-semibold">{careerBars.reduce((s, x) => s + (x.value || 0), 0)}</div>
        </div>
        <div className="rounded-2xl border bg-gradient-to-tr from-sky-500/5 via-muted to-background p-6 shadow-md hover:shadow-xl transition">
          <div className="text-sm text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4"/> Activity Days</div>
          <div className="mt-1 text-3xl font-semibold">{performanceSeries.length}</div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold">Insights</h3>
        <p className="text-sm text-muted-foreground">Skills, performance trends and career overview</p>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Skills Distribution */}
        <Card className="col-span-1 bg-[#0b1220] text-white border border-white/10 rounded-2xl shadow-md transition-transform hover:scale-[1.01]">
          <CardHeader>
            <CardTitle className="text-xl">Skills Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[500px] sm:h-[600px]">
            {skillsPie.length ? (
              <CustomChart type="pie" data={skillsPie} dataKey="value" nameKey="name" height={500} themeVariant="neon" />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">No skills data</div>
            )}
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card className="bg-[#0b1220] text-white border border-white/10 rounded-2xl shadow-md transition-transform hover:scale-[1.01]">
          <CardHeader>
            <CardTitle className="text-xl">Performance (Activity)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[500px] sm:h-[600px]">
            {performanceSeries.length ? (
              <CustomChart type="line" data={performanceSeries} dataKey="value" nameKey="name" height={500} softFill themeVariant="neon" />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">No activity data</div>
            )}
          </CardContent>
        </Card>

        {/* Career Overview */}
        <Card className="bg-[#0b1220] text-white border border-white/10 rounded-2xl shadow-md transition-transform hover:scale-[1.01]">
          <CardHeader>
            <CardTitle className="text-xl">Career Overview</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[500px] sm:h-[600px]">
            {careerBars.length ? (
              <CustomChart type="bar" data={careerBars} dataKey="value" nameKey="name" height={500} themeVariant="neon" />
            ) : (
              <div className="p-6 text-sm text-muted-foreground">No career data</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  )
}
