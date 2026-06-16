"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/hooks/use-session"
import {
  Loader2, CheckCircle2, FileText, MessageSquare, User, Send,
  ChevronRight, ArrowLeft, Briefcase, MapPin, DollarSign, Globe,
  AlertCircle, Upload, Eye, Star,
} from "lucide-react"

interface Resume { _id: string; filename: string; fileUrl?: string }

interface Job {
  _id: string; title: string; location?: string; salary?: string;
  employmentType?: string; experienceLevel?: string; remotePolicy?: string;
  visaSponsorship?: boolean; description?: string; requirements?: string[];
  responsibilities?: string[]; skillsRequired?: string[]; benefits?: string[];
  applicationMode?: "resume_only" | "resume_plus_form" | "form_only";
  screeningQuestions?: string[];
  companyId?: { name?: string; logoUrl?: string };
}

type StepId = "resume" | "questions" | "profile" | "review";

const STEPS: { id: StepId; label: string; icon: React.ReactNode }[] = [
  { id: "resume",    label: "Resume",    icon: <FileText className="h-4 w-4" /> },
  { id: "questions", label: "Questions", icon: <MessageSquare className="h-4 w-4" /> },
  { id: "profile",   label: "Profile",   icon: <User className="h-4 w-4" /> },
  { id: "review",    label: "Review",    icon: <Eye className="h-4 w-4" /> },
];

