"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Skill = {
  name: string;
  level?: "beginner" | "intermediate" | "advanced";
  verified?: boolean;
  verifiedScore?: number;
  verifiedAt?: string;
};

type AssessmentQuestion = {
  index: number;
  question: string;
  options: string[];
};

type AssessmentHistoryItem = {
  skillName: string;
  score?: number;
  passed?: boolean;
  status: string;
  attemptNumber?: number;
  createdAt?: string;
  completedAt?: string;
};

export default function JobSeekerSkillsPage() {
  const { session, refresh: refreshSession } = useSession() as any;
  const { toast } = useToast();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const [currentSkill, setCurrentSkill] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadSkills = async () => {
      // Prefer skills from auth session if present
      const sessionSkills = (((session as any)?.skills || []) as Skill[]) || [];
      if (sessionSkills.length > 0) {
        setSkills(sessionSkills);
        return;
      }

      // Fallback to job-seeker profile skills
      try {
        const res = await fetch("/api/job-seeker/profile", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const profileSkills = (Array.isArray(data.skills) ? data.skills : []).map((name: string) => ({
          name,
        })) as Skill[];
        setSkills(profileSkills);
      } catch {
        // ignore; page still works without profile skills
      }
    };

    loadSkills();
  }, [session]);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoadingHistory(true);
        const res = await fetch("/api/skills/history", { cache: "no-store" });
        const data = await res.json().catch(() => ({ assessments: [] }));
        if (res.ok && Array.isArray(data.assessments)) {
          setHistory(data.assessments);
        }
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  const startAssessment = async (skillName: string) => {
    try {
      const res = await fetch("/api/skills/start-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName }),
      });
      const data = await res.json();

      if (res.status === 429) {
        toast({
          title: "Please wait before retrying",
          description:
            data?.msg ||
            `You can retry this skill in ${data?.cooldownHoursRemaining ?? "some"} hour(s).`,
          variant: "destructive",
        });
        return;
      }

      if (!res.ok) {
        toast({
          title: "Could not start assessment",
          description: data?.msg || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setCurrentSkill(data.skillName);
      setAssessmentId(data.assessmentId);
      setQuestions(data.questions || []);
      setAnswers(new Array((data.questions || []).length).fill(-1));
      setAssessmentOpen(true);
    } catch (e: any) {
      toast({
        title: "Error starting assessment",
        description: String(e?.message || e),
        variant: "destructive",
      });
    }
  };

  const submitAssessment = async () => {
    if (!assessmentId) return;
    if (answers.some((a) => a < 0)) {
      toast({
        title: "Incomplete",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/skills/submit-assessment/${assessmentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Submit failed",
          description: data?.msg || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data.passed) {
        toast({
          title: "Skill verified!",
          description: `You scored ${data.score}%.`,
        });
        await refreshSession?.();
      } else {
        toast({
          title: "Assessment failed",
          description: `You scored ${data.score}%. You need at least 80%. You can retry after 24 hours.`,
          variant: "destructive",
        });
      }

      const s = ((session as any)?.skills || []) as Skill[];
      setSkills(s);
      const hRes = await fetch("/api/skills/history", { cache: "no-store" });
      const h = await hRes.json().catch(() => ({ assessments: [] }));
      if (Array.isArray(h.assessments)) setHistory(h.assessments);

      setAssessmentOpen(false);
      setAssessmentId(null);
      setCurrentSkill(null);
      setQuestions([]);
      setAnswers([]);
    } catch (e: any) {
      toast({
        title: "Error submitting assessment",
        description: String(e?.message || e),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Your Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No skills added yet. Add skills in your profile, then verify them here.
            </p>
          ) : (
            skills.map((skill) => (
              <div
                key={skill.name}
                className="flex items-center justify-between border rounded-md px-3 py-2"
              >
                <div>
                  <div className="font-medium">{skill.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Level: {skill.level || "intermediate"}
                  </div>
                  {skill.verified && (
                    <div className="text-xs text-green-700 mt-1">
                      Verified
                      {typeof skill.verifiedScore === "number"
                        ? ` (${skill.verifiedScore}%)`
                        : ""}{" "}
                      {skill.verifiedAt
                        ? `on ${new Date(skill.verifiedAt).toLocaleDateString()}`
                        : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={skill.verified ? "default" : "outline"}>
                    {skill.verified ? "Verified" : "Not verified"}
                  </Badge>
                  <Button
                    size="sm"
                    variant={skill.verified ? "outline" : "default"}
                    onClick={() => startAssessment(skill.name)}
                  >
                    {skill.verified ? "Re-take test" : "Verify skill"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assessment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-4">Skill</th>
                    <th className="py-2 pr-4">Attempt</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Result</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((a, idx) => (
                    <tr key={`${a.skillName}-${idx}`} className="border-t">
                      <td className="py-2 pr-4">{a.skillName}</td>
                      <td className="py-2 pr-4">{a.attemptNumber ?? "-"}</td>
                      <td className="py-2 pr-4">
                        {typeof a.score === "number" ? `${a.score}%` : "-"}
                      </td>
                      <td className="py-2 pr-4">
                        {a.passed ? (
                          <Badge className="bg-green-100 text-green-800">Passed</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Failed</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : "-"}
                      </td>
                      <td className="py-2 pr-4">
                        {a.completedAt ? new Date(a.completedAt).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={assessmentOpen}
        onOpenChange={(open) => {
          if (!submitting) setAssessmentOpen(open);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentSkill ? `Skill Assessment: ${currentSkill}` : "Skill Assessment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <div key={q.index} className="border rounded-md p-3 space-y-2">
                <div className="font-medium">
                  Q{qIndex + 1}. {q.question}
                </div>
                <RadioGroup
                  value={answers[qIndex] >= 0 ? String(answers[qIndex]) : ""}
                  onValueChange={(val) => {
                    const idx = Number(val);
                    setAnswers((prev) => {
                      const copy = [...prev];
                      copy[qIndex] = idx;
                      return copy;
                    });
                  }}
                >
                  {q.options.map((opt, optIndex) => (
                    <label key={optIndex} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={String(optIndex)} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            ))}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!submitting) setAssessmentOpen(false);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={submitAssessment} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Answers"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
