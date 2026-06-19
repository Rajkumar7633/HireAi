import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { connectDB } from "@/lib/mongodb"
import { aiService } from "@/lib/ai-service"
import mongoose from "mongoose"
import {
export { dynamic } from "@/lib/api-dynamic"

  type CoachCategory,
  type CoachDifficulty,
  buildStaticQuestions,
  extractSkillsFromDescription,
  scoreRating,
} from "@/lib/interview-coach-utils"

function getCoachSessionModel() {
  if (mongoose.models.InterviewCoachSession) return mongoose.models.InterviewCoachSession
  const schema = new mongoose.Schema(
    {
      userId: { type: String, required: true, index: true },
      jobTitle: { type: String, required: true },
      jobDescription: { type: String, default: "" },
      experienceLevel: { type: String, default: "mid" },
      questionCount: { type: Number, default: 5 },
      focusCategory: { type: String, default: "all" },
      difficulty: { type: String, default: "mixed" },
      questions: [
        {
          id: String,
          question: String,
          category: String,
          difficulty: String,
        },
      ],
      rounds: [
        {
          question: String,
          category: String,
          difficulty: String,
          userAnswer: String,
          skipped: { type: Boolean, default: false },
          feedback: {
            score: Number,
            strengths: [String],
            improvements: [String],
            betterAnswer: String,
            fillerWordCount: Number,
            clarity: Number,
            relevance: Number,
            tip: String,
          },
          answeredAt: Date,
        },
      ],
      overallScore: { type: Number, default: 0 },
      completedAt: Date,
    },
    { timestamps: true },
  )
  schema.index({ userId: 1, createdAt: -1 })
  return mongoose.model("InterviewCoachSession", schema)
}

async function generateQuestionsForSession(
  jobTitle: string,
  jobDescription: string,
  experienceLevel: string,
  questionCount: number,
  focus: CoachCategory,
  difficulty: CoachDifficulty,
) {
  const skills = extractSkillsFromDescription(jobDescription, jobTitle)
  try {
    const aiQuestions = await aiService.generateInterviewQuestions(
      jobTitle,
      skills,
      experienceLevel,
      Math.max(questionCount, 8),
    )
    let list = aiQuestions.map((q, i) => ({
      id: q.id || `q${i + 1}`,
      question: q.question,
      category: q.category,
      difficulty: q.difficulty,
    }))
    if (focus !== "all") list = list.filter(q => q.category === focus)
    if (difficulty !== "mixed") list = list.filter(q => q.difficulty === difficulty)
    if (list.length >= questionCount) return list.slice(0, questionCount)
  } catch {
    /* fallback below */
  }
  return buildStaticQuestions(jobTitle, skills, questionCount, focus, difficulty)
}

function formatQuestion(q: any, index: number, total: number) {
  return {
    id: q.id,
    question: q.question,
    category: q.category,
    difficulty: q.difficulty,
    questionNumber: index + 1,
    totalQuestions: total,
  }
}

