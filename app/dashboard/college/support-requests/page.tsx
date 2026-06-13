"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, MessageSquare, Mail, Clock, CheckCircle2, AlertCircle, Send } from "lucide-react"
import { format } from "date-fns"

const TYPE_LABELS: Record<string, string> = {
  general: "General", eligibility_dispute: "Eligibility Dispute", drive_inquiry: "Drive Inquiry",
  technical: "Technical", other: "Other",
}
const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700", in_progress: "bg-yellow-100 text-yellow-700", resolved: "bg-green-100 text-green-700",
}

export default function SupportRequestsPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [responding, setResponding] = useState<string | null>(null)
  const [responseText, setResponseText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchRequests() }, [])

  async function fetchRequests() {
    setLoading(true)
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : ""
      const res = await fetch(`/api/college/support-requests${params}`)
      const data = await res.json()
      setRequests(data.requests || [])
    } catch { setRequests([]) }
    finally { setLoading(false) }
  }

  async function submitResponse(requestId: string, status: string) {
    setSubmitting(true)
    try {
      const res = await fetch("/api/college/support-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, response: responseText, status }),
      })
      if (res.ok) {
        setResponding(null)
        setResponseText("")
        fetchRequests()
      }
    } catch { /**/ }
    finally { setSubmitting(false) }
  }

  const open = requests.filter(r => r.status === "open").length
  const inProgress = requests.filter(r => r.status === "in_progress").length

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><MessageSquare className="h-6 w-6 text-purple-600" /> Support Requests</h1>
          <p className="text-sm text-gray-500">Student queries and support tickets</p>
        </div>
        <div className="flex items-center gap-3">
          {open > 0 && <Badge className="bg-red-100 text-red-700">{open} Open</Badge>}
          {inProgress > 0 && <Badge className="bg-yellow-100 text-yellow-700">{inProgress} In Progress</Badge>}
        </div>
      </div>

      <div className="flex gap-2">
        {["all","open","in_progress","resolved"].map(s => (
          <Button key={s} variant={statusFilter===s?"default":"outline"} size="sm"
            onClick={() => { setStatusFilter(s); setTimeout(fetchRequests, 0) }}
            className={statusFilter===s?"bg-purple-600 hover:bg-purple-700":""}
          >{s==="all"?"All":s==="in_progress"?"In Progress":s.charAt(0).toUpperCase()+s.slice(1)}</Button>
        ))}
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No support requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <Card key={req._id} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{req.studentName || "Student"}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[req.status]}`}>{req.status.replace("_"," ")}</Badge>
                      <Badge variant="outline" className="text-xs">{TYPE_LABELS[req.type] || req.type}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Mail className="h-3 w-3" />{req.studentEmail}
                      <span className="ml-2 flex items-center gap-1"><Clock className="h-3 w-3" />{req.createdAt ? format(new Date(req.createdAt), "dd MMM yyyy, HH:mm") : ""}</span>
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="font-medium text-sm mb-1">{req.subject}</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{req.message}</p>
                </div>

                {req.response && (
                  <div className="mb-3 border-l-4 border-purple-400 pl-3">
                    <p className="text-xs text-purple-600 font-medium mb-1">Your Response · {req.respondedAt ? format(new Date(req.respondedAt), "dd MMM") : ""}</p>
                    <p className="text-sm text-gray-700">{req.response}</p>
                  </div>
                )}

                {responding === req._id ? (
                  <div className="space-y-2">
                    <Textarea value={responseText} onChange={e=>setResponseText(e.target.value)} placeholder="Type your response..." rows={3} className="text-sm" />
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-purple-600 hover:bg-purple-700" disabled={submitting||!responseText.trim()}
                        onClick={() => submitResponse(req._id, "resolved")}>
                        {submitting?<Loader2 className="h-4 w-4 animate-spin"/>:<><Send className="h-3.5 w-3.5 mr-1"/>Send & Resolve</>}
                      </Button>
                      <Button size="sm" variant="outline" disabled={submitting||!responseText.trim()}
                        onClick={() => submitResponse(req._id, "in_progress")}>Reply Only</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setResponding(null); setResponseText("") }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="text-purple-600" onClick={() => { setResponding(req._id); setResponseText("") }}>
                    <MessageSquare className="h-3.5 w-3.5 mr-1" /> {req.response ? "Reply Again" : "Respond"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
