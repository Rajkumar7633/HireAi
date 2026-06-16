"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowLeft, Plus, Trash2, Save, Code2, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Question {
  questionText: string
  type: "multiple_choice" | "short_answer" | "code_snippet"
  options: string[]
  correctAnswer: string
  points?: number
}

export default function CollegeTestEditPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const testId = (params?.id ?? "") as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isCoding, setIsCoding] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [passingScore, setPassingScore] = useState(70)
  const [questions, setQuestions] = useState<Question[]>([
    { questionText: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "", points: 10 },
  ])

  useEffect(() => {
    if (testId) fetchTest()
  }, [testId])

  const fetchTest = async () => {
    try {
      const res = await fetch(`/api/college/tests/${testId}`)
      if (!res.ok) throw new Error("Failed")
      const data = await res.json()
      const qs = data.questions || []
      const coding = qs.length > 0 && qs.every((q: Question) => q.type === "code_snippet")
      setIsCoding(coding)
      setTitle(data.title || "")
      setDescription(data.description || "")
      setDurationMinutes(data.durationMinutes || data.timeLimit || 60)
      setPassingScore(data.passingScore || 70)
      setQuestions(
        qs.length > 0
          ? qs.map((q: Question) => ({
              questionText: q.questionText || "",
              type: q.type || "multiple_choice",
              options: q.options?.length ? q.options : ["", "", "", ""],
              correctAnswer: q.correctAnswer || "",
              points: q.points || 10,
            }))
          : [{ questionText: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "", points: 10 }],
      )
    } catch {
      toast({ title: "Error", description: "Failed to load test.", variant: "destructive" })
      router.push("/dashboard/college/assign-tests")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast({ title: "Title required", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        title,
        description,
        durationMinutes,
        passingScore,
      }
      if (!isCoding) {
        payload.questions = questions.filter((q) => q.questionText.trim())
      }

      const res = await fetch(`/api/college/tests/${testId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { message?: string }).message || "Update failed")
      }
      toast({ title: "Test updated", description: "Changes saved successfully." })
      router.push("/dashboard/college/assign-tests")
    } catch (err: unknown) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Could not save",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="dashboard-page max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Edit Test</h1>
          {isCoding && (
            <Badge className="bg-purple-100 text-purple-800">
              <Code2 className="h-3 w-3 mr-1" /> Coding
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/college/tests/${testId}/analytics`}>
              <BarChart3 className="h-4 w-4 mr-1" /> Analytics
            </Link>
          </Button>
        </div>
      </div>

      {isCoding && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="py-3 text-sm text-amber-900">
            Coding problem statements are locked here. Update title, duration, and passing score.
            To change problems, create a new coding test and re-assign.
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" min={5} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Passing score (%)</Label>
                <Input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {!isCoding && questions.map((q, idx) => (
          <Card key={idx}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Question {idx + 1}</Label>
                {questions.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Textarea value={q.questionText} onChange={(e) => {
                const next = [...questions]
                next[idx] = { ...q, questionText: e.target.value }
                setQuestions(next)
              }} />
              <Select value={q.type} onValueChange={(v) => {
                const next = [...questions]
                next[idx] = { ...q, type: v as Question["type"] }
                setQuestions(next)
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                  <SelectItem value="short_answer">Short answer</SelectItem>
                </SelectContent>
              </Select>
              {q.type === "multiple_choice" && q.options.map((opt, oi) => (
                <Input key={oi} value={opt} placeholder={`Option ${oi + 1}`} onChange={(e) => {
                  const next = [...questions]
                  const opts = [...q.options]
                  opts[oi] = e.target.value
                  next[idx] = { ...q, options: opts }
                  setQuestions(next)
                }} />
              ))}
              <Input value={q.correctAnswer} placeholder="Correct answer" onChange={(e) => {
                const next = [...questions]
                next[idx] = { ...q, correctAnswer: e.target.value }
                setQuestions(next)
              }} />
            </CardContent>
          </Card>
        ))}

        {!isCoding && (
          <Button type="button" variant="outline" onClick={() => setQuestions([...questions, {
            questionText: "", type: "multiple_choice", options: ["", "", "", ""], correctAnswer: "", points: 10,
          }])}>
            <Plus className="h-4 w-4 mr-1" /> Add question
          </Button>
        )}

        <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save changes
        </Button>
      </form>
    </div>
  )
}
