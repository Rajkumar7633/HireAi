"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function AdminNewJobPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [company, setCompany] = useState("")
  const [location, setLocation] = useState("")
  const [status, setStatus] = useState("open")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = title.trim().length > 2 && company.trim().length > 1

  const onCreate = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, company, location, status, description }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to create job")
      const id = data.id || data._id || data.job?.id || data.job?._id
      if (id) {
        router.push(`/dashboard/admin/jobs/${id}`)
      } else {
        router.push("/dashboard/admin/jobs")
      }
    } catch (e: any) {
      setError(e.message || "Failed to create job")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Create Job</h2>
        <Button asChild variant="secondary"><Link href="/dashboard/admin/jobs">Back</Link></Button>
      </div>

      <Card className="rounded-2xl border bg-card">
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Senior Frontend Engineer" />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={company} onChange={(e)=>setCompany(e.target.value)} placeholder="Acme Inc" />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="Remote / San Francisco" />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select id="status" className="h-10 px-3 border rounded w-full" value={status} onChange={(e)=>setStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e)=>setDescription(e.target.value)} rows={8} placeholder="Role overview, responsibilities, requirements..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button asChild variant="outline"><Link href="/dashboard/admin/jobs">Cancel</Link></Button>
            <Button onClick={onCreate} disabled={!canSave || saving}>Create Job</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
