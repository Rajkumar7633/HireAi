"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface MatchCandidate {
  userId: string;
  name: string;
  email?: string;
  resumeFile?: string | null;
  aiMatchScore: number;
  atsScore?: number;
  skillsMatched?: string[];
}

export default function RecruiterAIMatchingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MatchCandidate[]>([]);
  const [jdText, setJdText] = useState("");
  const [jdSkills, setJdSkills] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [limit, setLimit] = useState(50);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [minScore, setMinScore] = useState<number>(0);
  const [minOverlap, setMinOverlap] = useState<number>(1);
  const [offset, setOffset] = useState<number>(0);
  const [jobs, setJobs] = useState<{ _id: string; title: string }[]>([]);
  const [tests, setTests] = useState<{ _id: string; title: string }[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [testId, setTestId] = useState<string>("");
  const [templates, setTemplates] = useState<{ _id: string; name: string; subject: string }[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [topN, setTopN] = useState<number>(10);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  // Fetch AI status and lists once
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const s = await fetch("/api/ai/status", { cache: "no-store" });
        if (s.ok) {
          const j = await s.json();
          if (mounted) {
            setAiEnabled(j.enabled);
            setAiModel(j.model);
          }
        }
        const jobsRes = await fetch("/api/job-descriptions/mine", { cache: "no-store" });
        if (jobsRes.ok) {
          const j = await jobsRes.json();
          if (mounted) setJobs(j.jobs || []);
        }
        const testsRes = await fetch("/api/tests/my-tests", { cache: "no-store" });
        if (testsRes.ok) {
          const t = await testsRes.json();
          if (mounted) setTests(t || []);
        }
        const tplRes = await fetch("/api/email-templates", { cache: "no-store" });
        if (tplRes.ok) {
          const tpls = await tplRes.json();
          if (mounted) setTemplates((tpls.templates || []).map((t: any) => ({ _id: t._id, name: t.name, subject: t.subject })));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const parsedSkills = useMemo(() => jdSkills.split(",").map((s) => s.trim()).filter(Boolean), [jdSkills]);

  const runMatching = async () => {
    if (!jdText.trim()) {
      toast({ title: "Job description required", description: "Paste or type a job description.", variant: "destructive" });
      return;
    }
    try {
      setRunning(true);
      setResults([]);
      setCount(null);
      const resp = await fetch("/api/ai/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jdText, keySkills: parsedSkills, limit, offset, minScore, minOverlap }),
      });
      if (!resp.ok) throw new Error("Matching failed");
      const data = await resp.json();
      setResults((data.candidates || []) as MatchCandidate[]);
      setCount(data.total ?? (data.candidates?.length ?? 0));
      setOffset(data.offset ?? 0);
      setLimit(data.limit ?? limit);
      // reset selections
      setSelected({});
    } catch (e: any) {
      toast({ title: "Matching failed", description: e.message || "Please try again." , variant: "destructive"});
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Smart Candidate Matching (AI)</CardTitle>
          <CardDescription>
            Paste a job description and optionally list key skills (comma-separated). We’ll rank your talent pool automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 text-xs">
            {aiEnabled === null ? null : (
              <Badge variant={aiEnabled ? "default" : "secondary"}>
                AI: {aiEnabled ? (aiModel || "model") : "fallback"}
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="limit" className="text-muted-foreground">Limit</label>
              <Input
                id="limit"
                type="number"
                min={1}
                max={100}
                className="h-8 w-20"
                value={limit}
                onChange={(e) => {
                  const v = Number(e.target.value || 0);
                  setLimit(Math.max(1, Math.min(100, isNaN(v) ? 50 : v)));
                }}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Description</label>
              <Textarea value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste the job description here..." className="min-h-[160px]" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Key Skills (optional, comma-separated)</label>
              <Input value={jdSkills} onChange={(e) => setJdSkills(e.target.value)} placeholder="e.g., React, TypeScript, Node.js" />
              <div className="text-xs text-muted-foreground">Parsed: {parsedSkills.join(", ") || "(none)"}</div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="minScore">Minimum AI Score (%)</label>
              <Input id="minScore" type="number" min={0} max={100} value={minScore}
                onChange={(e) => setMinScore(Math.max(0, Math.min(100, Number(e.target.value || 0))))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="minOverlap">Minimum Skill Overlap</label>
              <Input id="minOverlap" type="number" min={0} max={20} value={minOverlap}
                onChange={(e) => setMinOverlap(Math.max(0, Math.min(20, Number(e.target.value || 0))))} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="offset">Offset (pagination)</label>
              <Input id="offset" type="number" min={0} value={offset}
                onChange={(e) => setOffset(Math.max(0, Number(e.target.value || 0)))} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={runMatching} disabled={running || loading}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Run Matching
            </Button>
            <div className="text-sm text-muted-foreground">{count != null ? `Results: ${count}` : null}</div>
            {count != null && count > 0 && (
              <div className="ml-auto flex items-center gap-2 text-sm">
                <Button variant="outline" size="sm" disabled={running || offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>Prev</Button>
                <Button variant="outline" size="sm" disabled={running || offset + limit >= count} onClick={() => setOffset(offset + limit)}>Next</Button>
              </div>
            )}
          </div>
          {/* Bulk actions */}
          <Separator className="my-2" />
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => {
                const map: Record<string, boolean> = {};
                results.forEach((r) => { map[r.userId] = true; });
                setSelected(map);
              }}>Select All</Button>
              <Button variant="outline" size="sm" onClick={() => setSelected({})}>Clear</Button>
              <div className="flex items-center gap-2">
                <label className="text-sm">Top N</label>
                <Input type="number" className="h-8 w-20" min={1} max={results.length || 1} value={topN} onChange={(e) => setTopN(Math.max(1, Math.min(results.length || 1, Number(e.target.value || 1))))} />
                <Button variant="outline" size="sm" onClick={() => {
                  const map: Record<string, boolean> = {};
                  results.slice(0, topN).forEach((r) => { map[r.userId] = true; });
                  setSelected(map);
                }}>Select Top N</Button>
              </div>
            </div>
            <div className="flex items-center gap-3 justify-end flex-wrap">
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger className="w-60"><SelectValue placeholder="Select Job" /></SelectTrigger>
                <SelectContent>
                  {jobs.map((j) => (<SelectItem key={j._id} value={j._id}>{j.title}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="w-60"><SelectValue placeholder="Select Email Template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (<SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>))}
                </SelectContent>
              </Select>
              <Select value={testId} onValueChange={setTestId}>
                <SelectTrigger className="w-60"><SelectValue placeholder="Select Test" /></SelectTrigger>
                <SelectContent>
                  {tests.map((t) => (<SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>))}
                </SelectContent>
              </Select>
              <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={Object.keys(selected).length === 0 && results.length === 0}>Compose Email</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Compose Email</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Subject</label>
                      <Input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Subject" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Message</label>
                      <Textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} placeholder="Write your message... You can use {{candidateName}}, {{jobTitle}}, {{companyName}}" className="min-h-[160px]" />
                    </div>
                    <div className="text-xs text-muted-foreground">Variables supported: {"{{candidateName}}"}, {"{{jobTitle}}"}, {"{{companyName}}"}</div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
                    <Button onClick={async () => {
                      try {
                        const selectedIds = Object.keys(selected).length > 0 ? results.filter(r => selected[r.userId]).map(r => ({ userId: r.userId })) : results.slice(0, topN).map(r => ({ userId: r.userId }));
                        if (selectedIds.length === 0) return;
                        const payload = { subject: composeSubject, html: composeBody, candidates: selectedIds, variables: { jobTitle: (jobs.find(j => j._id === jobId)?.title), companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || undefined } } as any;
                        const resp = await fetch("/api/email/send-bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                        if (!resp.ok) throw new Error("email failed");
                        const j = await resp.json();
                        toast({ title: "Emails sent", description: `Sent ${j.sent}/${j.total}` });
                        setComposeOpen(false);
                      } catch (e: any) {
                        toast({ title: "Email failed", description: e.message || "Please try again", variant: "destructive" });
                      }
                    }}>Send</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="ghost" disabled={!templateId || Object.keys(selected).length === 0} onClick={async () => {
                try {
                  const payload = {
                    templateId,
                    candidates: results.filter(r => selected[r.userId]).map(r => ({ userId: r.userId })),
                    variables: { jobTitle: (jobs.find(j => j._id === jobId)?.title) },
                  };
                  const resp = await fetch("/api/email/send-bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  if (!resp.ok) throw new Error("email failed");
                  const j = await resp.json();
                  toast({ title: "Emails sent", description: `Sent ${j.sent}/${j.total}` });
                } catch (e: any) {
                  toast({ title: "Email failed", description: e.message || "Please try again", variant: "destructive" });
                }
              }}>Email Selected</Button>
              <Button size="sm" disabled={!jobId || Object.keys(selected).length === 0} onClick={async () => {
                try {
                  const payload = { jobId, candidates: results.filter(r => selected[r.userId]).map(r => ({ userId: r.userId, aiMatchScore: r.aiMatchScore, atsScore: r.atsScore, skillsMatched: r.skillsMatched })) };
                  const resp = await fetch("/api/ai/matching/shortlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  if (!resp.ok) throw new Error("shortlist failed");
                  const j = await resp.json();
                  toast({ title: "Shortlisted", description: `Updated ${j.updated}, Created ${j.created}` });
                  if (jobId) {
                    setTimeout(() => { window.location.assign(`/dashboard/recruiter/job-descriptions/${jobId}/candidates`); }, 600);
                  }
                } catch (e: any) {
                  toast({ title: "Shortlist failed", description: e.message || "Please try again", variant: "destructive" });
                }
              }}>Shortlist Selected</Button>
              <Button size="sm" variant="secondary" disabled={!jobId || !testId || Object.keys(selected).length === 0} onClick={async () => {
                try {
                  const payload = { jobId, testId, candidates: results.filter(r => selected[r.userId]).map(r => ({ userId: r.userId })) };
                  const resp = await fetch("/api/tests/assign-bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  if (!resp.ok) throw new Error("assign failed");
                  const j = await resp.json();
                  toast({ title: "Tests assigned", description: `Updated ${j.updated}, Created ${j.created}` });
                  if (jobId) {
                    setTimeout(() => { window.location.assign(`/dashboard/recruiter/job-descriptions/${jobId}/candidates`); }, 600);
                  }
                } catch (e: any) {
                  toast({ title: "Assign failed", description: e.message || "Please try again", variant: "destructive" });
                }
              }}>Assign Test to Selected</Button>
              <Button size="sm" variant="outline" disabled={!jobId} onClick={async () => {
                try {
                  const top = results.slice(0, topN);
                  if (top.length === 0) return;
                  const payload = { jobId, candidates: top.map(r => ({ userId: r.userId, aiMatchScore: r.aiMatchScore, atsScore: r.atsScore, skillsMatched: r.skillsMatched })) };
                  const resp = await fetch("/api/ai/matching/shortlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  if (!resp.ok) throw new Error("shortlist failed");
                  const j = await resp.json();
                  toast({ title: "Shortlisted Top N", description: `Updated ${j.updated}, Created ${j.created}` });
                  if (jobId) {
                    setTimeout(() => { window.location.assign(`/dashboard/recruiter/job-descriptions/${jobId}/candidates`); }, 600);
                  }
                } catch (e: any) {
                  toast({ title: "Shortlist failed", description: e.message || "Please try again", variant: "destructive" });
                }
              }}>Shortlist Top N</Button>
              <Button size="sm" variant="ghost" disabled={!templateId || results.length === 0} onClick={async () => {
                try {
                  const top = results.slice(0, topN);
                  if (top.length === 0) return;
                  const payload = { templateId, candidates: top.map(r => ({ userId: r.userId })), variables: { jobTitle: (jobs.find(j => j._id === jobId)?.title) } };
                  const resp = await fetch("/api/email/send-bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  if (!resp.ok) throw new Error("email failed");
                  const j = await resp.json();
                  toast({ title: "Emailed Top N", description: `Sent ${j.sent}/${j.total}` });
                } catch (e: any) {
                  toast({ title: "Email failed", description: e.message || "Please try again", variant: "destructive" });
                }
              }}>Email Top N</Button>
              <Button size="sm" variant="outline" disabled={!jobId || !testId} onClick={async () => {
                try {
                  const top = results.slice(0, topN);
                  if (top.length === 0) return;
                  const payload = { jobId, testId, candidates: top.map(r => ({ userId: r.userId })) };
                  const resp = await fetch("/api/tests/assign-bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
                  if (!resp.ok) throw new Error("assign failed");
                  const j = await resp.json();
                  toast({ title: "Assigned Tests to Top N", description: `Updated ${j.updated}, Created ${j.created}` });
                  if (jobId) {
                    setTimeout(() => { window.location.assign(`/dashboard/recruiter/job-descriptions/${jobId}/candidates`); }, 600);
                  }
                } catch (e: any) {
                  toast({ title: "Assign failed", description: e.message || "Please try again", variant: "destructive" });
                }
              }}>Assign Test to Top N</Button>
            </div>
          </div>
          {running && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Matching in progress...
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            Sorted by AI match score. Higher is better.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {running && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Loader2 className="h-4 w-4 animate-spin" /> Matching in progress...
            </div>
          )}
          {results.length === 0 ? (
            <div className="text-sm text-muted-foreground">No results yet. Enter a job description and click Run Matching.</div>
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <div key={r.userId} className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={!!selected[r.userId]} onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [r.userId]: !!v }))} />
                      <div className="font-medium">{r.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Candidate ID: {r.userId}{r.email ? ` • ${r.email}` : ""}{r.resumeFile ? ` • ${r.resumeFile}` : ""}</div>
                    {r.skillsMatched && r.skillsMatched.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium">Matched skills:</span> {r.skillsMatched.slice(0, 6).join(", ")}
                      </div>
                    )}
                    {(r as any).snippet && (
                      <div className="mt-2 text-xs text-muted-foreground line-clamp-3">
                        {(r as any).snippet}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={r.aiMatchScore >= 70 ? "bg-green-600" : r.aiMatchScore >= 50 ? "bg-yellow-600" : "bg-gray-600"}>{r.aiMatchScore}%</Badge>
                    {typeof r.atsScore === "number" && (
                      <Badge variant="outline">ATS: {r.atsScore}%</Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={() => window.location.assign(`/dashboard/recruiter/candidates/${r.userId}`)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.location.assign(`/dashboard/messages?userId=${r.userId}`)}>
                      <MessageSquare className="h-4 w-4 mr-1" /> Message
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
