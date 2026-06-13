"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2, ClipboardList, Clock, CheckCircle2, Circle,
  Play, Trophy, Building2, GraduationCap, AlertCircle, Calendar
} from "lucide-react"
import { authFetch } from "@/lib/client-auth"
import { format } from "date-fns"

function ScoreBadge({ score, passing }: { score: number | null; passing: number }) {
  if (score === null) return null
  const passed = score >= passing
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      <Trophy className="h-3 w-3" /> {score}%
    </span>
  )
}

export default function MyTestsPage() {
  const [loading, setLoading] = useState(true)
  const [tests, setTests] = useState<any[]>([])

  useEffect(() => {
    authFetch("/api/job-seeker/tests")
      .then(r => r.json())
      .then(d => setTests(d.tests || []))
      .catch(() => setTests([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
    </div>
  )

  const pending = tests.filter(t => t.status !== "completed")
  const inProgress = tests.filter(t => t.status === "in_progress")
  const completed = tests.filter(t => t.status === "completed")

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-purple-600" /> My Tests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Assessments assigned to you</p>
        </div>
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full font-medium">{pending.length} Pending</span>
          {inProgress.length > 0 && (
            <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full font-medium">{inProgress.length} In Progress</span>
          )}
          <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full font-medium">{completed.length} Done</span>
        </div>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-gray-500">No tests assigned yet</p>
          <p className="text-sm mt-1">Tests assigned by recruiters or your college will appear here</p>
        </div>
      ) : (
        <>
          {/* Pending Tests */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-orange-600 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" /> Pending ({pending.length})
              </h2>
              {pending.map(test => <TestCard key={`${test._id}-${test.source}`} test={test} />)}
            </div>
          )}

          {/* Completed Tests */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-green-700 flex items-center gap-1.5 mt-4">
                <CheckCircle2 className="h-4 w-4" /> Completed ({completed.length})
              </h2>
              {completed.map(test => <TestCard key={`${test._id}-${test.source}`} test={test} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TestCard({ test }: { test: any }) {
  const isDone = test.status === "completed"
  const isInProgress = test.status === "in_progress"
  const isDeadlineSoon = test.dueDate && !isDone &&
    new Date(test.dueDate).getTime() - Date.now() < 48 * 60 * 60 * 1000

  return (
    <Card className={`border hover:shadow-sm transition-shadow ${isDone ? "opacity-80" : ""} ${isDeadlineSoon ? "border-orange-300" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Source icon */}
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${test.source === "college" ? "bg-purple-100" : "bg-blue-100"}`}>
              {test.source === "college"
                ? <GraduationCap className="h-5 w-5 text-purple-600" />
                : <Building2 className="h-5 w-5 text-blue-600" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-0.5">
                <span className="font-semibold text-gray-900">{test.title}</span>
                {isDone
                  ? <><CheckCircle2 className="h-4 w-4 text-green-500" /><ScoreBadge score={test.score} passing={test.passingScore} /></>
                  : isInProgress
                    ? <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">In Progress</Badge>
                    : <Circle className="h-4 w-4 text-orange-400" />}
                <Badge variant="outline" className={`text-xs ${test.source === "college" ? "border-purple-200 text-purple-600" : "border-blue-200 text-blue-600"}`}>
                  {test.source === "college" ? "College" : test.companyName}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{test.timeLimit} min</span>
                <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" />{test.questionCount} questions</span>
                {test.passingScore && <span>Pass: {test.passingScore}%</span>}
                {test.dueDate && !isDone && (
                  <span className={`flex items-center gap-1 ${isDeadlineSoon ? "text-orange-600 font-medium" : ""}`}>
                    <Calendar className="h-3 w-3" />
                    Due: {format(new Date(test.dueDate), "dd MMM yyyy")}
                    {isDeadlineSoon && " ⚠️"}
                  </span>
                )}
                {isDone && test.completedAt && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Completed {format(new Date(test.completedAt), "dd MMM yyyy")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="flex-shrink-0">
            {test.applicationId ? (
              isDone ? (
                <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                  <Link href={`/dashboard/job-seeker/tests/${test.applicationId}`}>View</Link>
                </Button>
              ) : (
                <Button size="sm" className="h-8 text-xs bg-purple-600 hover:bg-purple-700" asChild>
                  <Link href={`/dashboard/job-seeker/tests/${test.applicationId}`}>
                    <Play className="h-3.5 w-3.5 mr-1" /> {isInProgress ? "Resume" : "Start"}
                  </Link>
                </Button>
              )
            ) : test.assignmentId ? (
              isDone ? (
                <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
                  <Link href={`/dashboard/job-seeker/tests/${test.assignmentId}?source=college`}>View</Link>
                </Button>
              ) : (
                <Button size="sm" className="h-8 text-xs bg-purple-600 hover:bg-purple-700" asChild>
                  <Link href={`/dashboard/job-seeker/tests/${test.assignmentId}?source=college`}>
                    <Play className="h-3.5 w-3.5 mr-1" /> Start
                  </Link>
                </Button>
              )
            ) : (
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled title="Test link unavailable">
                Unavailable
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
