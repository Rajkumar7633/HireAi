"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Star, Loader2, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import type { NextStep } from "@/models/InterviewFeedback";

const FEEDBACK_TAGS = [
  "Problem solving",
  "Communication",
  "Technical depth",
  "Coding",
  "Leadership",
  "Culture fit",
  "Domain knowledge",
  "Time management",
] as const;

type RecruiterForm = {
  rating: number;
  technicalScore: number;
  communicationScore: number;
  codingScore: number;
  cultureFitScore: number;
  strengths: string;
  concerns: string;
  privateNotes: string;
  summaryForPipeline: string;
  tags: string[];
  nextStep: NextStep;
};

type CandidateForm = {
  rating: number;
  experience: string;
  issues: string;
  wouldRecommend: boolean;
};

export type InterviewFeedbackWizardProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isHost: boolean;
  isSubmitting?: boolean;
  onSkip: () => void;
  onSubmit: (data: {
    recruiterPayload?: Record<string, unknown>;
    candidatePayload?: Record<string, unknown>;
    nextStep?: NextStep;
  }) => Promise<void>;
};

function StarRow({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div>
      <Label className="text-gray-300 text-sm">{label}</Label>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5 rounded hover:scale-110 transition-transform"
            aria-label={`${n} stars`}
          >
            <Star
              className={`h-6 w-6 ${n <= value ? "text-amber-400 fill-amber-400" : "text-gray-600"}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span className="text-violet-300 font-medium">{value}/10</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-violet-500"
      />
    </div>
  );
}

export function InterviewFeedbackWizard({
  open,
  onOpenChange,
  isHost,
  isSubmitting = false,
  onSkip,
  onSubmit,
}: InterviewFeedbackWizardProps) {
  const [recruiter, setRecruiter] = useState<RecruiterForm>({
    rating: 0,
    technicalScore: 7,
    communicationScore: 7,
    codingScore: 7,
    cultureFitScore: 7,
    strengths: "",
    concerns: "",
    privateNotes: "",
    summaryForPipeline: "",
    tags: [],
    nextStep: "undecided",
  });

  const [candidate, setCandidate] = useState<CandidateForm>({
    rating: 0,
    experience: "",
    issues: "",
    wouldRecommend: true,
  });

  const overallScore = useMemo(() => {
    const scores = [
      recruiter.technicalScore,
      recruiter.communicationScore,
      recruiter.codingScore,
      recruiter.cultureFitScore,
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [recruiter]);

  const pipelinePreview = useMemo(() => {
    const parts = [
      recruiter.rating ? `★ ${recruiter.rating}/5` : null,
      `Overall ${overallScore}/10`,
      recruiter.strengths.trim() ? `+ ${recruiter.strengths.slice(0, 80)}` : null,
      recruiter.nextStep !== "undecided" ? `→ ${recruiter.nextStep.replace("_", " ")}` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  }, [recruiter, overallScore]);

  const toggleTag = (tag: string) => {
    setRecruiter((p) => ({
      ...p,
      tags: p.tags.includes(tag) ? p.tags.filter((t) => t !== tag) : [...p.tags, tag],
    }));
  };

  const handleSubmit = async () => {
    if (isHost) {
      await onSubmit({
        recruiterPayload: {
          rating: recruiter.rating || undefined,
          strengths: recruiter.strengths,
          concerns: recruiter.concerns,
          technicalScore: recruiter.technicalScore,
          communicationScore: recruiter.communicationScore,
          codingScore: recruiter.codingScore,
          cultureFitScore: recruiter.cultureFitScore,
          overallScore,
          privateNotes: recruiter.privateNotes,
          summaryForPipeline: recruiter.summaryForPipeline || pipelinePreview,
          tags: recruiter.tags,
        },
        nextStep: recruiter.nextStep,
      });
    } else {
      await onSubmit({
        candidatePayload: {
          rating: candidate.rating || undefined,
          experience: candidate.experience,
          issues: candidate.issues,
          wouldRecommend: candidate.wouldRecommend,
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-950 text-white border border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            {isHost ? "Interview feedback & pipeline update" : "Share your interview experience"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {isHost
              ? "Scores and notes sync to the job pipeline and candidate profile on this role."
              : "Your feedback helps improve the interview process."}
          </DialogDescription>
        </DialogHeader>

        {isHost ? (
          <div className="space-y-4 py-2">
            <StarRow
              label="Overall rating"
              value={recruiter.rating}
              onChange={(n) => setRecruiter((p) => ({ ...p, rating: n }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <ScoreSlider
                label="Technical"
                value={recruiter.technicalScore}
                onChange={(n) => setRecruiter((p) => ({ ...p, technicalScore: n }))}
              />
              <ScoreSlider
                label="Communication"
                value={recruiter.communicationScore}
                onChange={(n) => setRecruiter((p) => ({ ...p, communicationScore: n }))}
              />
              <ScoreSlider
                label="Coding / live exercise"
                value={recruiter.codingScore}
                onChange={(n) => setRecruiter((p) => ({ ...p, codingScore: n }))}
              />
              <ScoreSlider
                label="Culture fit"
                value={recruiter.cultureFitScore}
                onChange={(n) => setRecruiter((p) => ({ ...p, cultureFitScore: n }))}
              />
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Strengths</Label>
              <Textarea
                value={recruiter.strengths}
                onChange={(e) => setRecruiter((p) => ({ ...p, strengths: e.target.value }))}
                className="mt-1 bg-gray-900 border-gray-600 text-white"
                rows={2}
                placeholder="What went well?"
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Concerns / gaps</Label>
              <Textarea
                value={recruiter.concerns}
                onChange={(e) => setRecruiter((p) => ({ ...p, concerns: e.target.value }))}
                className="mt-1 bg-gray-900 border-gray-600 text-white"
                rows={2}
                placeholder="Areas to improve or red flags"
              />
            </div>

            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Skill tags</Label>
              <div className="flex flex-wrap gap-1.5">
                {FEEDBACK_TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`cursor-pointer text-xs ${
                      recruiter.tags.includes(tag)
                        ? "bg-violet-600 border-violet-500 text-white"
                        : "border-gray-600 text-gray-300 hover:bg-gray-800"
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Pipeline summary (shown on job candidates)</Label>
              <Textarea
                value={recruiter.summaryForPipeline}
                onChange={(e) => setRecruiter((p) => ({ ...p, summaryForPipeline: e.target.value }))}
                className="mt-1 bg-gray-900 border-gray-600 text-white text-sm"
                rows={2}
                placeholder="Auto-filled from scores — edit if needed"
              />
              {pipelinePreview && (
                <p className="text-[11px] text-gray-500 mt-1">Preview: {pipelinePreview}</p>
              )}
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Private notes (recruiter only)</Label>
              <Textarea
                value={recruiter.privateNotes}
                onChange={(e) => setRecruiter((p) => ({ ...p, privateNotes: e.target.value }))}
                className="mt-1 bg-gray-900 border-gray-600 text-white"
                rows={2}
                placeholder="Not shared with candidate"
              />
            </div>

            <div>
              <Label className="text-gray-300 text-sm">Pipeline decision</Label>
              <select
                value={recruiter.nextStep}
                onChange={(e) =>
                  setRecruiter((p) => ({ ...p, nextStep: e.target.value as NextStep }))
                }
                className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm"
              >
                <option value="undecided">Undecided — keep in review</option>
                <option value="advance">Advance — shortlist / next round</option>
                <option value="follow_up">Follow-up — another interview</option>
                <option value="reject">Reject — close application</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <StarRow
              label="How was the interview?"
              value={candidate.rating}
              onChange={(n) => setCandidate((p) => ({ ...p, rating: n }))}
            />
            <div>
              <Label className="text-gray-300 text-sm">Experience</Label>
              <Textarea
                value={candidate.experience}
                onChange={(e) => setCandidate((p) => ({ ...p, experience: e.target.value }))}
                className="mt-1 bg-gray-900 border-gray-600 text-white"
                rows={3}
                placeholder="How did the interview go?"
              />
            </div>
            <div>
              <Label className="text-gray-300 text-sm">Technical issues</Label>
              <Textarea
                value={candidate.issues}
                onChange={(e) => setCandidate((p) => ({ ...p, issues: e.target.value }))}
                className="mt-1 bg-gray-900 border-gray-600 text-white"
                rows={2}
                placeholder="Audio, video, or platform issues?"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={
                  candidate.wouldRecommend
                    ? "bg-emerald-700 border-emerald-600 text-white"
                    : "border-gray-600 text-gray-300"
                }
                onClick={() => setCandidate((p) => ({ ...p, wouldRecommend: true }))}
              >
                <ThumbsUp className="h-4 w-4 mr-1" /> Would recommend
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={
                  !candidate.wouldRecommend
                    ? "bg-red-700 border-red-600 text-white"
                    : "border-gray-600 text-gray-300"
                }
                onClick={() => setCandidate((p) => ({ ...p, wouldRecommend: false }))}
              >
                <ThumbsDown className="h-4 w-4 mr-1" /> Not recommend
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between gap-2">
          <Button
            variant="outline"
            className="bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700"
            onClick={onSkip}
            disabled={isSubmitting}
          >
            Skip & end
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-violet-600 hover:bg-violet-500"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Submit feedback & end"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
