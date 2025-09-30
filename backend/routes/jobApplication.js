const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const JobApplication = require("../models/JobApplication")
const JobDescription = require("../models/JobDescription")
const Resume = require("../models/Resume")
const User = require("../models/User")
const Notification = require("../models/Notification")
const sendEmail = require("../utils/emailService")

// @route   POST /api/applications
// @desc    Submit a new job application
// @access  Private (Job Seeker)
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Access denied. Only job seekers can submit applications." })
  }

  const { jobDescriptionId, resumeId } = req.body

  try {
    const jobDescription = await JobDescription.findById(jobDescriptionId)
    const resume = await Resume.findById(resumeId)

    if (!jobDescription || !resume) {
      return res.status(404).json({ msg: "Job description or resume not found" })
    }

    if (resume.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Resume does not belong to the authenticated user" })
    }

    // Check if already applied
    const existingApplication = await JobApplication.findOne({
      jobSeekerId: req.user.id,
      jobDescriptionId,
    })
    if (existingApplication) {
      return res.status(400).json({ msg: "You have already applied for this job." })
    }

    const newApplication = new JobApplication({
      jobSeekerId: req.user.id,
      jobDescriptionId,
      resumeId,
      applicationDate: new Date(),
      status: "Pending",
    })

    await newApplication.save()

    // Notify recruiter
    const recruiter = await User.findById(jobDescription.recruiterId)
    if (recruiter) {
      const notification = new Notification({
        userId: recruiter._id,
        type: "application_status_update",
        message: `New application for "${jobDescription.title}" from ${req.user.email}.`,
        relatedEntity: {
          id: newApplication._id,
          type: "JobApplication",
        },
      })
      await notification.save()

      // Send email to recruiter
      await sendEmail({
        to: recruiter.email,
        subject: `New Job Application for "${jobDescription.title}"`,
        html: `<p>Dear ${recruiter.name || "Recruiter"},</p>
               <p>You have received a new application for your job posting: <strong>${jobDescription.title}</strong>.</p>
               <p>Applicant: ${req.user.email}</p>
               <p>View application details in your HireAI dashboard.</p>
               <p>Best regards,<br>The HireAI Team</p>`,
      })
    }

    res.json({ msg: "Application submitted successfully", application: newApplication })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/applications/my-applications
// @desc    Get all job applications for the authenticated job seeker
// @access  Private (Job Seeker)
router.get("/my-applications", auth, async (req, res) => {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Access denied. Only job seekers can view their applications." })
  }

  try {
    const applications = await JobApplication.find({ jobSeekerId: req.user.id })
      .populate("jobDescriptionId", "title location")
      .populate("resumeId", "filename")
      .sort({ applicationDate: -1 })
    res.json(applications)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/applications/job/:jobId
// @desc    Get all applications for a specific job description (for recruiter)
// @access  Private (Recruiter)
router.get("/job/:jobId", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can view job applications." })
  }

  try {
    const jobDescription = await JobDescription.findById(req.params.jobId)
    if (!jobDescription || jobDescription.recruiterId.toString() !== req.user.id) {
      return res.status(404).json({ msg: "Job Description not found or unauthorized" })
    }

    const applications = await JobApplication.find({ jobDescriptionId: req.params.jobId })
      .populate("jobSeekerId", "name email")
      .populate("resumeId", "filename")
      .sort({ applicationDate: 1 })

    res.json(applications)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   PUT /api/applications/:id/status
// @desc    Update the status of a job application
// @access  Private (Recruiter)
router.put("/:id/status", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can update application status." })
  }

  const { status } = req.body

  try {
    const application = await JobApplication.findById(req.params.id)
      .populate("jobSeekerId", "email name")
      .populate("jobDescriptionId", "title")

    if (!application) {
      return res.status(404).json({ msg: "Application not found" })
    }

    // Ensure the recruiter owns the job description associated with this application
    const jobDescription = await JobDescription.findById(application.jobDescriptionId._id)
    if (!jobDescription || jobDescription.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to update this application" })
    }

    application.status = status
    await application.save()

    // Notify job seeker about status update
    const jobSeeker = await User.findById(application.jobSeekerId._id)
    if (jobSeeker) {
      const notification = new Notification({
        userId: jobSeeker._id,
        type: "application_status_update",
        message: `Your application for "${application.jobDescriptionId.title}" has been updated to: ${status}.`,
        relatedEntity: {
          id: application._id,
          type: "JobApplication",
        },
      })
      await notification.save()

      await sendEmail({
        to: jobSeeker.email,
        subject: `Application Update for "${application.jobDescriptionId.title}"`,
        html: `<p>Dear ${jobSeeker.name || "Applicant"},</p>
               <p>Your application for <strong>${application.jobDescriptionId.title}</strong> has been updated to: <strong>${status}</strong>.</p>
               <p>Please check your HireAI dashboard for more details.</p>
               <p>Best regards,<br>The HireAI Team</p>`,
      })
    }

    res.json({ msg: "Application status updated successfully", application })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/applications/:id
// @desc    Get a single job application by ID
// @access  Private (Job Seeker, Recruiter, Admin - with authorization checks)
router.get("/:id", auth, async (req, res) => {
  try {
    const application = await JobApplication.findById(req.params.id)
      .populate("jobSeekerId", "name email")
      .populate("jobDescriptionId", "title recruiterId")
      .populate("resumeId", "filename")
      .populate("testId", "title") // Populate test details if assigned

    if (!application) {
      return res.status(404).json({ msg: "Application not found" })
    }

    // Authorization:
    // Job seeker can view their own applications.
    // Recruiter can view applications for their job descriptions.
    // Admin can view any application.
    const isJobSeekerApp = application.jobSeekerId._id.toString() === req.user.id
    const isRecruiterApp = application.jobDescriptionId.recruiterId.toString() === req.user.id

    if (req.user.role === "job_seeker" && !isJobSeekerApp) {
      return res.status(401).json({ msg: "Not authorized to view this application" })
    }
    if (req.user.role === "recruiter" && !isRecruiterApp) {
      return res.status(401).json({ msg: "Not authorized to view this application" })
    }
    if (req.user.role === "admin") {
      // Admin can view
    } else if (!isJobSeekerApp && !isRecruiterApp) {
      return res.status(401).json({ msg: "Not authorized to view this application" })
    }

    res.json(application)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
