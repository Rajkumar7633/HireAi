const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const JobApplication = require("../models/JobApplication")
const JobDescription = require("../models/JobDescription")
const Resume = require("../models/Resume")
const axios = require("axios") // For calling ML service

// @route   POST /api/ats/process-application
// @desc    Simulate ATS processing for a job application
// @access  Private (Recruiter)
router.post("/process-application", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can trigger ATS processing." })
  }

  const { applicationId } = req.body

  try {
    const application = await JobApplication.findById(applicationId).populate("jobDescriptionId").populate("resumeId")

    if (!application) {
      return res.status(404).json({ msg: "Job application not found" })
    }

    // Ensure recruiter owns the job description associated with this application
    if (application.jobDescriptionId.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to process this application" })
    }

    // Call ML service for ATS scoring
    const mlServiceUrl = process.env.ML_SERVICE_URL || "http://localhost:8000"
    const mlResponse = await axios.post(`${mlServiceUrl}/match`, {
      resume_text: application.resumeId.parsedText,
      job_description_text: application.jobDescriptionId.description,
      job_skills: application.jobDescriptionId.skills,
    })

    const { ats_score, matched_skills, suggestions } = mlResponse.data

    // Update the application or create a new Match entry with ATS score
    // For simplicity, we'll update the application status and add ATS score to it
    // In a more complex system, ATS results might be stored in a dedicated Match model.
    application.status = "Reviewed" // Or a specific ATS status
    application.atsScore = ats_score // Assuming ATS score can be stored directly on application
    // You might also want to store matched_skills and suggestions here or in a Match model

    await application.save()

    res.json({
      msg: "ATS processing simulated successfully",
      application,
      atsScore: ats_score,
      matchedSkills: matched_skills,
      suggestions,
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
