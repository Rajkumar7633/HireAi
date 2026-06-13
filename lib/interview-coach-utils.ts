export type CoachCategory = "behavioral" | "technical" | "situational" | "cultural" | "all"
export type CoachDifficulty = "easy" | "medium" | "hard" | "mixed"

export interface RolePreset {
  title: string
  icon: string
  skills: string[]
  description: string
}

export const ROLE_PRESETS: RolePreset[] = [
  { title: "Software Engineer", icon: "💻", skills: ["JavaScript", "System Design", "APIs", "Git"], description: "Backend & full-stack roles" },
  { title: "Frontend Developer", icon: "🎨", skills: ["React", "CSS", "TypeScript", "Performance"], description: "UI-focused interviews" },
  { title: "Data Analyst", icon: "📊", skills: ["SQL", "Python", "Excel", "Visualization"], description: "Analytics & reporting" },
  { title: "Product Manager", icon: "🚀", skills: ["Roadmapping", "Stakeholders", "Metrics", "Prioritization"], description: "Product sense & strategy" },
  { title: "DevOps Engineer", icon: "⚙️", skills: ["CI/CD", "Docker", "Kubernetes", "AWS"], description: "Infrastructure & reliability" },
  { title: "SDE Backend", icon: "🗄️", skills: ["Java", "Databases", "Microservices", "Caching"], description: "Server-side engineering" },
]

export const STAR_FRAMEWORK = [
  { letter: "S", title: "Situation", desc: "Set the context — where, when, and what was happening?" },
  { letter: "T", title: "Task", desc: "Explain your responsibility and the goal you needed to achieve." },
  { letter: "A", title: "Action", desc: "Describe the specific steps YOU took (use 'I', not 'we')." },
  { letter: "R", title: "Result", desc: "Share measurable outcomes, learnings, or impact." },
]

export const FILLER_WORDS = ["um", "uh", "like", "basically", "honestly", "literally", "actually", "you know", "sort of", "kind of"]

export const CATEGORY_META: Record<string, { label: string; color: string }> = {
  behavioral: { label: "Behavioral", color: "bg-blue-100 text-blue-800 border-blue-200" },
  technical: { label: "Technical", color: "bg-purple-100 text-purple-800 border-purple-200" },
  situational: { label: "Situational", color: "bg-orange-100 text-orange-800 border-orange-200" },
  cultural: { label: "Cultural", color: "bg-pink-100 text-pink-800 border-pink-200" },
}

export const DIFFICULTY_META: Record<string, { label: string; color: string }> = {
  easy: { label: "Easy", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-800 border-amber-200" },
  hard: { label: "Hard", color: "bg-rose-100 text-rose-800 border-rose-200" },
}

export function extractSkillsFromDescription(jobDescription: string, jobTitle: string): string[] {
  const text = `${jobTitle} ${jobDescription}`.toLowerCase()
  const keywords = [
    "javascript", "typescript", "react", "node", "python", "java", "sql", "aws", "docker",
    "kubernetes", "leadership", "communication", "agile", "system design", "api", "git",
    "mongodb", "postgres", "machine learning", "data analysis", "product", "stakeholder",
  ]
  const found = keywords.filter(k => text.includes(k))
  if (found.length >= 2) return found.slice(0, 8)
  return jobTitle.split(/\s+/).filter(w => w.length > 2).slice(0, 4).concat(["problem solving", "communication"])
}

export function countFillerWords(text: string): number {
  const lower = text.toLowerCase()
  let count = 0
  for (const filler of FILLER_WORDS) {
    const re = new RegExp(`\\b${filler.replace(/\s+/g, "\\s+")}\\b`, "gi")
    count += (lower.match(re) || []).length
  }
  return count
}

export function analyzeAnswerDraft(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const fillerCount = countFillerWords(text)
  const hasStarHints = /situation|task|action|result|because|led to|outcome|impact/i.test(text)
  const idealMin = 80
  const idealMax = 200

  let readiness = 0
  if (wordCount >= 30) readiness += 25
  if (wordCount >= 60) readiness += 25
  if (fillerCount <= 2) readiness += 20
  if (hasStarHints) readiness += 20
  if (wordCount >= idealMin && wordCount <= idealMax) readiness += 10

  return {
    wordCount,
    fillerCount,
    hasStarHints,
    readiness: Math.min(100, readiness),
    lengthHint:
      wordCount < 30
        ? "Too short — add a concrete example"
        : wordCount > 250
          ? "Consider tightening — aim for 90–180 words"
          : "Good length for a structured answer",
  }
}

export function scoreRating(score: number): string {
  if (score >= 85) return "Excellent"
  if (score >= 70) return "Strong"
  if (score >= 55) return "Good"
  if (score >= 40) return "Fair"
  return "Needs Practice"
}

export function scoreColorClass(score: number): string {
  if (score >= 80) return "text-emerald-600"
  if (score >= 60) return "text-amber-600"
  return "text-rose-600"
}

export function buildStaticQuestions(
  jobTitle: string,
  skills: string[],
  count: number,
  focus: CoachCategory,
  difficulty: CoachDifficulty,
) {
  const pool = [
    { id: "b1", question: `Tell me about yourself and why you're interested in this ${jobTitle} role.`, category: "behavioral", difficulty: "easy" },
    { id: "b2", question: "Describe a time you faced a conflict with a teammate. How did you resolve it?", category: "behavioral", difficulty: "medium" },
    { id: "t1", question: `Explain how you would design a scalable system for a core ${jobTitle} use case.`, category: "technical", difficulty: "hard" },
    { id: "t2", question: `Walk me through your experience with ${skills[0] || "your primary tech stack"}.`, category: "technical", difficulty: "medium" },
    { id: "s1", question: "You have a tight deadline and unclear requirements. What do you do first?", category: "situational", difficulty: "medium" },
    { id: "s2", question: "Tell me about a mistake you made at work and how you recovered.", category: "situational", difficulty: "easy" },
    { id: "c1", question: "What kind of team culture helps you do your best work?", category: "cultural", difficulty: "easy" },
    { id: "c2", question: "Why do you want to join our company specifically?", category: "cultural", difficulty: "medium" },
    { id: "t3", question: `How would you debug a production issue related to ${skills[1] || "performance"}?`, category: "technical", difficulty: "hard" },
    { id: "b3", question: "Give an example where you took initiative without being asked.", category: "behavioral", difficulty: "medium" },
  ]

  let filtered = pool
  if (focus !== "all") filtered = pool.filter(q => q.category === focus)
  if (difficulty !== "mixed") filtered = filtered.filter(q => q.difficulty === difficulty)
  if (filtered.length < count) filtered = [...filtered, ...pool.filter(q => !filtered.includes(q))]

  return filtered.slice(0, count).map((q, i) => ({ ...q, id: q.id || `q${i + 1}` }))
}

export const QUICK_TIPS = [
  "Use the STAR method for behavioral questions.",
  "Quantify impact: numbers, percentages, timelines.",
  "Pause instead of using filler words like 'um' or 'like'.",
  "Answer the question first, then add supporting detail.",
  "End with what you learned or the business outcome.",
]

export const LINKED_TOOLS = [
  { label: "Mock Interview", href: "/dashboard/job-seeker/mock-interview" },
  { label: "Skill Gap Analyzer", href: "/dashboard/job-seeker/skill-gap" },
  { label: "My Applications", href: "/dashboard/job-seeker/applications" },
  { label: "Video Interviews", href: "/dashboard/job-seeker/video-interviews" },
  { label: "Resume Builder", href: "/dashboard/job-seeker/resume-builder" },
]
