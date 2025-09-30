"use client"

import { Badge } from "@/components/ui/badge"

import Link from "next/link"

import { useRef } from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { useSession } from "@/hooks/use-session"

interface Question {
  _id: string
  questionText: string
  type: "multiple_choice" | "short_answer" | "code_snippet"
  options?: string[]
}

interface TestDetails {
  _id: string
  title: string
  description?: string
  questions: Question[]
  durationMinutes: number
}

interface ApplicationDetails {
  _id: string
  jobDescriptionId: {
    _id: string
    title: string
  }
  testId: string
  testScore?: number
  status: string
}

export default function TakeTestPage() {
  const params = useParams()
  const router = useRouter()
  const applicationId = params.id as string
  const { toast } = useToast()
  const { session, isLoading: sessionLoading } = useSession()

  const [application, setApplication] = useState<ApplicationDetails | null>(null)
  const [test, setTest] = useState<TestDetails | null>(null)
  const [answers, setAnswers] = useState<{ questionId: string; answer: string | string[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null) // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (applicationId && session) {
      fetchApplicationDetails()
    }
  }, [applicationId, session])

  useEffect(() => {
    if (test && timeLeft === null) {
      setTimeLeft(test.durationMinutes * 60) // Initialize timer
    }
  }, [test, timeLeft])

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !submitting) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev !== null ? prev - 1 : null))
      }, 1000)
    } else if (timeLeft === 0 && !submitting) {
      handleSubmitTest(true) // Auto-submit when time runs out
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [timeLeft, submitting])

  const fetchApplicationDetails = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/applications/${applicationId}`)
      if (response.ok) {
        const data = await response.json()
        setApplication(data.application)
        if (data.application.testId) {
          fetchTestDetails(data.application.testId)
        } else {
          toast({
            title: "Error",
            description: "No test assigned to this application.",
            variant: "destructive",
          })
          router.push("/dashboard/job-seeker/applications")
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch application details.",
          variant: "destructive",
        })
        router.push("/dashboard/job-seeker/applications")
      }
    } catch (error) {
      console.error("Error fetching application details:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch application details.",
        variant: "destructive",
      })
      router.push("/dashboard/job-seeker/applications")
    } finally {
      setLoading(false)
    }
  }

  const fetchTestDetails = async (testId: string) => {
    try {
      const response = await fetch(`/api/tests/${testId}`)
      if (response.ok) {
        const data = await response.json()
        setTest(data)
        // Initialize answers array
        setAnswers(
          data.questions.map((q: Question) => ({
            questionId: q._id,
            answer: q.type === "multiple_choice" ? [] : "",
          })),
        )
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch test details.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching test details:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch test details.",
        variant: "destructive",
      })
    }
  }

  const handleAnswerChange = (questionId: string, value: string | string[], type: Question["type"]) => {
    setAnswers((prevAnswers) =>
      prevAnswers.map((ans) =>
        ans.questionId === questionId
          ? {
              ...ans,
              answer: type === "multiple_choice" && Array.isArray(ans.answer) ? (value as string[]) : (value as string),
            }
          : ans,
      ),
    )
  }

  const handleSubmitTest = async (timedOut = false) => {
    if (!test || !application) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setSubmitting(true)

    try {
      const response = await fetch(`/api/applications/${applicationId}/submit-test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: timedOut ? "Time's Up! Test Submitted" : "Test Submitted",
          description: `Your test has been submitted. Score: ${data.score}%.`,
          variant: "default",
        })
        router.push("/dashboard/job-seeker/applications") // Redirect to applications page
      } else {
        const errorData = await response.json()
        toast({
          title: "Submission Failed",
          description: errorData.message || "An error occurred while submitting the test.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Test submission error:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  if (sessionLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading test...</p>
      </div>
    )
  }

  if (!session || session.role !== "job_seeker") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle>Access Denied</CardTitle>
          <CardDescription className="mt-2">Only job seekers can take tests.</CardDescription>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </Card>
      </div>
    )
  }

  if (!application || !test) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-muted-foreground">Test or application details not found.</p>
      </div>
    )
  }

  if (application.status !== "Test Assigned") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle>Test Status</CardTitle>
          <CardDescription className="mt-2">
            This test is not currently assigned or has already been completed. Current status:{" "}
            <Badge>{application.status}</Badge>
          </CardDescription>
          {application.testScore !== undefined && (
            <p className="mt-2 text-lg font-semibold">Your Score: {application.testScore}%</p>
          )}
          <Button asChild className="mt-4">
            <Link href="/dashboard/job-seeker/applications">Back to Applications</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{test.title}</CardTitle>
          <CardDescription>
            {test.description || "No description provided."}
            <div className="mt-2 flex items-center justify-between">
              <Badge variant="outline">Questions: {test.questions.length}</Badge>
              {timeLeft !== null && (
                <Badge variant={timeLeft <= 60 ? "destructive" : "default"}>Time Left: {formatTime(timeLeft)}</Badge>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmitTest()
            }}
          >
            {test.questions.map((question, index) => (
              <div key={question._id} className="mb-6 p-4 border rounded-md bg-muted/20">
                <h3 className="text-lg font-semibold mb-2">
                  {index + 1}. {question.questionText}
                </h3>
                {question.type === "multiple_choice" && question.options && (
                  <RadioGroup
                    onValueChange={(value) => handleAnswerChange(question._id, value, "multiple_choice")}
                    value={(answers.find((a) => a.questionId === question._id)?.answer as string) || ""}
                  >
                    {question.options.map((option, optIdx) => (
                      <div key={optIdx} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`q${question._id}-opt${optIdx}`} />
                        <Label htmlFor={`q${question._id}-opt${optIdx}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                {question.type === "short_answer" && (
                  <Textarea
                    placeholder="Type your answer here..."
                    value={(answers.find((a) => a.questionId === question._id)?.answer as string) || ""}
                    onChange={(e) => handleAnswerChange(question._id, e.target.value, "short_answer")}
                  />
                )}
                {question.type === "code_snippet" && (
                  <Textarea
                    placeholder="Write your code here..."
                    className="font-mono"
                    rows={8}
                    value={(answers.find((a) => a.questionId === question._id)?.answer as string) || ""}
                    onChange={(e) => handleAnswerChange(question._id, e.target.value, "code_snippet")}
                  />
                )}
              </div>
            ))}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Test
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
