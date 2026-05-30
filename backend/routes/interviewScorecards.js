const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const InterviewScorecard = require("../models/InterviewScorecard")
const JobApplication = require("../models/JobApplication")

// @route   POST /api/interview-scorecards/create
// @desc    Create a new interview scorecard
// @access  Private (Recruiter)
router.post("/create", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const {
    applicationId,
    interviewType,
    interviewDate,
    interviewDuration,
    scores,
    questions,
    strengths,
    weaknesses,
    areasForImprovement,
    comments,
    recommendation
  } = req.body

  if (!applicationId || !interviewType || !interviewDate) {
    return res.status(400).json({ msg: "Application ID, interview type, and date are required" })
  }

  try {
    const application = await JobApplication.findById(applicationId)
    if (!application) {
      return res.status(404).json({ msg: "Application not found" })
    }

    const scorecard = new InterviewScorecard({
      applicationId,
      interviewerId: req.user.id,
      candidateId: application.userId,
      interviewType,
      interviewDate,
      interviewDuration,
      scores: scores || {},
      questions: questions || [],
      strengths: strengths || [],
      weaknesses: weaknesses || [],
      areasForImprovement: areasForImprovement || [],
      comments,
      recommendation,
      status: "Draft"
    })

    await scorecard.save()

    res.json({
      success: true,
      scorecard,
      msg: "Interview scorecard created successfully"
    })
  } catch (error) {
    console.error("Create scorecard error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/interview-scorecards/:id
// @desc    Get interview scorecard by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const scorecard = await InterviewScorecard.findById(req.params.id)
      .populate("interviewerId", "name email")
      .populate("candidateId", "name email")
      .populate("applicationId")
      .populate("reviewedBy", "name")

    if (!scorecard) {
      return res.status(404).json({ msg: "Scorecard not found" })
    }

    // Check authorization
    if (
      scorecard.interviewerId._id.toString() !== req.user.id &&
      scorecard.candidateId._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    res.json({
      success: true,
      scorecard
    })
  } catch (error) {
    console.error("Get scorecard error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/interview-scorecards/application/:applicationId
// @desc    Get all scorecards for an application
// @access  Private
router.get("/application/:applicationId", auth, async (req, res) => {
  try {
    const scorecards = await InterviewScorecard.find({ applicationId: req.params.applicationId })
      .populate("interviewerId", "name email")
      .sort({ interviewDate: -1 })

    res.json({
      success: true,
      scorecards
    })
  } catch (error) {
    console.error("Get application scorecards error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/interview-scorecards/:id
// @desc    Update interview scorecard
// @access  Private (Recruiter)
router.put("/:id", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const scorecard = await InterviewScorecard.findById(req.params.id)

    if (!scorecard) {
      return res.status(404).json({ msg: "Scorecard not found" })
    }

    if (scorecard.interviewerId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    Object.keys(req.body).forEach(key => {
      if (key !== "_id" && key !== "interviewerId" && key !== "candidateId" && key !== "applicationId") {
        scorecard[key] = req.body[key]
      }
    })

    await scorecard.save()

    res.json({
      success: true,
      scorecard,
      msg: "Scorecard updated successfully"
    })
  } catch (error) {
    console.error("Update scorecard error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/interview-scorecards/:id/submit
// @desc    Submit interview scorecard
// @access  Private (Recruiter)
router.put("/:id/submit", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const scorecard = await InterviewScorecard.findById(req.params.id)

    if (!scorecard) {
      return res.status(404).json({ msg: "Scorecard not found" })
    }

    if (scorecard.interviewerId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    scorecard.status = "Submitted"
    scorecard.submittedAt = Date.now()

    await scorecard.save()

    res.json({
      success: true,
      scorecard,
      msg: "Scorecard submitted successfully"
    })
  } catch (error) {
    console.error("Submit scorecard error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/interview-scorecards/:id/review
// @desc    Review interview scorecard
// @access  Private (Admin/Recruiter)
router.put("/:id/review", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const scorecard = await InterviewScorecard.findById(req.params.id)

    if (!scorecard) {
      return res.status(404).json({ msg: "Scorecard not found" })
    }

    scorecard.status = "Reviewed"
    scorecard.reviewedBy = req.user.id
    scorecard.reviewedAt = Date.now()

    await scorecard.save()

    res.json({
      success: true,
      scorecard,
      msg: "Scorecard reviewed successfully"
    })
  } catch (error) {
    console.error("Review scorecard error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
