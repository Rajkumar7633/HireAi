"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function AdminJobDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const jobId = params?.id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [job, setJob] = useState<any | null>(null)
  const [status, setStatus] = useState<string>("")
  const [title, setTitle] = useState("")
  const [company, setCompany] = useState("")
  const [location, setLocation] = useState("")
  const [description, setDescription] = useState("")
  const [activity, setActivity] = useState<any[]>([])

  const created = useMemo(() => (job?.createdAt ? String(job.createdAt).slice(0, 10) : "—"), [job])

  useEffect(() => {
    if (!jobId) return
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const tryParse = (d: any) => {
          const j = d?.job || d?.jobDescription || d || {}
          return {
            raw: j,
            status: j.status || j.state || "open",
            title: j.title || j.name || "",
            company: j.company || j.org || (typeof j.companyId === 'object' ? (j.companyId?.name || "") : ""),
            location: j.location || j.city || "",
            description: j.description || j.summary || "",
            createdAt: j.createdAt || j.postedDate || undefined,
          }
        }

        // 1) Admin
        const res = await fetch(`/api/admin/jobs/${jobId}`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          const parsed = tryParse(data)
          setJob(parsed.raw)
          setStatus(parsed.status)
          setTitle(parsed.title)
          setCompany(parsed.company)
          setLocation(parsed.location)
          setDescription(parsed.description)
          return
        }
        // 2) Recruiter proxy
        const r2 = await fetch(`/api/recruiter/job-descriptions/${jobId}`, { cache: "no-store" }).catch(()=>null)
        if (r2 && r2.ok) {
          const d2 = await r2.json().catch(()=>({}))
          const parsed = tryParse(d2)
          setJob(parsed.raw)
          setStatus(parsed.status)
          setTitle(parsed.title)
          setCompany(parsed.company)
          setLocation(parsed.location)
          setDescription(parsed.description)
          return
        }
        // 3) Local DB
        const r3 = await fetch(`/api/job-descriptions/${jobId}`, { cache: "no-store" }).catch(()=>null)
        if (r3 && r3.ok) {
          const d3 = await r3.json().catch(()=>({}))
          const parsed = tryParse(d3)
          setJob(parsed.raw)
          setStatus(parsed.status)
          setTitle(parsed.title)
          setCompany(parsed.company)
          setLocation(parsed.location)
          setDescription(parsed.description)
          return
        }
        throw new Error(`Failed to load job (${res.status})`)
      } catch (e: any) {
        setError(e.message || "Failed to load job")
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [jobId])

  useEffect(() => {
    if (!jobId) return
    const loadActivity = async () => {
      try {
        const res = await fetch(`/api/admin/jobs/${jobId}/activity`, { cache: 'no-store' })
        const data = await res.json().catch(()=>({ items: [] }))
        setActivity(Array.isArray(data.items) ? data.items : [])
      } catch {
        setActivity([])
      }
    }
    loadActivity()
  }, [jobId])

  const onUpdateStatus = async () => {
    if (!jobId) return
    setSaving(true)
    setMsg(null)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to update job")
      setMsg("Updated")
      setJob((j: any) => ({ ...(j || {}), status }))
    } catch (e: any) {
      setError(e.message || "Failed to update job")
    } finally {
      setSaving(false)
    }
  }

  const onSaveFields = async () => {
    if (!jobId) return
    setSaving(true)
    setMsg(null)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, company, location, description }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to update job")
      setMsg("Saved")
      setJob((j: any) => ({ ...(j || {}), title, company, location, description }))
    } catch (e: any) {
      setError(e.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async () => {
    if (!jobId) return
    if (!confirm("Delete this job?")) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to delete job")
      router.push("/dashboard/admin/jobs")
    } catch (e: any) {
      setError(e.message || "Failed to delete job")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Details</h2>
          <p className="text-sm text-muted-foreground">ID: {jobId}</p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/dashboard/admin/jobs">Back</Link>
        </Button>
      </div>

      <Card className="rounded-2xl border bg-card">
        <CardHeader className="px-6 pt-6 pb-2">
          <CardTitle className="text-xl">Summary</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-3">
          {loading && <div>Loading…</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {msg && <div className="text-green-600 text-sm">{msg}</div>}
          {!loading && !error && job && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={title} onChange={(e)=>setTitle(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={company} onChange={(e)=>setCompany(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={location} onChange={(e)=>setLocation(e.target.value)} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="flex items-center gap-2">
                  <select className="h-9 px-3 border rounded" value={status} onChange={(e)=>setStatus(e.target.value)}>
                    <option value="open">Open</option>
                    <option value="paused">Paused</option>
                    <option value="closed">Closed</option>
                  </select>
                  <Badge variant={status === 'open' ? 'default' : status === 'closed' ? 'destructive' : 'secondary'}>{status}</Badge>
                  <Button size="sm" onClick={onUpdateStatus} disabled={saving}>Update</Button>
                </div>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e)=>setDescription(e.target.value)} rows={8} />
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={onSaveFields} disabled={saving}>Save</Button>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="text-sm">{created}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border bg-card">
        <CardHeader className="px-6 pt-6 pb-2">
          <CardTitle className="text-xl">Activity</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          {activity.length === 0 ? (
            <div className="text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            <div className="space-y-2">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start justify-between border rounded px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{a.action || a.type || 'Event'}</div>
                    <div className="text-xs text-muted-foreground">{a.message || a.note || ''}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{String(a.timestamp || a.createdAt || '').slice(0,19).replace('T',' ')}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href="/dashboard/admin/jobs">Back to list</Link>
        </Button>
        <Button variant="destructive" onClick={onDelete} disabled={saving}>Delete Job</Button>
      </div>
    </div>
  )
}
