/**
 * backend/services/applicationService.js
 *
 * Business logic for job applications.
 */

const JobApplication = require("../models/JobApplication")
const JobDescription = require("../models/JobDescription")
const Resume = require("../models/Resume")
const User = require("../models/User")
const Notification = require("../models/Notification")
const sendEmail = require("../utils/emailService")

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeError(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

function emailHtml(heading, body) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2 style="color:#7c3aed">${heading}</h2>
      ${body}
      <p style="color:#888;font-size:12px;margin-top:24px">The HireAI Team</p>
    </div>`
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Submit a new job application.
 */
async function submitApplication({ userId, userEmail, jobDescriptionId, resumeId }) {
  const [jobDescription, resume] = await Promise.all([
    JobDescription.findById(jobDescriptionId),
    Resume.findById(resumeId),
  ])

  if (!jobDescription) throw makeError("Job description not found", 404)
  if (!resume) throw makeError("Resume not found", 404)
  if (resume.userId.toString() !== userId) throw makeError("Resume does not belong to you", 403)

  const existing = await JobApplication.findOne({ jobSeekerId: userId, jobDescriptionId })
  if (existing) throw makeError("You have already applied for this job.")

  const application = await new JobApplication({
    jobSeekerId: userId,
    jobDescriptionId,
    resumeId,
    applicationDate: new Date(),
    status: "Pending",
  }).save()

  // Notify recruiter (non-blocking)
  const recruiter = await User.findById(jobDescription.recruiterId)
  if (recruiter) {
    await Promise.allSettled([
      new Notification({
        userId: recruiter._id,
        type: "application_status_update",
        message: `New application for "${jobDescription.title}" from ${userEmail}.`,
        relatedEntity: { id: application._id, type: "JobApplication" },
      }).save(),
      sendEmail({
        to: recruiter.email,
        subject: `New Application — ${jobDescription.title}`,
        html: emailHtml(
          "New Job Application",
          `<p>Dear ${recruiter.name || "Recruiter"},</p>
           <p>New application for <strong>${jobDescription.title}</strong> from <strong>${userEmail}</strong>.</p>
           <p>Review it in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/recruiter">HireAI Dashboard</a>.</p>`
        ),
      }),
    ])
  }

  return application
}

/**
 * Get all applications for a job seeker.
 */
async function getMyApplications({ userId }) {
  return JobApplication.find({ jobSeekerId: userId })
    .populate("jobDescriptionId", "title location employmentType")
    .populate("resumeId", "filename")
    .sort({ applicationDate: -1 })
    .lean()
}

/**
 * Get all applications for a specific job (recruiter view).
 */
async function getApplicationsForJob({ jobId, recruiterId }) {
  const jobDescription = await JobDescription.findById(jobId)
  if (!jobDescription) throw makeError("Job description not found", 404)
  if (jobDescription.recruiterId.toString() !== recruiterId) {
    throw makeError("Not authorized to view these applications", 403)
  }

  return JobApplication.find({ jobDescriptionId: jobId })
    .populate("jobSeekerId", "name email profileImage")
    .populate("resumeId", "filename")
    .sort({ applicationDate: 1 })
    .lean()
}

/**
 * Update application status (recruiter only).
 */
async function updateApplicationStatus({ applicationId, recruiterId, status }) {
  const application = await JobApplication.findById(applicationId)
    .populate("jobSeekerId", "email name")
    .populate("jobDescriptionId", "title recruiterId")

  if (!application) throw makeError("Application not found", 404)

  const jd = application.jobDescriptionId
  if (!jd || jd.recruiterId?.toString() !== recruiterId) {
    throw makeError("Not authorized to update this application", 403)
  }

  application.status = status
  await application.save()

  // Notify job seeker
  const seekerId = application.jobSeekerId?._id
  const seekerEmail = application.jobSeekerId?.email
  const seekerName = application.jobSeekerId?.name

  if (seekerId) {
    await Promise.allSettled([
      new Notification({
        userId: seekerId,
        type: "application_status_update",
        message: `Your application for "${jd.title}" is now: ${status}.`,
        relatedEntity: { id: application._id, type: "JobApplication" },
      }).save(),
      sendEmail({
        to: seekerEmail,
        subject: `Application Update — ${jd.title}`,
        html: emailHtml(
          "Application Status Update",
          `<p>Dear ${seekerName || "Applicant"},</p>
           <p>Your application for <strong>${jd.title}</strong> has been updated to: <strong>${status}</strong>.</p>
           <p>Check your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/job-seeker/applications">HireAI Dashboard</a> for details.</p>`
        ),
      }),
    ])
  }

  return application
}

/**
 * Get a single application by ID (role-aware).
 */
async function getApplicationById({ applicationId, userId, userRole }) {
  const application = await JobApplication.findById(applicationId)
    .populate("jobSeekerId", "name email")
    .populate("jobDescriptionId", "title recruiterId")
    .populate("resumeId", "filename")
    .populate("testId", "title durationMinutes")

  if (!application) throw makeError("Application not found", 404)

  const isOwner = application.jobSeekerId?._id?.toString() === userId
  const isRecruiter = application.jobDescriptionId?.recruiterId?.toString() === userId

  if (userRole === "job_seeker" && !isOwner) throw makeError("Not authorized", 403)
  if (userRole === "recruiter" && !isRecruiter) throw makeError("Not authorized", 403)

  return application
}

module.exports = {
  submitApplication,
  getMyApplications,
  getApplicationsForJob,
  updateApplicationStatus,
  getApplicationById,
}
