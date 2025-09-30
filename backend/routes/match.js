const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const Match = require("../models/Match")
const Resume = require("../models/Resume")
const JobDescription = require("../models/JobDescription")
const axios = require("axios") // For making requests to ML service

// @route   POST /api/match/generate
// @desc    Generate matches for a given resume or job description
// @access  Private (Job Seeker for resume, Recruiter for job description)
router.post("/generate", auth, async (req, res) => {
  const { resumeId, jobDescriptionId } = req.body

  try {
    let resume, jobDescription

    if (resumeId) {
      resume = await Resume.findById(resumeId)
      if (!resume || resume.userId.toString() !== req.user.id) {
        return res.status(404).json({ msg: "Resume not found or unauthorized" })
      }
    }

    if (jobDescriptionId) {
      jobDescription = await JobDescription.findById(jobDescriptionId)
      if (!jobDescription || jobDescription.recruiterId.toString() !== req.user.id) {
        return res.status(404).json({ msg: "Job Description not found or unauthorized" })
      }
    }

    if (!resume && !jobDescription) {
      return res.status(400).json({ msg: "Either resumeId or jobDescriptionId is required" })
    }

    const matches = []

    if (resume) {
      // If resumeId is provided, find matches for this resume against all relevant job descriptions
      const allJobDescriptions = await JobDescription.find({}) // Or filter by industry/location if needed
      for (const jd of allJobDescriptions) {
        // Call ML service for matching
        const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000"
        const mlResponse = await axios.post(`${mlServiceUrl}/match`, {
          resume_text: resume.parsedText,
          job_description_text: jd.description,
          job_skills: jd.skills,
        })
        const { match_score, ats_score, matched_skills, suggestions } = mlResponse.data

        const existingMatch = await Match.findOne({ resumeId: resume._id, jobDescriptionId: jd._id })

        if (existingMatch) {
          existingMatch.matchScore = match_score
          existingMatch.atsScore = ats_score
          existingMatch.matchedSkills = matched_skills
          existingMatch.suggestions = suggestions
          existingMatch.matchDate = new Date()
          await existingMatch.save()
          matches.push(existingMatch)
        } else {
          const newMatch = new Match({
            resumeId: resume._id,
            jobDescriptionId: jd._id,
            matchScore: match_score,
            atsScore: ats_score,
            matchedSkills: matched_skills,
            suggestions: suggestions,
            matchDate: new Date(),
          })
          await newMatch.save()
          matches.push(newMatch)
        }
      }
    } else if (jobDescription) {
      // If jobDescriptionId is provided, find matches for this job description against all resumes
      const allResumes = await Resume.find({}) // Or filter by industry/location if needed
      for (const r of allResumes) {
        // Call ML service for matching
        const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000"
        const mlResponse = await axios.post(`${mlServiceUrl}/match`, {
          resume_text: r.parsedText,
          job_description_text: jobDescription.description,
          job_skills: jobDescription.skills,
        })
        const { match_score, ats_score, matched_skills, suggestions } = mlResponse.data

        const existingMatch = await Match.findOne({ resumeId: r._id, jobDescriptionId: jobDescription._id })

        if (existingMatch) {
          existingMatch.matchScore = match_score
          existingMatch.atsScore = ats_score
          existingMatch.matchedSkills = matched_skills
          existingMatch.suggestions = suggestions
          existingMatch.matchDate = new Date()
          await existingMatch.save()
          matches.push(existingMatch)
        } else {
          const newMatch = new Match({
            resumeId: r._id,
            jobDescriptionId: jobDescription._id,
            matchScore: match_score,
            atsScore: ats_score,
            matchedSkills: matched_skills,
            suggestions: suggestions,
            matchDate: new Date(),
          })
          await newMatch.save()
          matches.push(newMatch)
        }
      }
    }

    res.json({ msg: "Matches generated successfully", matches })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/match/my-matches
// @desc    Get matches for the authenticated job seeker's resumes
// @access  Private (Job Seeker)
router.get("/my-matches", auth, async (req, res) => {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Access denied. Only job seekers can view their matches." })
  }

  try {
    const resumes = await Resume.find({ userId: req.user.id }).select("_id")
    const resumeIds = resumes.map((r) => r._id)

    const matches = await Match.find({ resumeId: { $in: resumeIds } })
      .populate("resumeId", "filename")
      .populate("jobDescriptionId", "title recruiterId")
      .sort({ matchDate: -1 })

    res.json(matches)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/match/job/:jobId/candidates
// @desc    Get candidates (resumes) matched to a specific job description
// @access  Private (Recruiter)
router.get("/job/:jobId/candidates", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can view job candidates." })
  }

  try {
    const jobDescription = await JobDescription.findById(req.params.jobId)
    if (!jobDescription || jobDescription.recruiterId.toString() !== req.user.id) {
      return res.status(404).json({ msg: "Job Description not found or unauthorized" })
    }

    const matches = await Match.find({ jobDescriptionId: req.params.jobId })
      .populate({
        path: "resumeId",
        select: "filename userId",
        populate: {
          path: "userId",
          model: "User",
          select: "email name",
        },
      })
      .sort({ matchScore: -1 })

    res.json(matches)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/match/:id
// @desc    Get a single match by ID
// @access  Private (Job Seeker, Recruiter, Admin - with authorization checks)
router.get("/:id", auth, async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate("resumeId", "filename userId")
      .populate("jobDescriptionId", "title recruiterId")

    if (!match) {
      return res.status(404).json({ msg: "Match not found" })
    }

    // Authorization:
    // Job seeker can view if their resume is part of the match.
    // Recruiter can view if their job description is part of the match.
    // Admin can view any match.
    const isJobSeekerMatch = match.resumeId.userId.toString() === req.user.id
    const isRecruiterMatch = match.jobDescriptionId.recruiterId.toString() === req.user.id

    if (req.user.role === "job_seeker" && !isJobSeekerMatch) {
      return res.status(401).json({ msg: "Not authorized to view this match" })
    }
    if (req.user.role === "recruiter" && !isRecruiterMatch) {
      return res.status(401).json({ msg: "Not authorized to view this match" })
    }
    if (req.user.role === "admin") {
      // Admin can view
    } else if (!isJobSeekerMatch && !isRecruiterMatch) {
      return res.status(401).json({ msg: "Not authorized to view this match" })
    }

    res.json(match)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
