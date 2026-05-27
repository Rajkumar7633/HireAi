/**
 * backend/controllers/applicationController.js
 *
 * HTTP layer for job application routes.
 */

const applicationService = require("../services/applicationService")

function handleError(res, err) {
  const status = err.statusCode || 500
  if (status >= 500) console.error("[applicationController]", err)
  return res.status(status).json({ message: err.message || "Internal server error" })
}

// POST /api/applications
async function submitApplication(req, res) {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Only job seekers can submit applications." })
  }
  try {
    const application = await applicationService.submitApplication({
      userId: req.user.id,
      userEmail: req.user.email,
      jobDescriptionId: req.body.jobDescriptionId,
      resumeId: req.body.resumeId,
    })
    res.status(201).json({ msg: "Application submitted successfully", application })
  } catch (err) {
    handleError(res, err)
  }
}

// GET /api/applications/my-applications
async function getMyApplications(req, res) {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Only job seekers can view their applications." })
  }
  try {
    const applications = await applicationService.getMyApplications({ userId: req.user.id })
    res.json(applications)
  } catch (err) {
    handleError(res, err)
  }
}

// GET /api/applications/job/:jobId
async function getApplicationsForJob(req, res) {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Only recruiters can view job applications." })
  }
  try {
    const applications = await applicationService.getApplicationsForJob({
      jobId: req.params.jobId,
      recruiterId: req.user.id,
    })
    res.json(applications)
  } catch (err) {
    handleError(res, err)
  }
}

// PUT /api/applications/:id/status
async function updateApplicationStatus(req, res) {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Only recruiters can update application status." })
  }
  try {
    const application = await applicationService.updateApplicationStatus({
      applicationId: req.params.id,
      recruiterId: req.user.id,
      status: req.body.status,
    })
    res.json({ msg: "Application status updated successfully", application })
  } catch (err) {
    handleError(res, err)
  }
}

// GET /api/applications/:id
async function getApplicationById(req, res) {
  try {
    const application = await applicationService.getApplicationById({
      applicationId: req.params.id,
      userId: req.user.id,
      userRole: req.user.role,
    })
    res.json(application)
  } catch (err) {
    handleError(res, err)
  }
}

module.exports = {
  submitApplication,
  getMyApplications,
  getApplicationsForJob,
  updateApplicationStatus,
  getApplicationById,
}
