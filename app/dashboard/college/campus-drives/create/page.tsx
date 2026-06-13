"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, X, ArrowLeft, Building2 } from "lucide-react"

const BRANCHES = ["CSE","IT","ECE","EEE","Mechanical","Civil","Chemical","Biotechnology","MBA","MCA","Other"]
const BATCHES = ["2024","2025","2026","2027","2028"]
const YEARS = [1,2,3,4]
const JOB_TYPES = ["Full Time","Internship","Contract","PPO"]
const ROUNDS = ["Resume Shortlisting","Aptitude Test","Technical Test","Group Discussion","Technical Interview","HR Interview","Managerial Round","Final Interview"]

export default function CreateCampusDrivePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    companyName: "", role: "", description: "", jobType: "Full Time",
    location: "", venue: "", packageMin: "", packageMax: "",
    driveDate: "", applicationDeadline: "",
    eligibility: { minCGPA: 0, branches: [] as string[], batches: [] as string[], years: [] as number[], skills: [] as string[], backlogsAllowed: false },
    rounds: [] as string[], status: "active",
  })
  const [skillInput, setSkillInput] = useState("")
  const [roundInput, setRoundInput] = useState("")

  function setE(key: string, value: any) {
    setForm(f => ({ ...f, eligibility: { ...f.eligibility, [key]: value } }))
  }
  function toggleArr(arr: any[], val: any, setter: (v: any[]) => void) {
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }
  function addSkill() {
    const s = skillInput.trim()
    if (s && !form.eligibility.skills.includes(s)) setE("skills", [...form.eligibility.skills, s])
    setSkillInput("")
  }
  function addRound(r: string) {
    if (r && !form.rounds.includes(r)) setForm(f => ({ ...f, rounds: [...f.rounds, r] }))
    setRoundInput("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.companyName || !form.role || !form.driveDate) { setError("Company name, role and drive date are required"); return }
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/college/campus-drives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, packageMin: Number(form.packageMin) || 0, packageMax: Number(form.packageMax) || 0 }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to create drive"); return }
      router.push("/dashboard/college/campus-drives")
    } catch { setError("Something went wrong") }
    finally { setSaving(false) }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="h-6 w-6 text-purple-600" /> Create Campus Drive</h1>
          <p className="text-sm text-gray-500">Publish a hiring drive for your students</p>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Company & Role</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Company Name *</Label>
              <Input value={form.companyName} onChange={e => setForm(f=>({...f,companyName:e.target.value}))} placeholder="e.g. Google, TCS, Infosys" required />
            </div>
            <div className="space-y-1.5">
              <Label>Role / Position *</Label>
              <Input value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))} placeholder="e.g. Software Engineer" required />
            </div>
            <div className="space-y-1.5">
              <Label>Job Type</Label>
              <Select value={form.jobType} onValueChange={v => setForm(f=>({...f,jobType:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{JOB_TYPES.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f=>({...f,location:e.target.value}))} placeholder="e.g. Bengaluru / Remote" />
            </div>
            <div className="space-y-1.5">
              <Label>Package Min (LPA)</Label>
              <Input type="number" value={form.packageMin} onChange={e => setForm(f=>({...f,packageMin:e.target.value}))} placeholder="3" />
            </div>
            <div className="space-y-1.5">
              <Label>Package Max (LPA)</Label>
              <Input type="number" value={form.packageMax} onChange={e => setForm(f=>({...f,packageMax:e.target.value}))} placeholder="8" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Description / JD</Label>
              <Textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="About the role, responsibilities..." rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Date & Venue */}
        <Card>
          <CardHeader><CardTitle className="text-base">Schedule & Venue</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Drive Date *</Label>
              <Input type="date" value={form.driveDate} onChange={e => setForm(f=>({...f,driveDate:e.target.value}))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Application Deadline</Label>
              <Input type="date" value={form.applicationDeadline} onChange={e => setForm(f=>({...f,applicationDeadline:e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label>Venue</Label>
              <Input value={form.venue} onChange={e => setForm(f=>({...f,venue:e.target.value}))} placeholder="e.g. Seminar Hall A" />
            </div>
          </CardContent>
        </Card>

        {/* Eligibility */}
        <Card>
          <CardHeader><CardTitle className="text-base">Eligibility Criteria</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Minimum CGPA (0 = no filter)</Label>
                <Input type="number" step="0.1" min="0" max="10" value={form.eligibility.minCGPA} onChange={e=>setE("minCGPA",parseFloat(e.target.value)||0)} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.eligibility.backlogsAllowed} onCheckedChange={v=>setE("backlogsAllowed",v)} />
                <Label>Backlogs Allowed</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Eligible Branches (leave empty = all)</Label>
              <div className="flex flex-wrap gap-2">
                {BRANCHES.map(b => (
                  <button key={b} type="button"
                    onClick={() => toggleArr(form.eligibility.branches, b, v=>setE("branches",v))}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${form.eligibility.branches.includes(b) ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-700 border-gray-300 hover:border-purple-400"}`}
                  >{b}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Eligible Batches (leave empty = all)</Label>
              <div className="flex flex-wrap gap-2">
                {BATCHES.map(b => (
                  <button key={b} type="button"
                    onClick={() => toggleArr(form.eligibility.batches, b, v=>setE("batches",v))}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${form.eligibility.batches.includes(b) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"}`}
                  >{b}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Required Skills (leave empty = all)</Label>
              <div className="flex gap-2">
                <Input value={skillInput} onChange={e=>setSkillInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addSkill()}}} placeholder="e.g. Python, React..." />
                <Button type="button" variant="outline" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {form.eligibility.skills.map(s=>(
                  <span key={s} className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                    {s}<button type="button" onClick={()=>setE("skills",form.eligibility.skills.filter(x=>x!==s))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Rounds */}
        <Card>
          <CardHeader><CardTitle className="text-base">Interview Rounds</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ROUNDS.map(r => (
                <button key={r} type="button"
                  onClick={() => addRound(r)}
                  disabled={form.rounds.includes(r)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${form.rounds.includes(r) ? "opacity-40 cursor-not-allowed bg-gray-100" : "bg-white text-gray-700 border-gray-300 hover:border-purple-400 hover:text-purple-700"}`}
                >{r}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {form.rounds.map((r,i)=>(
                <span key={r} className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                  <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">{i+1}</span>
                  {r}
                  <button type="button" onClick={()=>setForm(f=>({...f,rounds:f.rounds.filter(x=>x!==r)}))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Publish immediately?</p>
                <p className="text-sm text-gray-500">Active drives are visible to eligible students right away</p>
              </div>
              <Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v}))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Publish Now</SelectItem>
                  <SelectItem value="draft">Save as Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-8">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700 px-8">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Drive"}
          </Button>
        </div>
      </form>
    </div>
  )
}
