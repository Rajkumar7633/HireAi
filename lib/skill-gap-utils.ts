export type SkillImportance = "critical" | "important" | "nice-to-have"

export interface RolePreset {
  title: string
  icon: string
  description: string
  sampleJd: string
  skills: string[]
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    title: "Software Engineer",
    icon: "💻",
    description: "Full-stack / backend engineering",
    skills: ["JavaScript", "TypeScript", "System Design", "SQL", "Git", "REST APIs"],
    sampleJd: "Build scalable web services, write clean code, collaborate in agile teams, design APIs and databases.",
  },
  {
    title: "Frontend Developer",
    icon: "🎨",
    description: "React & modern UI",
    skills: ["React", "TypeScript", "CSS", "HTML", "Performance", "Testing"],
    sampleJd: "Develop responsive UIs, optimize performance, implement design systems, write component tests.",
  },
  {
    title: "Data Analyst",
    icon: "📊",
    description: "Analytics & insights",
    skills: ["SQL", "Python", "Excel", "Tableau", "Statistics", "Data Visualization"],
    sampleJd: "Analyze datasets, build dashboards, communicate insights to stakeholders, support data-driven decisions.",
  },
  {
    title: "DevOps Engineer",
    icon: "⚙️",
    description: "CI/CD & cloud",
    skills: ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Monitoring"],
    sampleJd: "Automate deployments, manage cloud infrastructure, ensure reliability and observability.",
  },
  {
    title: "Product Manager",
    icon: "🚀",
    description: "Product strategy",
    skills: ["Roadmapping", "User Research", "Analytics", "Stakeholder Management", "Agile", "Prioritization"],
    sampleJd: "Define product vision, prioritize backlog, work with engineering and design, measure KPIs.",
  },
  {
    title: "Machine Learning Engineer",
    icon: "🤖",
    description: "ML systems",
    skills: ["Python", "Machine Learning", "TensorFlow", "Statistics", "MLOps", "SQL"],
    sampleJd: "Train and deploy ML models, build data pipelines, evaluate model performance in production.",
  },
]

export const IMPORTANCE_META: Record<SkillImportance, { label: string; color: string; order: number }> = {
  critical: { label: "Critical", color: "bg-rose-100 text-rose-800 border-rose-200", order: 0 },
  important: { label: "Important", color: "bg-amber-100 text-amber-800 border-amber-200", order: 1 },
  "nice-to-have": { label: "Nice to have", color: "bg-blue-100 text-blue-800 border-blue-200", order: 2 },
}

export const READINESS_META: Record<string, { color: string; bg: string }> = {
  Ready: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  "Almost Ready": { color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  "Needs Work": { color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  "Major Gap": { color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
}

export const LINKED_TOOLS = [
  { label: "Interview Coach", href: "/dashboard/job-seeker/interview-coach" },
  { label: "Resume Builder", href: "/dashboard/job-seeker/resume-builder" },
  { label: "Job Matches", href: "/dashboard/job-seeker/matches" },
  { label: "Upload Resume", href: "/dashboard/job-seeker/upload" },
  { label: "My Applications", href: "/dashboard/job-seeker/applications" },
]

export function matchScoreColor(score: number): string {
  if (score >= 80) return "#10b981"
  if (score >= 60) return "#3b82f6"
  if (score >= 40) return "#f59e0b"
  return "#ef4444"
}

export function buildExportReport(analysis: {
  jobTitle: string
  matchScore: number
  readinessLevel: string
  summary?: string
  currentSkills: string[]
  missingSkills: Array<{ skill: string; importance: string; estimatedWeeks: number }>
  learningPath: Array<{ week: number; focus: string; skills: string[]; resources: string[] }>
}): string {
  const lines = [
    `Skill Gap Report — ${analysis.jobTitle}`,
    `Match Score: ${analysis.matchScore}% (${analysis.readinessLevel})`,
    "",
    analysis.summary || "",
    "",
    "Skills you have:",
    ...analysis.currentSkills.map(s => `- ${s}`),
    "",
    "Skill gaps:",
    ...analysis.missingSkills.map(s => `- ${s.skill} [${s.importance}] ~${s.estimatedWeeks}w`),
    "",
    "Learning path:",
    ...analysis.learningPath.map(step => `Week ${step.week}: ${step.focus} (${step.skills.join(", ")})`),
  ]
  return lines.join("\n")
}

export const COMMON_SKILL_KEYWORDS = [
  "javascript", "typescript", "react", "node", "python", "java", "sql", "aws", "docker",
  "kubernetes", "git", "rest", "api", "machine learning", "data analysis", "excel",
  "tableau", "agile", "communication", "leadership", "system design", "css", "html",
  "mongodb", "postgres", "ci/cd", "linux", "testing", "figma", "product", "analytics",
]

export function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase()
  const found = COMMON_SKILL_KEYWORDS.filter(k => lower.includes(k))
  return [...new Set(found.map(s => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")))]
}
