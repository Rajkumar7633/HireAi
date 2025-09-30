const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const StructuredResume = require("../models/StructuredResume")

// @route   POST /api/structured-resume
// @desc    Create or update a structured resume for the authenticated job seeker
// @access  Private (Job Seeker)
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Access denied. Only job seekers can manage structured resumes." })
  }

  const {
    personalInfo,
    summary,
    experience,
    education,
    skills,
    projects,
    certifications,
    awards,
    languages,
    interests,
  } = req.body

  try {
    let structuredResume = await StructuredResume.findOne({ userId: req.user.id })

    if (structuredResume) {
      // Update existing
      structuredResume.personalInfo = personalInfo || structuredResume.personalInfo
      structuredResume.summary = summary || structuredResume.summary
      structuredResume.experience = experience || structuredResume.experience
      structuredResume.education = education || structuredResume.education
      structuredResume.skills = skills || structuredResume.skills
      structuredResume.projects = projects || structuredResume.projects
      structuredResume.certifications = certifications || structuredResume.certifications
      structuredResume.awards = awards || structuredResume.awards
      structuredResume.languages = languages || structuredResume.languages
      structuredResume.interests = interests || structuredResume.interests
      structuredResume.lastUpdated = new Date()
    } else {
      // Create new
      structuredResume = new StructuredResume({
        userId: req.user.id,
        personalInfo,
        summary,
        experience,
        education,
        skills,
        projects,
        certifications,
        awards,
        languages,
        interests,
        createdAt: new Date(),
        lastUpdated: new Date(),
      })
    }

    await structuredResume.save()
    res.json({ msg: "Structured resume saved successfully", structuredResume })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/structured-resume/my-resume
// @desc    Get the structured resume for the authenticated job seeker
// @access  Private (Job Seeker)
router.get("/my-resume", auth, async (req, res) => {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Access denied. Only job seekers can view their structured resume." })
  }

  try {
    const structuredResume = await StructuredResume.findOne({ userId: req.user.id })

    if (!structuredResume) {
      return res.status(404).json({ msg: "Structured resume not found for this user." })
    }

    res.json(structuredResume)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/structured-resume/user/:userId
// @desc    Get structured resume for a specific user (for recruiters/admins)
// @access  Private (Recruiter, Admin)
router.get("/user/:userId", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ msg: "Access denied. Only recruiters and admins can view other users' structured resumes." })
  }

  try {
    const structuredResume = await StructuredResume.findOne({ userId: req.params.userId })

    if (!structuredResume) {
      return res.status(404).json({ msg: "Structured resume not found for this user." })
    }

    res.json(structuredResume)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
