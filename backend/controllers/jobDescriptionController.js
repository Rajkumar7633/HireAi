/**
 * backend/controllers/jobDescriptionController.js
 *
 * HTTP layer for job description routes.
 */

const jobDescriptionService = require("../services/jobDescriptionService")

function handleError(res, err) {
  const status = err.statusCode || 500
  if (status >= 500) console.error("[jobDescriptionController]", err)
  return res.status(status).json({ msg: err.message || "Internal server error" })
}

// POST /api/job-description/generate
async function generateJobDescription(req, res) {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Only recruiters can generate job descriptions." })
  }
  try {
    const generated = await jobDescriptionService.generateJobDescription(req.body)
    res.json({ generated })
  } catch (err) {
    handleError(res, err)
  }
}

// POST /api/job-description
async function createJobDescription(req, res) {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Only recruiters can create job descriptions." })
  }
  try {
    const jd = await jobDescriptionService.createJobDescription({
      recruiterId: req.user.id,
      data: req.body,
    })
    res.status(201).json({ msg: "Job description created successfully", jobDescription: jd })
  } catch (err) {
    handleError(res, err)
  }
}

// GET /api/job-description/my-jobs
async function getMyJobs(req, res) {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Only recruiters can view their job descriptions." })
  }
  try {
    const jobs = await jobDescriptionService.getMyJobs({ recruiterId: req.user.id })
    res.json(jobs)
  } catch (err) {
    handleError(res, err)
  }
}

// GET /api/job-description/all
async function getAllJobs(req, res) {
  if (req.user.role !== "job_seeker" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied." })
  }
  try {
    const jobs = await jobDescriptionService.getAllJobs({ userRole: req.user.role })
    res.json(jobs)
  } catch (err) {
    handleError(res, err)
  }
}

// GET /api/job-description/:id
async function getJobById(req, res) {
  try {
    const jd = await jobDescriptionService.getJobById({
      jobId: req.params.id,
      userId: req.user.id,
      userRole: req.user.role,
    })
    res.json(jd)
  } catch (err) {
    handleError(res, err)
  }
}

// PUT /api/job-description/:id
async function updateJobDescription(req, res) {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Only recruiters can update job descriptions." })
  }
  try {
    const jd = await jobDescriptionService.updateJobDescription({
      jobId: req.params.id,
      recruiterId: req.user.id,
      data: req.body,
    })
    res.json({ msg: "Job description updated successfully", jobDescription: jd })
  } catch (err) {
    handleError(res, err)
  }
}

// DELETE /api/job-description/:id
async function deleteJobDescription(req, res) {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Only recruiters can delete job descriptions." })
  }
  try {
    await jobDescriptionService.deleteJobDescription({
      jobId: req.params.id,
      recruiterId: req.user.id,
    })
    res.json({ msg: "Job description removed" })
  } catch (err) {
    handleError(res, err)
  }
}

module.exports = {
  generateJobDescription,
  createJobDescription,
  getMyJobs,
  getAllJobs,
  getJobById,
  updateJobDescription,
  deleteJobDescription,
}
