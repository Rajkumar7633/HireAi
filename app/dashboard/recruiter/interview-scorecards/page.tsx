"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ClipboardList, Star, CheckCircle, Plus } from "lucide-react"

export default function InterviewScorecardsPage() {
  const [loading, setLoading] = useState(false)
  const [applicationId, setApplicationId] = useState("")
  const [scorecard, setScorecard] = useState<any>(null)
  const [scores, setScores] = useState({
    technical: 0,
    communication: 0,
    problemSolving: 0,
    cultureFit: 0,
    leadership: 0,
  })
  const [questions, setQuestions] = useState([{ question: "", answer: "", score: 0, notes: "" }])
  const [strengths, setStrengths] = useState("")
  const [weaknesses, setWeaknesses] = useState("")
  const [comments, setComments] = useState("")
  const [recommendation, setRecommendation] = useState("")

  const handleCreateScorecard = async () => {
    if (!applicationId) return

    setLoading(true)
    try {
      const response = await fetch("/api/interview-scorecards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          applicationId,
          interviewType: "Technical",
          interviewDate: new Date().toISOString(),
          interviewDuration: 60,
          scores,
          questions,
          strengths: strengths.split(",").map(s => s.trim()).filter(s => s),
          weaknesses: weaknesses.split(",").map(s => s.trim()).filter(s => s),
          comments,
          recommendation,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setScorecard(data.scorecard)
      }
    } catch (error) {
      console.error("Create scorecard failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitScorecard = async () => {
    if (!scorecard) return

    setLoading(true)
    try {
      const response = await fetch("/api/interview-scorecards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scorecardId: scorecard._id,
          action: "submit",
        }),
      })

      const data = await response.json()
      if (data.success) {
        setScorecard(data.scorecard)
      }
    } catch (error) {
      console.error("Submit scorecard failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const addQuestion = () => {
    setQuestions([...questions, { question: "", answer: "", score: 0, notes: "" }])
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value }
    setQuestions(updated)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <ClipboardList className="w-8 h-8 text-blue-600" />
          Interview Scorecards
        </h1>
        <p className="text-gray-600">Create and manage interview evaluation scorecards</p>
      </div>

      {!scorecard ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Scorecard
            </CardTitle>
            <CardDescription>Start evaluating a candidate interview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="applicationId">Application ID</Label>
              <Input
                id="applicationId"
                placeholder="Enter application ID"
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
              />
            </div>
            <Button onClick={handleCreateScorecard} disabled={!applicationId || loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Scorecard
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scorecard Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Application ID</Label>
                  <div className="text-sm font-medium">{scorecard.applicationId}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={scorecard.status === "Submitted" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {scorecard.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Scoring Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(scores).map(([key, value]) => (
                <div key={key}>
                  <Label className="capitalize">{key}</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="range"
                      min="0"
                      max="10"
                      value={value}
                      onChange={(e) => setScores({ ...scores, [key]: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <div className="w-12 text-center font-bold">{value}/10</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Questions & Answers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((q, idx) => (
                <div key={idx} className="p-4 border rounded space-y-2">
                  <div>
                    <Label>Question {idx + 1}</Label>
                    <Input
                      value={q.question}
                      onChange={(e) => updateQuestion(idx, "question", e.target.value)}
                      placeholder="Enter question"
                    />
                  </div>
                  <div>
                    <Label>Answer</Label>
                    <Textarea
                      value={q.answer}
                      onChange={(e) => updateQuestion(idx, "answer", e.target.value)}
                      placeholder="Candidate's answer"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label>Score (0-10)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={q.score}
                        onChange={(e) => updateQuestion(idx, "score", parseInt(e.target.value))}
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Notes</Label>
                      <Input
                        value={q.notes}
                        onChange={(e) => updateQuestion(idx, "notes", e.target.value)}
                        placeholder="Additional notes"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button onClick={addQuestion} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="strengths">Strengths (comma-separated)</Label>
                <Input
                  id="strengths"
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="e.g., Technical skills, Communication"
                />
              </div>
              <div>
                <Label htmlFor="weaknesses">Weaknesses (comma-separated)</Label>
                <Input
                  id="weaknesses"
                  value={weaknesses}
                  onChange={(e) => setWeaknesses(e.target.value)}
                  placeholder="e.g., Time management, Documentation"
                />
              </div>
              <div>
                <Label htmlFor="comments">Overall Comments</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Additional comments about the candidate"
                />
              </div>
              <div>
                <Label htmlFor="recommendation">Recommendation</Label>
                <Select value={recommendation} onValueChange={setRecommendation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Strong Hire">Strong Hire</SelectItem>
                    <SelectItem value="Hire">Hire</SelectItem>
                    <SelectItem value="Maybe">Maybe</SelectItem>
                    <SelectItem value="No Hire">No Hire</SelectItem>
                    <SelectItem value="Strong No Hire">Strong No Hire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button onClick={handleSubmitScorecard} disabled={loading || scorecard.status === "Submitted"}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Submit Scorecard
                </>
              )}
            </Button>
          </div>

          {scorecard.status === "Submitted" && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Scorecard submitted successfully on {new Date(scorecard.submittedAt).toLocaleDateString()}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  )
}
