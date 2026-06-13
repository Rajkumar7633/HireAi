"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Mic, MicOff, Volume2, ArrowRight, Award, Brain, CheckCircle2, MessageCircle } from "lucide-react"
import { ScoreRing } from "@/components/ui/charts"

interface QuestionReport {
  questionText: string
  answerText: string
  feedback: string
  score: number
  fillerWords: string[]
}

export default function MockInterviewPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState<{ _id: string; title: string; company?: string }[]>([])
  const [selectedJobId, setSelectedJobId] = useState("")

  // Interview state
  const [interviewId, setInterviewId] = useState("")
  const [questions, setQuestions] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [step, setStep] = useState<"setup" | "interview" | "report">("setup")

  // Report state
  const [overallScore, setOverallScore] = useState(0)
  const [overallFeedback, setOverallFeedback] = useState("")
  const [detailedQuestions, setDetailedQuestions] = useState<QuestionReport[]>([])

  // Speech Recognition Ref
  const recognitionRef = useRef<any>(null)

  // Fetch jobs on load
  useEffect(() => {
    async function fetchJobs() {
      try {
        setLoading(true)
        const res = await fetch("/api/job-description/all")
        if (res.ok) {
          const data = await res.json()
          setJobs(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchJobs()
  }, [])

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const rec = new SpeechRecognition()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = "en-US"

        rec.onresult = (event: any) => {
          let currentTranscript = ""
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript
          }
          setTranscript(currentTranscript)
        }

        rec.onerror = (e: any) => {
          console.error("Speech recognition error:", e)
        }

        recognitionRef.current = rec
      }
    }
  }, [])

  // Speak the question text
  const speakQuestion = (text: string) => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      // Cancel previous speakings
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      window.speechSynthesis.speak(utterance)
    } else {
      toast({ title: "Text-to-speech not supported", description: "Your browser does not support speaking questions." })
    }
  }

  // Speak when question changes
  useEffect(() => {
    if (step === "interview" && questions[currentIndex]) {
      // Give a slight delay before speaking
      const t = setTimeout(() => {
        speakQuestion(questions[currentIndex])
      }, 500)
      return () => clearTimeout(t)
    }
  }, [currentIndex, step, questions])

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Microphone error",
        description: "Speech-to-text recognition not supported in this browser.",
        variant: "destructive",
      })
      return
    }
    setTranscript("")
    setIsRecording(true)
    recognitionRef.current.start()
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
  }

  const handleStartInterview = async () => {
    if (!selectedJobId) {
      toast({ title: "Job required", description: "Select a job description to practice.", variant: "destructive" })
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/mock-interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId }),
      })

      if (!res.ok) throw new Error("Failed to start session")
      const data = await res.json()
      setInterviewId(data.interviewId)
      setQuestions(data.questions)
      setCurrentIndex(0)
      setTranscript("")
      setStep("interview")
    } catch (err: any) {
      toast({ title: "Error starting session", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!transcript.trim()) {
      toast({ title: "Answer empty", description: "Speak or type your answer before submitting.", variant: "destructive" })
      return
    }

    try {
      setLoading(true)
      stopRecording()

      const res = await fetch("/api/mock-interview/submit-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          questionIndex: currentIndex,
          answerText: transcript,
        }),
      })

      if (!res.ok) throw new Error("Failed to evaluate answer")

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1)
        setTranscript("")
      } else {
        // Finalize
        const finalRes = await fetch("/api/mock-interview/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewId }),
        })
        if (!finalRes.ok) throw new Error("Failed to finalize session")
        const finalData = await finalRes.json()

        // Fetch detailed results
        const reportRes = await fetch(`/api/mock-interview/${interviewId}`)
        if (reportRes.ok) {
          const reportData = await reportRes.json()
          setDetailedQuestions(reportData.questions)
        }

        setOverallScore(finalData.overallScore)
        setOverallFeedback(finalData.overallFeedback)
        setStep("report")
      }
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-8 p-4">
      {/* HEADER SECTION */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
          AI Interview Prep
        </h1>
        <p className="text-muted-foreground">
          Practice interactive mock interviews out loud. Get immediate feedback on tech stack alignment, filler words, and answer format.
        </p>
      </div>

      {step === "setup" && (
        <Card className="border-violet-100 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Set Up Practice Session</CardTitle>
            <CardDescription>Select the target role you want to practice for.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Job Title</label>
              <select
                className="w-full border rounded-md p-3 bg-background focus:ring-2 focus:ring-violet-500 outline-none"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                <option value="">-- Choose Job Description --</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title} {j.company ? `(${j.company})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium shadow-md transition-all duration-200"
              onClick={handleStartInterview}
              disabled={loading || !selectedJobId}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing AI Agent...
                </>
              ) : (
                "Start Mock Interview"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "interview" && (
        <Card className="border-violet-100 shadow-lg relative overflow-hidden">
          {/* Top Indicator */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-indigo-600" />
          <CardHeader className="flex flex-row justify-between items-center bg-violet-50/30">
            <div>
              <CardTitle className="text-lg font-bold">Mock Interview Session</CardTitle>
              <CardDescription>Speak clearly into your microphone.</CardDescription>
            </div>
            <Badge variant="secondary" className="px-3 py-1 font-semibold text-violet-700 bg-violet-100">
              Question {currentIndex + 1} of {questions.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-8 mt-6">
            {/* Interactive Voice Assistant Bubble */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="h-6 w-6 text-violet-600 animate-pulse" />
                <span className="text-xs font-bold text-violet-600 uppercase tracking-widest">AI Recruiter</span>
              </div>
              <p className="text-lg font-medium text-center text-slate-800 max-w-xl">
                "{questions[currentIndex]}"
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100"
                onClick={() => speakQuestion(questions[currentIndex])}
              >
                <Volume2 className="h-4 w-4 mr-2" /> Repeat Question
              </Button>
            </div>

            {/* Answer Transcription / Live Panel */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-700">Your Transcribed Response</label>
                {isRecording && (
                  <span className="flex items-center gap-1.5 text-red-500 font-bold text-xs uppercase animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Recording...
                  </span>
                )}
              </div>
              <textarea
                className="w-full min-h-[160px] p-4 border rounded-xl bg-white focus:ring-2 focus:ring-violet-500 outline-none placeholder:text-muted-foreground shadow-inner text-slate-800"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Click the microphone and start speaking, or type your answer directly..."
              />
            </div>

            {/* Voice Controls */}
            <div className="flex justify-between items-center gap-4">
              {isRecording ? (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="px-6 py-2 shadow-sm font-semibold"
                >
                  <MicOff className="h-4 w-4 mr-2" /> Stop Mic
                </Button>
              ) : (
                <Button
                  onClick={startRecording}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 shadow-md font-semibold"
                >
                  <Mic className="h-4 w-4 mr-2" /> Talk Now
                </Button>
              )}

              <Button
                onClick={handleSubmitAnswer}
                disabled={loading || !transcript.trim()}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-6 py-2 shadow-md font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating...
                  </>
                ) : (
                  <>
                    {currentIndex < questions.length - 1 ? "Next Question" : "Submit & View Report"}{" "}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "report" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Score Overview Banner */}
          <Card className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl border-none">
            <CardContent className="flex flex-col md:flex-row justify-between items-center gap-6 p-8">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="h-6 w-6" />
                  <span className="text-xs uppercase font-bold tracking-widest opacity-80">Practice Assessment Done</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">AI Interview Coaching Score</h2>
                <p className="text-sm opacity-90 max-w-md">
                  "{overallFeedback}"
                </p>
              </div>
              <div className="flex flex-col items-center bg-white rounded-2xl px-6 py-4 shadow-lg">
                <ScoreRing value={overallScore} size={110} stroke={9} label="Overall" sublabel="Rating" />
              </div>
            </CardContent>
          </Card>

          {/* Detailed Question breakdown */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-violet-600" /> Detail Question Breakdown
            </h3>
            {detailedQuestions.map((q, i) => (
              <Card key={i} className="border-slate-100 shadow-sm">
                <CardHeader className="bg-slate-50/50 flex flex-row justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">Question {i + 1}</span>
                    <CardTitle className="text-base font-semibold text-slate-800">
                      "{q.questionText}"
                    </CardTitle>
                  </div>
                  <ScoreRing value={q.score} size={56} stroke={5} sublabel="Score" />
                </CardHeader>
                <CardContent className="space-y-4 mt-4">
                  <div className="space-y-1 bg-violet-50/30 p-3 rounded-lg border border-violet-100/50">
                    <span className="text-xs font-bold text-violet-700">Your Transcribed Response</span>
                    <p className="text-sm text-slate-700 leading-relaxed italic">
                      "{q.answerText || "No answer submitted."}"
                    </p>
                  </div>

                  {q.fillerWords && q.fillerWords.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-amber-700">Filler words detected:</span>
                      {q.fillerWords.map((word, index) => (
                        <Badge key={index} variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                          {word}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500">AI Recruiter Feedback</span>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border">
                      {q.feedback}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-md px-8 py-3"
              onClick={() => {
                setStep("setup")
                setSelectedJobId("")
                setInterviewId("")
                setQuestions([])
              }}
            >
              Start Another Practice Session
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
