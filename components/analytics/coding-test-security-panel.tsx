"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts"
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Camera, Mic, Maximize,
  Eye, Activity, Clock, User,
} from "lucide-react"
import type { CandidateSecurityProfile } from "@/lib/proctor-analytics"
import { CODING_SECURITY_LAYERS } from "@/lib/coding-test-security"

export type SecurityAnalyticsPayload = {
  testId: string
  settings?: { maxTabSwitches?: number }
  summary: {
    totalEvents: number
    totalSnapshots: number
    candidatesMonitored: number
    highRisk: number
    mediumRisk: number
    lowRisk: number
    avgIntegrity: number
    eventBreakdown: { type: string; count: number }[]
  }
  candidates: CandidateSecurityProfile[]
  updatedAt: string
}

const RISK_STYLE = {
  high: "bg-rose-50 text-rose-700 border-rose-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

const CHART_COLORS = ["#7c3aed", "#ef4444", "#f59e0b", "#10b981", "#0ea5e9", "#f97316", "#84cc16", "#ec4899"]

function labelType(type: string) {
  return type.replace(/_/g, " ")
}

export function CodingTestSecurityPanel({ data }: { data: SecurityAnalyticsPayload | null }) {
  const [selected, setSelected] = useState<CandidateSecurityProfile | null>(null)

  if (!data) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-8 text-center text-gray-400">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Loading security analytics…</p>
        </CardContent>
      </Card>
    )
  }

  const { summary, candidates } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: "Avg integrity", value: `${summary.avgIntegrity}%`, icon: Shield, color: "text-purple-600 bg-purple-50" },
          { label: "Total events", value: summary.totalEvents, icon: Activity, color: "text-blue-600 bg-blue-50" },
          { label: "Snapshots", value: summary.totalSnapshots, icon: Camera, color: "text-indigo-600 bg-indigo-50" },
          { label: "High risk", value: summary.highRisk, icon: XCircle, color: "text-rose-600 bg-rose-50" },
          { label: "Medium risk", value: summary.mediumRisk, icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
          { label: "Low risk", value: summary.lowRisk, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
        ].map(item => (
          <Card key={item.label} className="border-gray-200 shadow-sm">
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{item.value}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Security event breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.eventBreakdown.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">No proctoring events recorded yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.eventBreakdown} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="type" width={110} tick={{ fontSize: 9 }} tickFormatter={labelType} />
                  <Tooltip formatter={(v: number) => [v, "Events"]} labelFormatter={labelType} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {summary.eventBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Active security layers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[220px] overflow-y-auto">
            {CODING_SECURITY_LAYERS.slice(0, 10).map(layer => (
              <div key={layer.id} className="flex items-start gap-2 text-xs">
                <Shield className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">{layer.label}</p>
                  <p className="text-gray-400 text-[10px]">{layer.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            Candidate security monitor
            <span className="text-[10px] font-normal text-gray-400 ml-auto">
              Updated {new Date(data.updatedAt).toLocaleTimeString()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No candidates assigned yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["Candidate", "Integrity", "Risk", "Tabs", "Face", "Audio", "Object", "FS exit", "Snapshots", "Events", ""].map(h => (
                      <th key={h || "act"} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {candidates.map(c => (
                    <tr key={c.candidateId || c.applicationId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-800">{c.name}</p>
                        <p className="text-[10px] text-gray-400 truncate max-w-[120px]">{c.email}</p>
                      </td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: c.integrityScore >= 70 ? "#10b981" : c.integrityScore >= 50 ? "#f59e0b" : "#ef4444" }}>
                        {c.integrityScore}%
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase ${RISK_STYLE[c.riskLevel]}`}>
                          {c.riskLevel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-700">{c.tabSwitches}</td>
                      <td className="px-3 py-2.5">{c.counts.face || "—"}</td>
                      <td className="px-3 py-2.5">{c.counts.audio || "—"}</td>
                      <td className="px-3 py-2.5">{c.counts.object || "—"}</td>
                      <td className="px-3 py-2.5">{c.counts.fullscreen || "—"}</td>
                      <td className="px-3 py-2.5">{c.snapshotCount}</td>
                      <td className="px-3 py-2.5">{c.eventCount}</td>
                      <td className="px-3 py-2.5">
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => setSelected(c)}>
                          <Eye className="h-3 w-3" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-purple-600" />
                  {selected.name} — Security timeline
                </DialogTitle>
                <DialogDescription>
                  {selected.email} · Integrity {selected.integrityScore}% · {selected.eventCount} events · {selected.snapshotCount} snapshots
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {[
                  { label: "Tab switches", value: selected.tabSwitches, icon: Activity },
                  { label: "Face alerts", value: selected.counts.face, icon: Camera },
                  { label: "Voice alerts", value: selected.counts.audio, icon: Mic },
                  { label: "Fullscreen exits", value: selected.counts.fullscreen, icon: Maximize },
                ].map(item => (
                  <div key={item.label} className="rounded-lg border bg-gray-50 p-3">
                    <item.icon className="h-4 w-4 text-purple-500 mb-1" />
                    <p className="text-lg font-bold text-gray-900">{item.value}</p>
                    <p className="text-[10px] text-gray-500">{item.label}</p>
                  </div>
                ))}
              </div>

              {selected.snapshots.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                    <Camera className="h-3.5 w-3.5" /> Evidence snapshots
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {selected.snapshots.map((snap, i) => (
                      <div key={i} className="rounded-lg border overflow-hidden bg-black">
                        <img src={snap.snapshot} alt={snap.type} className="w-full aspect-video object-cover" />
                        <div className="px-2 py-1 bg-gray-50 border-t">
                          <p className="text-[9px] font-medium text-gray-700">{labelType(snap.type)}</p>
                          <p className="text-[9px] text-gray-400">{new Date(snap.at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Event log
                </p>
                <div className="rounded-lg border max-h-64 overflow-y-auto divide-y">
                  {selected.events.length === 0 ? (
                    <p className="text-xs text-gray-400 p-4 text-center">No events logged</p>
                  ) : (
                    selected.events.map((ev, i) => (
                      <div key={i} className="px-3 py-2 text-xs flex gap-2">
                        <Badge variant="outline" className="text-[9px] shrink-0 capitalize">{labelType(ev.type)}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800">{ev.message}</p>
                          <p className="text-[10px] text-gray-400">{new Date(ev.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selected.flags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {selected.flags.slice(0, 20).map(f => (
                    <Badge key={f} variant="secondary" className="text-[9px] capitalize">{labelType(f)}</Badge>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
