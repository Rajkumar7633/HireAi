/**
 * Normalizes ATS analysis payloads from upload, re-score API, or persisted profile
 * into one shape the job-seeker profile UI can render.
 */

export type NormalizedAtsSection = {
  score: number;
  feedback?: string;
};

export type NormalizedAtsAnalysis = {
  atsScore: number;
  matchScore: number;
  strengths: string[];
  improvements: string[];
  sections: {
    contact: NormalizedAtsSection;
    skills: NormalizedAtsSection;
    experience: NormalizedAtsSection;
    education: NormalizedAtsSection;
    summary?: NormalizedAtsSection;
  };
  formatting: { score: number; issues?: string[] };
  keywordMatches?: Array<{ keyword: string; found: boolean; frequency?: number }>;
  recommendations?: string[];
  extractedSkills?: string[];
  wordCount?: number;
  aiEnhanced?: boolean;
  scannedPdf?: boolean;
};

export function clampAtsScore(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function scalePart(value: unknown, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || max <= 0) return fallback;
  return clampAtsScore((n / max) * 100, fallback);
}

export function normalizeAtsAnalysis(
  raw: Record<string, unknown> | null | undefined,
  scoreOverride?: unknown,
): NormalizedAtsAnalysis {
  const breakdown = (raw?.breakdown as Record<string, number>) || {};
  const sections = (raw?.sections as Record<string, NormalizedAtsSection>) || {};

  const atsScore = clampAtsScore(raw?.atsScore ?? scoreOverride ?? raw?.score, 0);

  const contact = clampAtsScore(
    sections.contact?.score ?? (scalePart(breakdown["Contact Info"], 15, 0) || (atsScore > 0 ? 60 : 40)),
    40,
  );

  const skills = clampAtsScore(
    sections.skills?.score ?? (scalePart(breakdown["Technical Keywords"], 15, 0) || atsScore),
    atsScore || 50,
  );

  const experience = clampAtsScore(
    sections.experience?.score ??
      (scalePart(
        (Number(breakdown["Action Verbs"]) || 0) + (Number(breakdown["Quantified Achievements"]) || 0),
        35,
        0,
      ) ||
        Math.max(55, atsScore - 5)),
    Math.max(55, atsScore - 5),
  );

  const education = clampAtsScore(
    sections.education?.score ?? (scalePart(breakdown["Section Headers"], 20, 0) || 50),
    50,
  );

  const formatting = clampAtsScore(
    (raw?.formatting as { score?: number })?.score ??
      (scalePart(breakdown["Content Density"], 15, 0) || 75),
    75,
  );

  const matchScore = clampAtsScore(raw?.matchScore, 0);

  const strengths = Array.isArray(raw?.strengths) ? (raw!.strengths as string[]) : [];
  const improvements = Array.isArray(raw?.improvements)
    ? (raw!.improvements as string[])
    : Array.isArray(raw?.recommendations)
      ? (raw!.recommendations as string[]).slice(0, 8)
      : [];

  const computedOverall =
    atsScore || clampAtsScore((contact + skills + experience + education + formatting) / 5, 0);

  return {
    atsScore: computedOverall,
    matchScore,
    strengths,
    improvements,
    sections: {
      contact: { score: contact, feedback: sections.contact?.feedback },
      skills: { score: skills, feedback: sections.skills?.feedback },
      experience: { score: experience, feedback: sections.experience?.feedback },
      education: { score: education, feedback: sections.education?.feedback },
      summary: sections.summary
        ? { score: clampAtsScore(sections.summary.score, computedOverall), feedback: sections.summary.feedback }
        : undefined,
    },
    formatting: {
      score: formatting,
      issues: (raw?.formatting as { issues?: string[] })?.issues,
    },
    keywordMatches: Array.isArray(raw?.keywordMatches)
      ? (raw!.keywordMatches as NormalizedAtsAnalysis["keywordMatches"])
      : undefined,
    recommendations: Array.isArray(raw?.recommendations)
      ? (raw!.recommendations as string[])
      : undefined,
    extractedSkills: Array.isArray(raw?.extractedSkills)
      ? (raw!.extractedSkills as string[])
      : undefined,
    wordCount: typeof raw?.wordCount === "number" ? raw.wordCount : undefined,
    aiEnhanced: Boolean(raw?.aiEnhanced),
    scannedPdf: Boolean(raw?.scannedPdf),
  };
}
