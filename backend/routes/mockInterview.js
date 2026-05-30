/**
 * backend/routes/mockInterview.js
 * Endpoints for the AI interactive mock voice interview.
 */
const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const MockInterview = require("../models/MockInterview")
const JobDescription = require("../models/JobDescription")

// Helper function to build custom errors
function makeError(message, status = 400) {
  const err = new Error(message)
  err.statusCode = status
  return err
}

// Helper to interact with Groq API
async function callGroqAI(prompt, responseJson = true) {
  if (!process.env.GROQ_API_KEY) {
    throw makeError("AI API key not configured on server", 503)
  }
  try {
    const payload = {
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
    }
    if (responseJson) {
      payload.response_format = { type: "json_object" }
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("[Groq Error]", errText)
      throw makeError("Error calling AI agent engine", 502)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) throw makeError("Empty response from AI engine", 502)
    return responseJson ? JSON.parse(content) : content
  } catch (err) {
    console.error("Groq integration failed:", err.message)
    throw err.statusCode ? err : makeError("AI request timeout or failure", 504)
  }
}

// @route   POST /api/mock-interview/start
// @desc    Start an interview and generate questions
router.post("/start", auth, async (req, res) => {
  const { jobId } = req.body
  if (!jobId) return res.status(400).json({ msg: "jobId is required" })

  try {
    const job = await JobDescription.findById(jobId)
    if (!job) return res.status(404).json({ msg: "Job description not found" })

    // Generate 3 custom interview questions based on job description
    const prompt = `You are a technical recruiter. Create EXACTLY 3 challenging interview questions for a candidate applying to the job: "${job.title}".
Job Description: ${job.description}
Key requirements: ${job.requirements}

Return ONLY a JSON object with this exact shape:
{
  "questions": [
    "question 1 text",
    "question 2 text",
    "question 3 text"
  ]
}
Be precise and technical. Return valid JSON.`

    const aiResult = await callGroqAI(prompt, true)
    const questionsList = aiResult.questions || []
    if (questionsList.length === 0) {
      questionsList.push(
        "Tell me about a challenging technical project you built.",
        "How do you optimize application performance and handle scalability?",
        "Describe a situation where you had to resolve a bug or conflict under tight deadlines."
      )
    }

    const interview = new MockInterview({
      candidateId: req.user.id,
      jobId,
      status: "started",
      questions: questionsList.map((q) => ({ questionText: q })),
    })

    await interview.save()
    res.json({
      interviewId: interview._id,
      questions: questionsList,
    })
  } catch (err) {
    console.error(err.message)
    res.status(err.statusCode || 500).json({ msg: err.message || "Server Error" })
  }
})

// @route   POST /api/mock-interview/submit-answer
// @desc    Analyze a candidate response for a question index
router.post("/submit-answer", auth, async (req, res) => {
  const { interviewId, questionIndex, answerText } = req.body
  if (interviewId === undefined || questionIndex === undefined || answerText === undefined) {
    return res.status(400).json({ msg: "interviewId, questionIndex, and answerText are required" })
  }

  try {
    const interview = await MockInterview.findById(interviewId)
    if (!interview) return res.status(404).json({ msg: "Mock interview session not found" })
    if (interview.candidateId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to submit answers for this session" })
    }

    const targetQuestion = interview.questions[questionIndex]
    if (!targetQuestion) return res.status(404).json({ msg: "Question index not found in interview" })

    // Heuristics for filler words (um, ah, like, totally, etc.)
    const fillers = ["um", "ah", "uh", "like", "actually", "basically", "literally"]
    const foundFillers = []
    const words = answerText.toLowerCase().split(/\W+/)
    words.forEach((w) => {
      if (fillers.includes(w)) {
        foundFillers.push(w)
      }
    })

    // Analyze answer quality using Groq
    const prompt = `Evaluate this candidate's interview response.
Question Asked: "${targetQuestion.questionText}"
Candidate Answer: "${answerText}"

Provide:
1. Technical feedback (strengths, gaps).
2. STAR method compliance checklist.
3. Rating score from 0 to 100 based on depth, clarity, and relevance.

Return ONLY a JSON object with this shape:
{
  "feedback": "constructive 2-sentence feedback string",
  "score": <number 0-100>
}
Be critical and professional. Return valid JSON.`

    let aiResult = { feedback: "Response analyzed.", score: 70 }
    try {
      aiResult = await callGroqAI(prompt, true)
    } catch (aiErr) {
      console.warn("AI answer evaluation failed, using fallback metrics:", aiErr.message)
    }

    targetQuestion.answerText = answerText
    targetQuestion.feedback = aiResult.feedback || "Answer captured."
    targetQuestion.score = aiResult.score || 70
    targetQuestion.fillerWords = foundFillers

    await interview.save()

    res.json({
      score: targetQuestion.score,
      feedback: targetQuestion.feedback,
      fillerWords: foundFillers,
    })
  } catch (err) {
    console.error(err.message)
    res.status(err.statusCode || 500).json({ msg: err.message || "Server Error" })
  }
})

