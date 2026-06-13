"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, Plus, Trash2, ListOrdered } from "lucide-react"

interface Question {
  questionText: string
  type: "multiple_choice" | "short_answer"
  options: string[]
  correctAnswer: string
  points: number
}

const emptyQuestion = (): Question => ({
  questionText: "",
  type: "multiple_choice",
  options: ["", "", "", ""],
  correctAnswer: "",
  points: 10,
})

export default function CollegeCreateMcqPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()])
  const [loading, setLoading] = useState(false)

  const updateQuestion = (index: number, field: keyof Question, value: unknown) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q)),
    )
  }

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) }
          : q,
      ),
    )
  }

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()])
  const removeQuestion = (index: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== index))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const valid = questions.filter((q) => q.questionText.trim())
    if (!title.trim() || valid.length === 0) {
      toast({
        title: "Missing fields",
        description: "Title and at least one question are required.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/college/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          durationMinutes,
          questions: valid,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "Failed to create test")
      }
      toast({ title: "Test created", description: "Your MCQ test is ready to assign." })
      router.push("/dashboard/college/assign-tests")
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Could not create test",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-blue-600" />
          <h1 className="text-2xl font-bold">Create MCQ Test</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test details</CardTitle>
          <CardDescription>
            Build a multiple-choice assessment for your onboarded students.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Data Structures Quiz"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What this test covers…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Questions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-1" /> Add question
                </Button>
              </div>

              {questions.map((q, qi) => (
                <Card key={qi} className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Question {qi + 1}</span>
                    {questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(qi)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <Textarea
                    value={q.questionText}
                    onChange={(e) => updateQuestion(qi, "questionText", e.target.value)}
                    placeholder="Question text"
                    required
                  />

                  <Select
                    value={q.type}
                    onValueChange={(v) => updateQuestion(qi, "type", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                      <SelectItem value="short_answer">Short answer</SelectItem>
                    </SelectContent>
                  </Select>

                  {q.type === "multiple_choice" && (
                    <div className="space-y-2">
                      <Label>Options</Label>
                      {q.options.map((opt, oi) => (
                        <Input
                          key={oi}
                          value={opt}
                          onChange={(e) => updateOption(qi, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                        />
                      ))}
                      <Label>Correct answer</Label>
                      <Select
                        value={q.correctAnswer}
                        onValueChange={(v) => updateQuestion(qi, "correctAnswer", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select correct option" />
                        </SelectTrigger>
                        <SelectContent>
                          {q.options
                            .filter((o) => o.trim())
                            .map((o) => (
                              <SelectItem key={o} value={o}>{o}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {q.type === "short_answer" && (
                    <div className="space-y-2">
                      <Label>Expected answer</Label>
                      <Input
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(qi, "correctAnswer", e.target.value)}
                        placeholder="Reference answer"
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/college/assign-tests")}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create test
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
