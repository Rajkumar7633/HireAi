"use client";
import type React from "react";
import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, UploadCloud, FileText, CheckCircle, Bot, Briefcase,
  X, ArrowRight, Sparkles, Target, TrendingUp, AlertCircle, RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── ATS Score Ring ───────────────────────────────────────────────────────────

function AtsRing({ score }: { score: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Work";
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={104} height={104} viewBox="0 0 104 104">
        <circle cx={52} cy={52} r={r} fill="none" stroke="#f1f5f9" strokeWidth={10} />
        <circle cx={52} cy={52} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 52 52)" />
        <text x="52" y="48" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{score}</text>
        <text x="52" y="64" textAnchor="middle" fontSize="10" fill="#94a3b8">/ 100</text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>{label}</span>
      <span className="text-xs text-slate-400">ATS Score</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResumeUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedResume, setUploadedResume] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const s = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + s[i];
  };

  const acceptFile = (file: File) => {
    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Unsupported format", description: "Please upload a PDF, DOC, or DOCX file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5 MB.", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
    setUploadSuccess(false);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) acceptFile(file);
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select a resume file.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("resume", selectedFile);
    try {
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setUploadSuccess(true);
        setUploadedResume(data.resume);
        toast({ title: "Resume uploaded!", description: "AI analysis complete." });
      } else if (response.status === 401) {
        toast({ title: "Login required", description: "Redirecting to login…", variant: "destructive" });
        setTimeout(() => router.push("/login"), 2000);
      } else {
        toast({ title: "Upload failed", description: data.message || "An error occurred.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", description: "Check your connection and try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setUploadSuccess(false); setSelectedFile(null); setUploadedResume(null); };

  // ── Success State ────────────────────────────────────────────────────────────
  if (uploadSuccess && uploadedResume) {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Resume Analyzed</h1>
            <p className="text-sm text-slate-500 mt-0.5">AI-powered insights are ready for you</p>
          </div>
          <button onClick={reset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm hover:border-violet-300 hover:text-violet-600 transition-colors">
            <RefreshCw className="h-4 w-4" /> Upload Another
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — score + analysis */}
          <div className="lg:col-span-2 space-y-5">

            {/* ATS Score Card */}
            {uploadedResume.atsScore != null && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-violet-600" />
                  </div>
                  <h2 className="font-semibold text-slate-900">ATS Score & Analysis</h2>
                </div>
                <div className="flex flex-col sm:flex-row gap-8 items-start">
                  <div className="flex-shrink-0">
                    <AtsRing score={uploadedResume.atsScore} />
                  </div>
                  <div className="flex-1 space-y-4">
                    {uploadedResume.analysis?.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Strengths</p>
                        <ul className="space-y-1.5">
                          {uploadedResume.analysis.strengths.slice(0, 3).map((s: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {uploadedResume.analysis?.improvements?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Improvements</p>
                        <ul className="space-y-1.5">
                          {uploadedResume.analysis.improvements.slice(0, 3).map((s: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Extracted skills */}
            {uploadedResume.extractedData?.skills?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                  </div>
                  <h2 className="font-semibold text-slate-900">Extracted Skills</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uploadedResume.extractedData.skills.map((skill: string, i: number) => (
                    <span key={i}
                      className="px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-100 text-violet-700 text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* File details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-slate-500" />
                </div>
                <h2 className="font-semibold text-slate-900">File Details</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Filename", value: uploadedResume.filename },
                  { label: "Size", value: formatSize(uploadedResume.size) },
                  { label: "Uploaded", value: new Date(uploadedResume.uploadDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                  { label: "Status", value: "Analyzed", highlight: true },
                ].map((d) => (
                  <div key={d.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{d.label}</p>
                    <p className={`text-sm font-semibold mt-0.5 truncate ${d.highlight ? "text-emerald-600" : "text-slate-800"}`}>{d.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — next steps */}
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-900 text-base">What's Next?</h2>
            {[
              {
                icon: <Bot className="h-5 w-5 text-violet-600" />,
                bg: "bg-violet-50", border: "border-violet-100",
                title: "AI Resume Chat",
                desc: "Get personalized feedback and optimization tips.",
                href: "/dashboard/job-seeker/resume-chatbot",
                cta: "Start AI Chat",
                primary: true,
              },
              {
                icon: <FileText className="h-5 w-5 text-blue-600" />,
                bg: "bg-blue-50", border: "border-blue-100",
                title: "Resume Builder",
                desc: "Create a FAANG-optimized resume with a higher ATS score.",
                href: "/dashboard/job-seeker/resume-builder",
                cta: "Build Resume",
                primary: false,
              },
              {
                icon: <Briefcase className="h-5 w-5 text-emerald-600" />,
                bg: "bg-emerald-50", border: "border-emerald-100",
                title: "Job Matching",
                desc: "Find roles that match your skills and experience.",
                href: "/dashboard/jobs",
                cta: "Browse Jobs",
                primary: false,
              },
              {
                icon: <Target className="h-5 w-5 text-amber-600" />,
                bg: "bg-amber-50", border: "border-amber-100",
                title: "Skill Gap Analyzer",
                desc: "See which skills to learn for your target role.",
                href: "/dashboard/job-seeker/skill-gap",
                cta: "Analyze Gaps",
                primary: false,
              },
            ].map((item) => (
              <Link key={item.title} href={item.href}
                className="block bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-violet-200 hover:shadow-md transition-all group">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${item.bg} border ${item.border} flex items-center justify-center shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-4">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-violet-500 transition-colors shrink-0 mt-0.5" />
                </div>
              </Link>
            ))}

            <Link href="/dashboard/job-seeker"
              className="block text-center px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-violet-300 hover:text-violet-600 transition-colors">
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Upload State ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Resume</h1>
        <p className="text-sm text-slate-500 mt-0.5">Get AI-powered analysis, ATS scoring, and job matching</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload form */}
        <div className="lg:col-span-2 space-y-5">

          {/* Drop zone */}
          <form onSubmit={handleUpload}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              className={[
                "bg-white rounded-2xl border-2 border-dashed transition-all cursor-pointer p-10 flex flex-col items-center justify-center gap-4 text-center",
                dragging ? "border-violet-500 bg-violet-50/40 scale-[1.01]" : "border-slate-200 hover:border-violet-300 hover:bg-violet-50/20",
                selectedFile ? "cursor-default" : "",
              ].join(" ")}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) acceptFile(e.target.files[0]); }}
              />

              {!selectedFile ? (
                <>
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragging ? "bg-violet-100" : "bg-slate-100"}`}>
                    <UploadCloud className={`h-8 w-8 transition-colors ${dragging ? "text-violet-600" : "text-slate-400"}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-base">
                      {dragging ? "Drop your resume here" : "Drag & drop your resume"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">or <span className="text-violet-600 font-medium underline underline-offset-2">browse files</span></p>
                  </div>
                  <p className="text-xs text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                    PDF, DOC, DOCX — max 5 MB
                  </p>
                </>
              ) : (
                <div className="w-full space-y-4">
                  {/* File card */}
                  <div className="flex items-center gap-4 bg-violet-50 border border-violet-100 rounded-2xl px-5 py-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-violet-200 flex items-center justify-center shrink-0 shadow-sm">
                      <FileText className="h-6 w-6 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="font-semibold text-slate-800 text-sm truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{formatSize(selectedFile.size)}</p>
                    </div>
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                      className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Change file link */}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-violet-600 hover:text-violet-800 underline underline-offset-2">
                    Choose a different file
                  </button>
                </div>
              )}
            </div>

            {/* Upload button */}
            <button
              type="submit"
              disabled={loading || !selectedFile}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-violet-200"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing resume…</>
                : <><UploadCloud className="h-4 w-4" /> Upload & Analyze</>
              }
            </button>
          </form>

          {/* Processing steps — shown while loading */}
          {loading && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Processing your resume…</p>
              {[
                { label: "Parsing document structure", done: true },
                { label: "Running ATS compatibility check", done: true },
                { label: "Extracting skills & experience", done: false },
                { label: "Generating AI recommendations", done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${step.done ? "bg-emerald-100" : "bg-slate-100"}`}>
                    {step.done
                      ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                      : <Loader2 className="h-3 w-3 text-slate-400 animate-spin" />
                    }
                  </div>
                  <span className={`text-sm ${step.done ? "text-slate-700" : "text-slate-400"}`}>{step.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar — what happens after */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 mb-4">What happens after upload?</h2>
            <div className="space-y-4">
              {[
                {
                  icon: <Bot className="h-4 w-4 text-violet-600" />,
                  bg: "bg-violet-50",
                  title: "AI Analysis",
                  desc: "Personalized feedback and optimization suggestions tailored to your resume.",
                },
                {
                  icon: <TrendingUp className="h-4 w-4 text-blue-600" />,
                  bg: "bg-blue-50",
                  title: "ATS Scoring",
                  desc: "See how well your resume passes applicant tracking systems.",
                },
                {
                  icon: <Sparkles className="h-4 w-4 text-amber-600" />,
                  bg: "bg-amber-50",
                  title: "Skill Extraction",
                  desc: "Automatically detect your skills and experience level.",
                },
                {
                  icon: <Briefcase className="h-4 w-4 text-emerald-600" />,
                  bg: "bg-emerald-50",
                  title: "Job Matching",
                  desc: "Instantly find jobs that match your analyzed profile.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-4">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 p-5">
            <p className="text-sm font-semibold text-violet-800 mb-3">Tips for a better score</p>
            <ul className="space-y-2">
              {[
                "Use standard section headings (Experience, Skills, Education)",
                "Include keywords from job descriptions",
                "Avoid images, tables, or unusual fonts",
                "Save as PDF for best compatibility",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-violet-700">
                  <CheckCircle className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
