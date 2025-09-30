import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { aiService } from "@/lib/ai-service"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "recruiter") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { jobTitle, skills, experienceLevel, candidateBackground, questionCount, preferredCategories } = await request.json()

    const questions = await aiService.generateInterviewQuestions(
      jobTitle || "Software Developer",
      skills || [],
      experienceLevel || "Mid",
      Math.max(1, Math.min(50, questionCount || 10)),
    )
    // Apply category filtering if provided (e.g., ["technical","situational"]) and enforce count
    const allow = Array.isArray(preferredCategories) && preferredCategories.length
      ? new Set<string>(preferredCategories)
      : null

    let filtered = allow ? questions.filter((q) => allow!.has(q.category)) : questions

    // Top up if fewer than requested: synthesize reasonable variations
    const need = Math.max(1, Math.min(50, questionCount || 10)) - filtered.length
    if (need > 0) {
      const baseSkills: string[] = Array.isArray(skills) ? skills.slice(0, 5) : []
      const pos = (jobTitle || "the role").toLowerCase()
      const makeTech = (idx: number) => ({
        id: `tech_synth_${Date.now()}_${idx}`,
        question: `Explain how you would design and implement a scalable ${pos} feature using ${baseSkills[idx % Math.max(1, baseSkills.length)] || "core technologies"}.` ,
        category: "technical" as const,
        difficulty: "medium" as const,
        tags: ["architecture","scalability"],
      })
      const makeSitu = (idx: number) => ({
        id: `situ_synth_${Date.now()}_${idx}`,
        question: `You are facing a production incident in a ${pos} system; outline your step-by-step approach to triage, rollback, and root-cause analysis.` ,
        category: "situational" as const,
        difficulty: "hard" as const,
        tags: ["incident","problem-solving"],
      })
      const synth: typeof questions = []
      for (let i = 0; i < need; i++) {
        const next = allow ? (allow.has("technical") ? makeTech(i) : makeSitu(i)) : (i % 2 === 0 ? makeTech(i) : makeSitu(i))
        synth.push(next)
      }
      filtered = filtered.concat(synth)
    }

    const final = filtered.slice(0, Math.max(1, Math.min(50, questionCount || 10)))

    // Transform to expected format for backward compatibility
    const categorizedQuestions = {
      technical: final.filter((q) => q.category === "technical").map((q) => q.question),
      behavioral: final.filter((q) => q.category === "behavioral").map((q) => q.question),
      roleSpecific: final.filter((q) => q.category === "situational").map((q) => q.question),
      general: final.filter((q) => q.category === "cultural").map((q) => q.question),
      fullQuestions: final,
    }

    return NextResponse.json({ questions: categorizedQuestions })
  } catch (error) {
    console.error("Interview Questions Generation Error:", error)

    const {
      jobTitle = "Software Developer",
      skills = [],
      experienceLevel = "Mid",
    } = await request.json().catch(() => ({}))

    const baseQuestions = [
      "Tell me about yourself and your background in this field.",
      `What interests you most about this ${jobTitle} position?`,
      "Describe a challenging project you've worked on recently.",
    ]

    const skillQuestions = skills
      .slice(0, 3)
      .map((skill: string) => `Can you walk me through your experience with ${skill}? Provide a specific example.`)

    const levelQuestions =
      experienceLevel === "Senior"
        ? [
            "How do you approach mentoring junior team members?",
            "Describe a time when you had to make a difficult technical decision.",
            "How do you stay current with industry trends and technologies?",
          ]
        : experienceLevel === "Mid"
          ? [
              "How do you handle competing priorities and deadlines?",
              "Describe a time when you had to learn a new technology quickly.",
              "How do you collaborate with cross-functional teams?",
            ]
          : [
              "What motivates you to work in this field?",
              "How do you approach learning new concepts or technologies?",
              "Describe a time when you overcame a significant challenge.",
            ]

    const behavioralQuestions = [
      "Tell me about a time when you disagreed with a team member. How did you handle it?",
      "Describe a situation where you had to adapt to significant changes.",
      "What's your approach to giving and receiving feedback?",
    ]

    return NextResponse.json({
      questions: {
        technical: skillQuestions,
        behavioral: behavioralQuestions,
        roleSpecific: levelQuestions,
        general: baseQuestions,
      },
    })
  }
}