// @route   POST /api/mock-interview/finalize
// @desc    Complete interview session and generate final scoring and overview
router.post("/finalize", auth, async (req, res) => {
  const { interviewId } = req.body
  if (!interviewId) return res.status(400).json({ msg: "interviewId is required" })

  try {
    const interview = await MockInterview.findById(interviewId)
    if (!interview) return res.status(404).json({ msg: "Interview session not found" })
    if (interview.candidateId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    // Calculate average score
    const scores = interview.questions.map((q) => q.score || 0)
    const avgScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1)

    // Formulate final overall overview using Groq
    const QA_summary = interview.questions
      .map((q, i) => `Q${i + 1}: ${q.questionText}\nA${i + 1}: ${q.answerText}\nScore: ${q.score}`)
      .join("\n\n")

    const prompt = `Synthesize these interview Q&As into an overall candidate summary.
${QA_summary}

Provide a short final summary (3 sentences maximum) highlighting their core expertise, confidence, and areas for improvement.
Return ONLY a JSON object with this shape:
{
  "summary": "overall performance evaluation description"
}
Return valid JSON.`

    let finalSummary = "Interview completed successfully."
    try {
      const aiResult = await callGroqAI(prompt, true)
      finalSummary = aiResult.summary || finalSummary
    } catch (aiErr) {
      console.warn("AI finalization failed:", aiErr.message)
    }

    interview.status = "completed"
    interview.overallScore = Math.round(avgScore)
    interview.overallFeedback = finalSummary

    await interview.save()

    res.json({
      overallScore: interview.overallScore,
      overallFeedback: interview.overallFeedback,
    })
  } catch (err) {
    console.error(err.message)
    res.status(err.statusCode || 500).json({ msg: err.message || "Server Error" })
  }
})

// @route   GET /api/mock-interview/my-interviews
// @desc    Get all mock interviews for the current seeker
router.get("/my-interviews", auth, async (req, res) => {
  try {
    const interviews = await MockInterview.find({ candidateId: req.user.id })
      .populate("jobId", "title company")
      .sort({ createdAt: -1 })
    res.json(interviews)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/mock-interview/:id
// @desc    Get details of a specific mock interview session
router.get("/:id", auth, async (req, res) => {
  try {
    const interview = await MockInterview.findById(req.params.id)
      .populate("jobId", "title company recruiterId")
      .populate("candidateId", "name email")

    if (!interview) return res.status(404).json({ msg: "Interview not found" })

    // Seeker can see their own. Recruiter can see if they are the owner of the job description.
    const isOwner = interview.candidateId._id.toString() === req.user.id
    const isJobRecruiter =
      interview.jobId && interview.jobId.recruiterId && interview.jobId.recruiterId.toString() === req.user.id

    if (!isOwner && !isJobRecruiter && req.user.role !== "admin") {
      return res.status(401).json({ msg: "Not authorized to view this interview report" })
    }

    res.json(interview)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