function buildSummary(rounds: any[]) {
  const scored = rounds.filter(r => !r.skipped && r.feedback?.score != null)
  const scores = scored.map(r => r.feedback.score)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const allImprovements = scored.flatMap(r => r.feedback?.improvements || [])
  const freq: Record<string, number> = {}
  allImprovements.forEach(i => { freq[i] = (freq[i] || 0) + 1 })
  const topImprovements = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([i]) => i)

  return {
    averageScore: avgScore,
    rating: scoreRating(avgScore),
    topStrengths: scored.flatMap(r => r.feedback?.strengths || []).slice(0, 4),
    topImprovements,
    totalFillerWords: scored.reduce((s, r) => s + (r.feedback?.fillerWordCount || 0), 0),
    questionScores: scored.map((r, i) => ({
      question: r.question?.slice(0, 60) + (r.question?.length > 60 ? "…" : ""),
      score: r.feedback?.score || 0,
      category: r.category,
      index: i + 1,
    })),
    answeredCount: scored.length,
    skippedCount: rounds.filter(r => r.skipped).length,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const CoachSession = getCoachSessionModel()
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (sessionId) {
      const doc = await CoachSession.findOne({ _id: sessionId, userId: session.userId }).lean()
      if (!doc) return NextResponse.json({ message: "Session not found" }, { status: 404 })
      return NextResponse.json({
        session: {
          id: String((doc as any)._id),
          jobTitle: (doc as any).jobTitle,
          jobDescription: (doc as any).jobDescription,
          overallScore: (doc as any).overallScore,
          completedAt: (doc as any).completedAt,
          createdAt: (doc as any).createdAt,
          rounds: (doc as any).rounds,
          summary: buildSummary((doc as any).rounds || []),
        },
      })
    }

    const sessions = await CoachSession.find({ userId: session.userId })
      .select("jobTitle overallScore completedAt createdAt rounds questionCount")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    const completed = sessions.filter((s: any) => s.completedAt)
    const scores = completed.map((s: any) => s.overallScore || 0).filter(Boolean)
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    const bestScore = scores.length ? Math.max(...scores) : 0

    const last7 = sessions.filter((s: any) => {
      const d = new Date(s.createdAt)
      return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000
    })

    return NextResponse.json({
      stats: {
        totalSessions: sessions.length,
        completedSessions: completed.length,
        averageScore: avgScore,
        bestScore,
        weeklySessions: last7.length,
        totalQuestionsAnswered: sessions.reduce((n, s: any) => n + (s.rounds?.length || 0), 0),
      },
      recentSessions: sessions.slice(0, 5).map((s: any) => ({
        id: String(s._id),
        jobTitle: s.jobTitle,
        overallScore: s.overallScore,
        questionsAnswered: s.rounds?.length || 0,
        questionCount: s.questionCount || 5,
        completedAt: s.completedAt,
        createdAt: s.createdAt,
      })),
    })
  } catch (error) {
    console.error("Interview coach GET error:", error)
    return NextResponse.json({ message: "Failed to load coach data" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")
    if (!sessionId) return NextResponse.json({ message: "sessionId required" }, { status: 400 })

    await connectDB()
    const CoachSession = getCoachSessionModel()
    await CoachSession.deleteOne({ _id: sessionId, userId: session.userId })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ message: "Delete failed" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session || session.role !== "job_seeker") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await connectDB()
    const CoachSession = getCoachSessionModel()
    const body = await request.json()
    const { action } = body

    if (action === "start") {
      const {
        jobTitle,
        jobDescription = "",
        experienceLevel = "mid",
        questionCount = 5,
        focusCategory = "all",
        difficulty = "mixed",
      } = body

      if (!jobTitle?.trim()) {
        return NextResponse.json({ message: "jobTitle is required" }, { status: 400 })
      }

      const count = Math.min(Math.max(parseInt(String(questionCount), 10) || 5, 3), 10)
      const questions = await generateQuestionsForSession(
        jobTitle.trim(),
        jobDescription,
        experienceLevel,
        count,
        focusCategory as CoachCategory,
        difficulty as CoachDifficulty,
      )

      const coachSession = await CoachSession.create({
        userId: session.userId,
        jobTitle: jobTitle.trim(),
        jobDescription,
        experienceLevel,
        questionCount: count,
        focusCategory,
        difficulty,
        questions,
        rounds: [],
      })

      return NextResponse.json({
        sessionId: coachSession._id.toString(),
        currentQuestion: formatQuestion(questions[0], 0, count),
        questionCount: count,
        message: `Starting ${count}-question practice for ${jobTitle.trim()}.`,
      })
    }

    if (action === "answer" || action === "skip") {
      const {
        sessionId,
        question,
        category,
        difficulty: qDifficulty,
        userAnswer = "",
        questionNumber = 1,
      } = body

      if (!sessionId || !question) {
        return NextResponse.json({ message: "sessionId and question are required" }, { status: 400 })
      }

      const coachSession = await CoachSession.findOne({ _id: sessionId, userId: session.userId })
      if (!coachSession) return NextResponse.json({ message: "Session not found" }, { status: 404 })

      const total = coachSession.questionCount || coachSession.questions?.length || 5
      const isSkip = action === "skip"

      let feedback = isSkip
        ? {
            score: 0,
            clarity: 0,
            relevance: 0,
            strengths: [],
            improvements: ["Question was skipped — try answering fully next time"],
            betterAnswer: "",
            fillerWordCount: 0,
            tip: "Even if unsure, structure a partial STAR answer instead of skipping.",
          }
        : await evaluateAnswer(question, userAnswer, category || "behavioral", coachSession.jobTitle)

      coachSession.rounds.push({
        question,
        category: category || "behavioral",
        difficulty: qDifficulty || "medium",
        userAnswer: isSkip ? "(skipped)" : userAnswer,
        skipped: isSkip,
        feedback,
        answeredAt: new Date(),
      })

      const isLastQuestion = questionNumber >= total
      let nextQuestion = null

      if (!isLastQuestion) {
        const nextQ = coachSession.questions?.[questionNumber]
        if (nextQ) nextQuestion = formatQuestion(nextQ, questionNumber, total)
      } else {
        const scored = coachSession.rounds.filter((r: any) => !r.skipped)
        const scores = scored.map((r: any) => r.feedback?.score || 0)
        coachSession.overallScore = scores.length
          ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
          : 0
        coachSession.completedAt = new Date()
      }

      await coachSession.save()

      return NextResponse.json({
        feedback,
        nextQuestion,
        sessionComplete: isLastQuestion,
        overallScore: isLastQuestion ? coachSession.overallScore : undefined,
        summary: isLastQuestion ? buildSummary(coachSession.rounds) : undefined,
      })
    }

    if (action === "history") {
      const sessions = await CoachSession.find({ userId: session.userId })
        .select("jobTitle overallScore completedAt createdAt rounds questionCount difficulty focusCategory")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()

      return NextResponse.json({
        sessions: sessions.map((s: any) => ({
          id: s._id.toString(),
          jobTitle: s.jobTitle,
          overallScore: s.overallScore,
          questionsAnswered: s.rounds?.length || 0,
          questionCount: s.questionCount || 5,
          difficulty: s.difficulty,
          focusCategory: s.focusCategory,
          completedAt: s.completedAt,
          createdAt: s.createdAt,
          isComplete: !!s.completedAt,
        })),
      })
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Interview coach error:", error)
    return NextResponse.json({ message: "Interview coach service failed" }, { status: 500 })
  }
}

async function evaluateAnswer(question: string, answer: string, category: string, jobTitle: string) {
  try {
    const mdl = await (aiService as any).ensureModel?.()
    if (!mdl?.generateText || !mdl?.model) return heuristicFeedback(answer)

    const prompt = `You are an expert interview coach. Evaluate this interview answer for a ${jobTitle} role.

Question (${category}): ${question}

Candidate's Answer: ${answer}

Return ONLY valid JSON:
{
  "score": <0-100>,
  "clarity": <0-100>,
  "relevance": <0-100>,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "betterAnswer": "A stronger version in 2-3 sentences",
  "fillerWordCount": <count>,
  "tip": "One actionable tip"
}`

    const result = await mdl.generateText({ model: mdl.model, prompt, maxTokens: 600 })
    const parsed = JSON.parse(result.text.replace(/```json\n?|\n?```/g, "").trim())
    return {
      score: Math.min(100, Math.max(0, parsed.score || 50)),
      clarity: parsed.clarity || 70,
      relevance: parsed.relevance || 70,
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      betterAnswer: parsed.betterAnswer || "",
      fillerWordCount: parsed.fillerWordCount || 0,
      tip: parsed.tip || "",
    }
  } catch {
    return heuristicFeedback(answer)
  }
}

function heuristicFeedback(answer: string) {
  const words = answer.trim().split(/\s+/).filter(Boolean)
  const wordCount = words.length
  const fillerWords = ["um", "uh", "like", "basically", "honestly", "literally"]
  const fillerWordCount = words.filter(w => fillerWords.includes(w.toLowerCase())).length
  const score = Math.min(100, Math.max(30, Math.round(50 + wordCount / 5 - fillerWordCount * 3)))

  return {
    score,
    clarity: score,
    relevance: score,
    strengths: wordCount > 50 ? ["Detailed answer", "Good length"] : ["Answer provided"],
    improvements: [
      wordCount < 30 ? "Expand your answer with specific examples" : null,
      fillerWordCount > 2 ? "Reduce filler words (um, uh, like)" : null,
      "Use the STAR method: Situation, Task, Action, Result",
    ].filter(Boolean) as string[],
    betterAnswer: "",
    fillerWordCount,
    tip: "Structure your answer using the STAR method for behavioral questions.",
  }
}
