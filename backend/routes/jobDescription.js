const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const JobDescription = require("../models/JobDescription")

// @route   POST /api/job-description
// @desc    Create a new job description
// @access  Private (Recruiter)
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can create job descriptions." })
  }

  const { title, description, requirements, responsibilities, location, salary, employmentType, skills } = req.body

  if (!title || !description || !requirements || !responsibilities || !location || !employmentType || !skills) {
    return res.status(400).json({ msg: "Please enter all required fields" })
  }

  try {
    const newJobDescription = new JobDescription({
      recruiterId: req.user.id,
      title,
      description,
      requirements,
      responsibilities,
      location,
      salary,
      employmentType,
      skills,
      postedDate: new Date(),
    })

    await newJobDescription.save()
    res.json({ msg: "Job description created successfully", jobDescription: newJobDescription })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/job-description/my-jobs
// @desc    Get all job descriptions posted by the authenticated recruiter
// @access  Private (Recruiter)
router.get("/my-jobs", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can view their job descriptions." })
  }

  try {
    const jobDescriptions = await JobDescription.find({ recruiterId: req.user.id }).sort({ postedDate: -1 })
    res.json(jobDescriptions)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/job-description/all
// @desc    Get all job descriptions (for job seekers to browse)
// @access  Private (Job Seeker, Admin)
router.get("/all", auth, async (req, res) => {
  if (req.user.role !== "job_seeker" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied. Only job seekers and admins can view all job descriptions." })
  }

  try {
    const jobDescriptions = await JobDescription.find({}).sort({ postedDate: -1 })
    res.json(jobDescriptions)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/job-description/:id
// @desc    Get a single job description by ID
// @access  Private (Recruiter, Job Seeker, Admin - with authorization checks)
router.get("/:id", auth, async (req, res) => {
  try {
    const jobDescription = await JobDescription.findById(req.params.id)

    if (!jobDescription) {
      return res.status(404).json({ msg: "Job description not found" })
    }

    // Authorization: Recruiter can view their own job descriptions.
    // Job seeker can view any job description (for browsing/applying).
    // Admin can view any job description.
    if (
      req.user.role === "recruiter" &&
      jobDescription.recruiterId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ msg: "Not authorized to view this job description" })
    }

    res.json(jobDescription)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   PUT /api/job-description/:id
// @desc    Update a job description by ID
// @access  Private (Recruiter)
router.put("/:id", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can update job descriptions." })
  }

  const { title, description, requirements, responsibilities, location, salary, employmentType, skills } = req.body

  try {
    const jobDescription = await JobDescription.findById(req.params.id)

    if (!jobDescription) {
      return res.status(404).json({ msg: "Job description not found" })
    }

    // Ensure recruiter owns the job description
    if (jobDescription.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    jobDescription.title = title || jobDescription.title
    jobDescription.description = description || jobDescription.description
    jobDescription.requirements = requirements || jobDescription.requirements
    jobDescription.responsibilities = responsibilities || jobDescription.responsibilities
    jobDescription.location = location || jobDescription.location
    jobDescription.salary = salary || jobDescription.salary
    jobDescription.employmentType = employmentType || jobDescription.employmentType
    jobDescription.skills = skills || jobDescription.skills

    await jobDescription.save()
    res.json({ msg: "Job description updated successfully", jobDescription })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   DELETE /api/job-description/:id
// @desc    Delete a job description by ID
// @access  Private (Recruiter)
router.delete("/:id", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can delete job descriptions." })
  }

  try {
    const jobDescription = await JobDescription.findById(req.params.id)

    if (!jobDescription) {
      return res.status(404).json({ msg: "Job description not found" })
    }

    // Ensure recruiter owns the job description
    if (jobDescription.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    await JobDescription.deleteOne({ _id: req.params.id })

    res.json({ msg: "Job description removed" })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