export default function ApplyJobPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  const { toast } = useToast()
  const { session, isLoading: sessionLoading } = useSession()

  const [job, setJob] = useState<Job | null>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [step, setStep] = useState<StepId>("resume")
  const [answers, setAnswers] = useState<{ [q: string]: string }>({})
  const [profile, setProfile] = useState<{
    experienceLevel?: string; expectedSalary?: string;
    location?: string; skills?: string[]; noticePeriod?: string; coverNote?: string;
  }>({})

  useEffect(() => {
    if (jobId) fetchJob()
  }, [jobId])

  useEffect(() => {
    if (session?.role === "job_seeker") fetchResumes()
  }, [session])

  const fetchJob = async () => {
    try {
      const r = await fetch(`/api/job-descriptions/${jobId}`)
      if (r.ok) {
        const d = await r.json()
        setJob(d.jobDescription)
      } else {
        router.push("/dashboard/jobs")
      }
    } catch {
      router.push("/dashboard/jobs")
    }
  }

  const fetchResumes = async () => {
    try {
      const r = await fetch("/api/resume/my-resumes")
      if (r.ok) {
        const d = await r.json()
        setResumes(d)
        if (d.length > 0) setSelectedResumeId(d[0]._id)
      }
    } catch { /**/ }
    finally { setLoading(false) }
  }

  const mode = job?.applicationMode || "resume_plus_form"
  const requireResume = mode === "resume_only" || mode === "resume_plus_form"
  const requireQuestions = (mode === "resume_plus_form" || mode === "form_only") && (job?.screeningQuestions || []).length > 0

  // Determine visible steps
  const visibleSteps = STEPS.filter(s => {
    if (s.id === "resume") return requireResume
    if (s.id === "questions") return requireQuestions
    if (s.id === "profile") return mode !== "resume_only"
    return true // review always shown
  })

  const currentIdx = visibleSteps.findIndex(s => s.id === step)
  const isFirst = currentIdx === 0
  const isLast = currentIdx === visibleSteps.length - 1
  const prevStep = () => { if (!isFirst) setStep(visibleSteps[currentIdx - 1].id) }
  const nextStep = () => {
    if (step === "resume" && requireResume && !selectedResumeId) {
      toast({ title: "Select a resume", description: "Please choose a resume to continue.", variant: "destructive" })
      return
    }
    if (step === "questions") {
      const qs = job?.screeningQuestions || []
      const missing = qs.some(q => !(answers[q] && answers[q].trim()))
      if (missing) {
        toast({ title: "Answer all questions", description: "Please fill in all screening questions.", variant: "destructive" })
        return
      }
    }
    if (!isLast) setStep(visibleSteps[currentIdx + 1].id)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const r = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescriptionId: jobId,
          resumeId: selectedResumeId,
          screeningAnswers: (job?.screeningQuestions || []).map(q => ({ question: q, answer: answers[q] || "" })),
          applicationProfile: profile,
        }),
      })
      if (r.ok) {
        setSubmitted(true)
      } else {
        const d = await r.json()
        toast({ title: "Application failed", description: d.message || "Please try again.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Network error", description: "Please try again.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-500 mb-2">You've successfully applied to <strong>{job?.title}</strong></p>
          {job?.companyId?.name && <p className="text-gray-400 text-sm mb-6">at {job.companyId.name}</p>}
          <div className="space-y-2">
            <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
              <Link href="/dashboard/job-seeker/applications">View My Applications</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/dashboard/jobs">Browse More Jobs</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading || sessionLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        <span className="ml-3 text-gray-500">Loading…</span>
      </div>
    )
  }

  if (session?.role !== "job_seeker") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm w-full text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="font-bold text-lg text-gray-900">Access Denied</h2>
          <p className="text-gray-500 text-sm mt-1">Only job seekers can apply for jobs.</p>
          <Button asChild className="mt-4 w-full">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const selectedResume = resumes.find(r => r._id === selectedResumeId)
  const qs = job?.screeningQuestions || []
  const answeredCount = qs.filter(q => answers[q]?.trim()).length
  const allSkills = job?.skillsRequired || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="dashboard-subheader">
        <div className="w-full px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href={`/dashboard/jobs/${jobId}`}><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-gray-900 truncate">{job?.title}</h1>
              <p className="text-xs text-gray-500">{job?.companyId?.name} {job?.location ? `· ${job.location}` : ""}</p>
            </div>
            {/* Stepper */}
            <div className="hidden md:flex items-center gap-1">
              {visibleSteps.map((s, i) => {
                const isDone = visibleSteps.findIndex(x => x.id === step) > i
                const isCurrent = s.id === step
                return (
                  <div key={s.id} className="flex items-center">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isCurrent ? "bg-purple-600 text-white" :
                      isDone ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.icon}
                      {s.label}
                    </div>
                    {i < visibleSteps.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 mx-1" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: step form ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Mobile step indicator */}
          <div className="flex items-center gap-1 md:hidden">
            {visibleSteps.map((s, i) => (
              <div key={s.id} className={`flex-1 h-1.5 rounded-full ${i <= currentIdx ? "bg-purple-600" : "bg-gray-200"}`} />
            ))}
          </div>

          {/* Step: Resume */}
          {step === "resume" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" /> Select Your Resume
              </h2>
              <p className="text-sm text-gray-500 mb-5">Choose which resume to submit with your application</p>

              {resumes.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                  <Upload className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium text-gray-600">No resumes uploaded yet</p>
                  <p className="text-sm text-gray-400 mt-1">Upload a resume to apply</p>
                  <Button asChild className="mt-4 bg-purple-600 hover:bg-purple-700">
                    <Link href="/dashboard/job-seeker/upload">Upload Resume</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {resumes.map(r => (
                    <label key={r._id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedResumeId === r._id ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-purple-200 bg-white"
                    }`}>
                      <input type="radio" name="resume" value={r._id} checked={selectedResumeId === r._id}
                        onChange={() => setSelectedResumeId(r._id)} className="sr-only" />
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        selectedResumeId === r._id ? "bg-purple-100" : "bg-gray-100"
                      }`}>
                        <FileText className={`h-5 w-5 ${selectedResumeId === r._id ? "text-purple-600" : "text-gray-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${selectedResumeId === r._id ? "text-purple-800" : "text-gray-900"}`}>
                          {r.filename}
                        </p>
                        {r.fileUrl && <p className="text-xs text-gray-400 truncate">{r.fileUrl}</p>}
                      </div>
                      {selectedResumeId === r._id && <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0" />}
                    </label>
                  ))}
                  <div className="pt-2">
                    <Link href="/dashboard/job-seeker/upload" className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                      <Upload className="h-3.5 w-3.5" /> Upload a different resume
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Questions */}
          {step === "questions" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" /> Screening Questions
              </h2>
              <p className="text-sm text-gray-500 mb-5">
                {answeredCount}/{qs.length} answered — all required
              </p>
              {qs.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-400" />
                  <p className="text-gray-600 font-medium">No screening questions for this job</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {qs.map((q, i) => (
                    <div key={i} className="space-y-2">
                      <Label className="font-medium text-gray-800 flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                        {q}
                      </Label>
                      <textarea
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 p-3 text-sm resize-none outline-none transition-all"
                        rows={3}
                        value={answers[q] || ""}
                        onChange={e => setAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                        placeholder="Your answer…"
                      />
                      {answers[q]?.trim() && (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Answered
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Profile */}
          {step === "profile" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" /> Your Application Profile
              </h2>
              <p className="text-sm text-gray-500 mb-5">Optional details to help the recruiter evaluate you faster</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Experience Level</Label>
                    <Select value={profile.experienceLevel || ""} onValueChange={v => setProfile(p => ({ ...p, experienceLevel: v }))}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Intern", "Junior", "Mid", "Senior", "Lead", "Manager"].map(l => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Expected Salary</Label>
                    <Input className="h-9 text-sm" value={profile.expectedSalary || ""} onChange={e => setProfile(p => ({ ...p, expectedSalary: e.target.value }))} placeholder="e.g. $120,000/yr" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Current Location</Label>
                    <Input className="h-9 text-sm" value={profile.location || ""} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} placeholder="City, Country" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-gray-700">Notice Period</Label>
                    <Select value={profile.noticePeriod || ""} onValueChange={v => setProfile(p => ({ ...p, noticePeriod: v }))}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Immediately", "2 weeks", "1 month", "2 months", "3 months"].map(l => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Relevant Skills (comma-separated)</Label>
                  <Input className="h-9 text-sm" value={(profile.skills || []).join(", ")} onChange={e => setProfile(p => ({ ...p, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))} placeholder="JavaScript, React, Node.js" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Cover Note <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <textarea
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-100 p-3 text-sm resize-none outline-none transition-all"
                    rows={4}
                    value={profile.coverNote || ""}
                    onChange={e => setProfile(p => ({ ...p, coverNote: e.target.value }))}
                    placeholder="Brief personal message to the recruiter (optional)…"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Review */}
          {step === "review" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-purple-600" /> Review Your Application
                </h2>

                <div className="space-y-4">
                  {requireResume && (
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <FileText className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Resume</p>
                        <p className="font-medium text-gray-900 text-sm">{selectedResume?.filename || "Not selected"}</p>
                      </div>
                      <button onClick={() => setStep("resume")} className="ml-auto text-xs text-purple-600 hover:text-purple-800 font-medium">Edit</button>
                    </div>
                  )}

                  {requireQuestions && qs.length > 0 && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Screening Answers</p>
                        <button onClick={() => setStep("questions")} className="text-xs text-purple-600 hover:text-purple-800 font-medium">Edit</button>
                      </div>
                      <div className="space-y-2">
                        {qs.map((q, i) => (
                          <div key={i} className="text-sm">
                            <p className="font-medium text-gray-700 text-xs">{q}</p>
                            <p className="text-gray-600 mt-0.5 text-xs">{answers[q] || <span className="text-red-400 italic">Not answered</span>}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mode !== "resume_only" && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile</p>
                        <button onClick={() => setStep("profile")} className="text-xs text-purple-600 hover:text-purple-800 font-medium">Edit</button>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {profile.experienceLevel && <div><span className="text-gray-500">Experience: </span><span className="font-medium text-gray-800">{profile.experienceLevel}</span></div>}
                        {profile.expectedSalary && <div><span className="text-gray-500">Salary: </span><span className="font-medium text-gray-800">{profile.expectedSalary}</span></div>}
                        {profile.location && <div><span className="text-gray-500">Location: </span><span className="font-medium text-gray-800">{profile.location}</span></div>}
                        {profile.noticePeriod && <div><span className="text-gray-500">Notice: </span><span className="font-medium text-gray-800">{profile.noticePeriod}</span></div>}
                        {(profile.skills || []).length > 0 && <div className="col-span-2"><span className="text-gray-500">Skills: </span><span className="font-medium text-gray-800">{profile.skills?.join(", ")}</span></div>}
                        {profile.coverNote && <div className="col-span-2"><span className="text-gray-500">Cover note: </span><span className="font-medium text-gray-800 italic">{profile.coverNote.slice(0, 100)}{profile.coverNote.length > 100 ? "…" : ""}</span></div>}
                      </div>
                      {!profile.experienceLevel && !profile.expectedSalary && !profile.location && (
                        <p className="text-xs text-gray-400 italic">No profile info added</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit checklist */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="font-semibold text-green-800 text-sm mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Ready to Submit
                </p>
                <ul className="space-y-1.5 text-xs text-green-700">
                  {requireResume && <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Resume selected: {selectedResume?.filename}</li>}
                  {requireQuestions && <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> {answeredCount}/{qs.length} screening questions answered</li>}
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Applying to: {job?.title} at {job?.companyId?.name || "this company"}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            {!isFirst && (
              <Button variant="outline" className="flex-1 h-11" onClick={prevStep}>
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
              </Button>
            )}
            {!isLast ? (
              <Button className="flex-1 h-11 bg-purple-600 hover:bg-purple-700 font-semibold" onClick={nextStep}>
                Continue <ChevronRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                className="flex-1 h-11 bg-green-600 hover:bg-green-700 font-semibold text-base"
                onClick={handleSubmit}
                disabled={submitting || (requireResume && !selectedResumeId)}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                {submitting ? "Submitting…" : "Submit Application"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Right: job summary ── */}
        <div>
          <div className="sticky top-20 bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">Applying to</h3>
            <div>
              <p className="font-bold text-gray-900">{job?.title}</p>
              {job?.companyId?.name && <p className="text-sm text-gray-600 mt-0.5">{job.companyId.name}</p>}
              <div className="flex flex-col gap-1.5 mt-3 text-xs text-gray-500">
                {job?.location && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
                {job?.employmentType && <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" />{job.employmentType}</span>}
                {job?.salary && <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" />{job.salary}</span>}
                {job?.remotePolicy && <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{job.remotePolicy}</span>}
              </div>
            </div>

            {allSkills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-1">
                  {allSkills.slice(0, 8).map((s, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                  {allSkills.length > 8 && <span className="text-xs text-gray-400">+{allSkills.length - 8}</span>}
                </div>
              </div>
            )}

            {/* Progress */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Step {currentIdx + 1} of {visibleSteps.length}
              </p>
              <div className="flex gap-1">
                {visibleSteps.map((s, i) => (
                  <div key={s.id} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= currentIdx ? "bg-purple-600" : "bg-gray-200"}`} />
                ))}
              </div>
            </div>

            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={`/dashboard/jobs/${jobId}`}><ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back to Job</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
