"use client"

import { PIPELINE_STEPS, invitePipelineStage } from "@/lib/campus-drive-pipeline-shared"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, ArrowRight } from "lucide-react"

export function CampusPipelineGuide({ role }: { role: "recruiter" | "college" }) {
  return (
    <Card className="border-purple-100 bg-gradient-to-br from-purple-50/80 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">How the campus drive pipeline works</CardTitle>
        <CardDescription>
          {role === "recruiter"
            ? "From discovering colleges to a live student-facing drive in four steps"
            : "From finding companies to publishing a drive your students can apply to"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PIPELINE_STEPS.map((step, idx) => (
            <div
              key={step.step}
              className="relative rounded-lg border bg-white p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                  {step.step}
                </span>
                <p className="font-semibold text-sm">{step.title}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
              {idx < PIPELINE_STEPS.length - 1 && (
                <ArrowRight className="hidden lg:block absolute -right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function InvitePipelineProgress({
  invite,
}: {
  invite: { status: string; linkedDriveId?: string }
}) {
  const stage = invitePipelineStage(invite)
  const steps = ["Sent", "Pending", "Accepted", "Live"]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Pipeline</span>
        <Badge variant="outline" className="text-[10px]">
          {stage.label}
        </Badge>
      </div>
      <div className="flex items-center gap-1">
        {steps.map((label, i) => {
          const threshold = (i + 1) * 25
          const done = stage.progress >= threshold
          const active = stage.progress >= threshold - 25 && stage.progress < threshold
          return (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Circle
                  className={`h-4 w-4 ${active ? "text-amber-500" : "text-gray-300"}`}
                />
              )}
              <span className="text-[10px] text-muted-foreground hidden sm:block">{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ActivityTimeline({
  items,
  role,
}: {
  role: "recruiter" | "college"
  items: Array<{
    id: string
    title: string
    status: string
    initiatedBy: string
    companyName?: string
    collegeName?: string
    updatedAt: string
    linkedDriveId?: string
  }>
}) {
  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Activity will appear here when you send or receive proposals
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3 items-start border-b pb-3 last:border-0">
          <div className="mt-1 h-2 w-2 rounded-full bg-purple-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item.initiatedBy === "recruiter"
                ? role === "recruiter"
                  ? `You → ${item.collegeName}`
                  : `${item.companyName || "Company"} → Your college`
                : role === "college"
                  ? `You → ${item.companyName || "Recruiter"}`
                  : `${item.collegeName} → You`}
              {" · "}
              <span className="capitalize">{item.status}</span>
              {item.linkedDriveId ? " · Drive live" : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
