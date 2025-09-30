"use client"

import Link from "next/link"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { useSession } from "@/hooks/use-session"

interface Resume {
  _id: string
  filename: string
}

interface JobDescriptionLite {
  _id: string
  title: string
  applicationMode?: "resume_only" | "resume_plus_form" | "form_only"
  screeningQuestions?: string[]
  description?: string
  requirements?: string[]
  responsibilities?: string[]
  skillsRequired?: string[]
  benefits?: string[]
  location?: string
  salary?: string
  employmentType?: string
  experienceLevel?: string
  remotePolicy?: string
  visaSponsorship?: boolean
}

export default function ApplyJobPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const { toast } = useToast()
  const { session, isLoading: sessionLoading } = useSession()

  const [job, setJob] = useState<JobDescriptionLite | null>(null)
  const [jobTitle, setJobTitle] = useState("Loading Job...")
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [answers, setAnswers] = useState<{ [q: string]: string }>({})
  const [profile, setProfile] = useState<{ experienceLevel?: string; expectedSalary?: string; location?: string; skills?: string[] }>({})

  useEffect(() => {
    if (jobId) {
      fetchJobDetails()
      if (session?.role === "job_seeker") {
        fetchResumes()
      }
    }
  }, [jobId, session])

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`/api/job-descriptions/${jobId}`)
      if (response.ok) {
        const data = await response.json()
        setJobTitle(data.jobDescription.title)
        setJob({
          _id: data.jobDescription._id,
          title: data.jobDescription.title,
          applicationMode: data.jobDescription.applicationMode,
          screeningQuestions: data.jobDescription.screeningQuestions || [],
          description: data.jobDescription.description,
          requirements: data.jobDescription.requirements || [],
          responsibilities: data.jobDescription.responsibilities || [],
          skillsRequired: data.jobDescription.skillsRequired || [],
          benefits: data.jobDescription.benefits || [],
          location: data.jobDescription.location,
          salary: data.jobDescription.salary,
          employmentType: data.jobDescription.employmentType,
          experienceLevel: data.jobDescription.experienceLevel,
          remotePolicy: data.jobDescription.remotePolicy,
          visaSponsorship: data.jobDescription.visaSponsorship,
        })
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch job details.",
          variant: "destructive",
        })
        router.push("/dashboard/jobs")
      }
    } catch (error) {
      console.error("Error fetching job details:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch job details.",
        variant: "destructive",
      })
      router.push("/dashboard/jobs")
    }
  }

  const fetchResumes = async () => {
    try {
      const response = await fetch("/api/resume/my-resumes")
      if (response.ok) {
        const data = await response.json()
        setResumes(data)
        if (data.length > 0) {
          setSelectedResumeId(data[0]._id) // Auto-select first resume
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.message || "Failed to fetch your resumes.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching resumes:", error)
      toast({
        title: "Error",
        description: "Network error. Failed to fetch resumes.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitApplication = async () => {
    const mode = job?.applicationMode || "resume_plus_form"
    const requireResume = mode === "resume_only" || mode === "resume_plus_form"
    if (requireResume && !selectedResumeId) {
      toast({ title: "Missing Resume", description: "Please select a resume to apply with.", variant: "destructive" })
      return
    }
    // Validate screening answers if required
    const qs = job?.screeningQuestions || []
    if ((mode === "resume_plus_form" || mode === "form_only") && qs.length > 0) {
      const missing = qs.some((q) => !(answers[q] && answers[q].trim()))
      if (missing) {
        toast({ title: "Incomplete Form", description: "Please answer all screening questions.", variant: "destructive" })
        return
      }
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobDescriptionId: jobId,
          resumeId: selectedResumeId,
          screeningAnswers: (job?.screeningQuestions || []).map((q) => ({ question: q, answer: answers[q] || "" })),
          applicationProfile: profile,
        }),
      })

      if (response.ok) {
        toast({
          title: "Application Submitted",
          description: "Your application has been successfully submitted!",
        })
        router.push("/dashboard/job-seeker/applications")
      } else {
        const errorData = await response.json()
        toast({
          title: "Application Failed",
          description: errorData.message || "An error occurred while submitting your application.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Application submission error:", error)
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <p className="ml-2">Loading application page...</p>
      </div>
    )
  }

  if (session?.role !== "job_seeker") {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md text-center p-6">
          <CardTitle>Access Denied</CardTitle>
          <CardDescription className="mt-2">Only job seekers can apply for jobs.</CardDescription>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </Card>
      </div>
    )
  }

  // Helpers for UI conditions
  const mode = job?.applicationMode || "resume_plus_form"
  const requireResume = mode === "resume_only" || mode === "resume_plus_form"
  const requireForm = mode === "resume_plus_form" || mode === "form_only"

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Job details */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{jobTitle}</CardTitle>
              <CardDescription className="space-y-1">
                {job?.location && <div>{job.location}</div>}
                <div className="text-xs text-muted-foreground">
                  {job?.employmentType || ""}
                  {job?.experienceLevel ? ` • ${job.experienceLevel}` : ""}
                  {job?.remotePolicy ? ` • ${job.remotePolicy}` : ""}
                  {typeof job?.visaSponsorship === "boolean" ? ` • Visa: ${job.visaSponsorship ? "Yes" : "No"}` : ""}
                </div>
                {job?.salary && <div className="text-xs text-muted-foreground">Salary: {job.salary}</div>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {job?.description && (
                <div>
                  <div className="font-semibold mb-1">Job Description</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</div>
                </div>
              )}
              {job?.requirements && job.requirements.length > 0 && (
                <div>
                  <div className="font-semibold mb-1">Requirements</div>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {job.requirements.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {job?.responsibilities && job.responsibilities.length > 0 && (
                <div>
                  <div className="font-semibold mb-1">Responsibilities</div>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {job.responsibilities.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              {job?.skillsRequired && job.skillsRequired.length > 0 && (
                <div>
                  <div className="font-semibold mb-1">Required Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {job.skillsRequired.map((s, i) => (
                      <span key={i} className="text-xs rounded-md bg-muted px-2 py-1">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {job?.benefits && job.benefits.length > 0 && (
                <div>
                  <div className="font-semibold mb-1">Benefits</div>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {job.benefits.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Apply form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Apply for this job</CardTitle>
              <CardDescription>
                {mode === "resume_only" && "Submit your resume to apply."}
                {mode === "resume_plus_form" && "Select a resume and answer a few questions."}
                {mode === "form_only" && "Please answer the questions to apply (resume optional)."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
          {/* Stepper */}
          {requireResume && (
            <div className="space-y-2">
              <Label htmlFor="resume-select">Select Resume</Label>
              {resumes.length === 0 ? (
                <div className="mt-2 text-muted-foreground">
                  You have no resumes uploaded. Please{" "}
                  <Link href="/dashboard/job-seeker/upload" className="underline text-purple-600">
                    upload a resume
                  </Link>{" "}
                  first.
                </div>
              ) : (
                <Select value={selectedResumeId || ""} onValueChange={setSelectedResumeId}>
                  <SelectTrigger id="resume-select" className="w-full mt-2">
                    <SelectValue placeholder="Select a resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume._id} value={resume._id}>
                        {resume.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {requireForm && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Screening Questions</Label>
                <div className="space-y-3">
                  {(job?.screeningQuestions || []).length === 0 && (
                    <div className="text-sm text-muted-foreground">No screening questions for this job.</div>
                  )}
                  {(job?.screeningQuestions || []).map((q, i) => (
                    <div key={i} className="space-y-1">
                      <Label className="text-sm">{q}</Label>
                      <textarea
                        className="w-full rounded-md border bg-background p-2 text-sm"
                        rows={3}
                        value={answers[q] || ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Your Profile</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Experience Level</Label>
                    <select
                      className="w-full rounded-md border bg-background p-2 text-sm"
                      value={profile.experienceLevel || ""}
                      onChange={(e) => setProfile((p) => ({ ...p, experienceLevel: e.target.value }))}
                    >
                      <option value="">Select</option>
                      <option value="Intern">Intern</option>
                      <option value="Junior">Junior</option>
                      <option value="Mid">Mid</option>
                      <option value="Senior">Senior</option>
                      <option value="Lead">Lead</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">Expected Salary</Label>
                    <input
                      className="w-full rounded-md border bg-background p-2 text-sm"
                      value={profile.expectedSalary || ""}
                      onChange={(e) => setProfile((p) => ({ ...p, expectedSalary: e.target.value }))}
                      placeholder="e.g. $120,000"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Location</Label>
                    <input
                      className="w-full rounded-md border bg-background p-2 text-sm"
                      value={profile.location || ""}
                      onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                      placeholder="Your current location"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Skills (comma-separated)</Label>
                    <input
                      className="w-full rounded-md border bg-background p-2 text-sm"
                      value={(profile.skills || []).join(", ")}
                      onChange={(e) => setProfile((p) => ({ ...p, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                      placeholder="JavaScript, React, Node.js"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button onClick={handleSubmitApplication} disabled={submitting || (requireResume && !selectedResumeId)} className="w-full">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
