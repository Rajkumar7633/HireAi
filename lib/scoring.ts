import type { IUser } from "@/models/User"
import Application from "@/models/Application"

export type ScoreBreakdown = {
  projects: number
  experience: number
  skills: number
  coding: number
  achievements: number
  completeness: number
  recency: number
  total: number
}

// v2 weights (sum to 100)
const WEIGHTS = {
  projects: 20,
  experience: 20,
  skills: 25,
  coding: 20,
  achievements: 10,
  completeness: 3,
  recency: 2,
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

export async function getLatestAssessmentScore(userId: string): Promise<{ score: number; completedAt?: Date } | null> {
  const app = await Application.find({ jobSeekerId: userId, score: { $ne: null } })
    .sort({ completedAt: -1 })
    .select("score completedAt")
    .limit(1)
    .lean()
  if (!app || app.length === 0) return null
  return { score: app[0].score || 0, completedAt: app[0].completedAt }
}

export async function computeProfileScore(user: IUser): Promise<ScoreBreakdown> {
  // Experience: prefer explicit field, fallback to summary heuristic
  let years = Number((user as any).yearsOfExperience || 0)
  if (!years || isNaN(years)) {
    const sum = (user.professionalSummary || "").toLowerCase()
    const match = sum.match(/(\d+)(?:\+)?\s*(?:years|yrs)/)
    if (match) years = parseInt(match[1] || "0", 10)
  }
  years = clamp(years, 0, 20)
  const experienceScoreRaw = Math.min(years, 10) * 2 // up to 20

  // Skills: count unique skills; full 25 points at ~15 skills
  const skillsArr = Array.isArray((user as any).skills) ? ((user as any).skills as string[]) : []
  const uniqueSkills = Array.from(new Set(skillsArr.map((s) => (s || "").toLowerCase().trim()).filter(Boolean)))
  const skillsScoreRaw = clamp((uniqueSkills.length / 15) * 25, 0, 25)

  // Projects: consider substantial projects (title + either tags>=2 or link)
  const projects = Array.isArray((user as any).projects) ? ((user as any).projects as any[]) : []
  const substantial = projects.filter((p) => p?.title && ((p?.tags?.length || 0) >= 2 || !!p?.link)).length
  const projectsScoreRaw = clamp(substantial * 4, 0, 20)

  // Achievements: each worth up to 2 points, cap 10
  const achievements = Array.isArray((user as any).achievements) ? ((user as any).achievements as string[]) : []
  const achievementsScoreRaw = clamp(achievements.length * 2, 0, 10)

  // Coding from latest assessment
  const latest = await getLatestAssessmentScore(String(user._id))
  const codingScoreRaw = latest ? clamp((latest.score / 100) * 20, 0, 20) : 0

  // Completeness: basic sections present, cap 3
  let completenessRaw = 0
  if (user.isProfileComplete) completenessRaw += 2
  if (user.linkedinUrl) completenessRaw += 1
  if (user.professionalSummary && user.professionalSummary.length > 120) completenessRaw += 1
  completenessRaw = clamp(completenessRaw, 0, 3)

  // Recency: updated within last 60 days, cap 2
  let recencyRaw = 0
  const updated = user.updatedAt ? new Date(user.updatedAt) : null
  if (updated) {
    const days = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24)
    if (days <= 30) recencyRaw = 2
    else if (days <= 60) recencyRaw = 1
  }

  const breakdown: ScoreBreakdown = {
    projects: Math.round(projectsScoreRaw),
    experience: Math.round(experienceScoreRaw),
    skills: Math.round(skillsScoreRaw),
    coding: Math.round(codingScoreRaw),
    achievements: Math.round(achievementsScoreRaw),
    completeness: Math.round(completenessRaw),
    recency: Math.round(recencyRaw),
    total: 0,
  }

  // Total is simply sum of components since we already scaled components to their max weights
  const total =
    breakdown.projects +
    breakdown.experience +
    breakdown.skills +
    breakdown.coding +
    breakdown.achievements +
    breakdown.completeness +
    breakdown.recency

  breakdown.total = Math.round(clamp(total, 0, 100))
  return breakdown
}
