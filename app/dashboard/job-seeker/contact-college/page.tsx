"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, MessageSquare, CheckCircle2 } from "lucide-react"

const TYPES = [
  { value: "general", label: "General Query" },
  { value: "eligibility_dispute", label: "Eligibility Dispute" },
  { value: "drive_inquiry", label: "Drive Inquiry" },
  { value: "technical", label: "Technical Issue" },
  { value: "other", label: "Other" },
]

function ContactForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    type: searchParams.get("type") || "general",
    subject: "",
    message: "",
    driveId: searchParams.get("drive") || "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject.trim() || !form.message.trim()) { setError("Subject and message are required"); return }
    setSubmitting(true); setError("")
    try {
      const res = await fetch("/api/college/support-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Failed to submit"); return }
      setSuccess(true)
    } catch { setError("Something went wrong") }
    finally { setSubmitting(false) }
  }

  if (success) return (
    <div className="container mx-auto p-6 max-w-lg">
      <div className="text-center py-16">
        <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-xl font-semibold mb-2">Request Submitted!</h2>
        <p className="text-gray-500 mb-6">Your college placement cell will respond shortly. You'll receive a notification when they reply.</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => { setSuccess(false); setForm({type:"general",subject:"",message:"",driveId:""}) }}>
            Submit Another
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-purple-600" /> Contact College</h1>
          <p className="text-sm text-gray-500">Reach out to your placement cell</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Request Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f=>({...f,type:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} placeholder="Brief description of your issue" required />
            </div>
            <div className="space-y-1.5">
              <Label>Message *</Label>
              <Textarea value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Describe your issue in detail..." rows={5} required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-purple-600 hover:bg-purple-700">
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : "Submit Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-center">Your college placement cell typically responds within 1-2 business days</p>
    </div>
  )
}

export default function ContactCollegePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>}>
      <ContactForm />
    </Suspense>
  )
}
