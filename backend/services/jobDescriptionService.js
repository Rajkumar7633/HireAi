/**
 * backend/services/jobDescriptionService.js
 *
 * Business logic for job descriptions.
 */

const JobDescription = require("../models/JobDescription")

function makeError(message, statusCode = 400) {
  const err = new Error(message)
  err.statusCode = statusCode
  return err
}

/**
 * Create a new job description.
 */
async function createJobDescription({ recruiterId, data }) {
  const { title, description, requirements, responsibilities, location, salary, employmentType, skills } = data

  if (!title || !description || !requirements || !responsibilities || !location || !employmentType || !skills) {
    throw makeError("Please provide all required fields: title, description, requirements, responsibilities, location, employmentType, skills")
  }

  const jd = await new JobDescription({
    recruiterId,
    title,
    description,
    requirements,
    responsibilities,
    location,
    salary,
    employmentType,
    skills,
    postedDate: new Date(),
  }).save()

  return jd
}

/**
 * Get all job descriptions posted by a specific recruiter.
 */
async function getMyJobs({ recruiterId }) {
  return JobDescription.find({ recruiterId })
    .sort({ postedDate: -1 })
    .lean()
}

/**
 * Get all active job descriptions (for job seekers to browse).
 */
async function getAllJobs({ userRole } = {}) {
  const query = userRole === "job_seeker"
    ? {
        $and: [
          { $or: [{ isActive: { $exists: false } }, { isActive: true }] },
          { $or: [{ status: { $exists: false } }, { status: { $ne: "inactive" } }] },
        ],
      }
    : {}

  return JobDescription.find(query)
    .sort({ postedDate: -1 })
    .lean()
}

/**
 * Get a single job description by ID (with role-based auth).
 */
async function getJobById({ jobId, userId, userRole }) {
  const jd = await JobDescription.findById(jobId)
  if (!jd) throw makeError("Job description not found", 404)

  // Recruiters can only see their own jobs
  if (userRole === "recruiter" && jd.recruiterId.toString() !== userId) {
    throw makeError("Not authorized to view this job description", 403)
  }

  return jd
}

/**
 * Update a job description (recruiter-only, ownership enforced).
 */
async function updateJobDescription({ jobId, recruiterId, data }) {
  const jd = await JobDescription.findById(jobId)
  if (!jd) throw makeError("Job description not found", 404)
  if (jd.recruiterId.toString() !== recruiterId) throw makeError("Not authorized", 403)

  const fields = ["title", "description", "requirements", "responsibilities", "location", "salary", "employmentType", "skills"]
  fields.forEach((f) => { if (data[f] !== undefined) jd[f] = data[f] })

  await jd.save()
  return jd
}

/**
 * Delete a job description (recruiter-only, ownership enforced).
 */
async function deleteJobDescription({ jobId, recruiterId }) {
  const jd = await JobDescription.findById(jobId)
  if (!jd) throw makeError("Job description not found", 404)
  if (jd.recruiterId.toString() !== recruiterId) throw makeError("Not authorized", 403)

  await JobDescription.deleteOne({ _id: jobId })
}

/**
 * Generate a job description using Gemini AI.
 */
async function generateJobDescription({ jobTitle, company, keyRequirements, location, employmentType }) {
  if (!jobTitle) throw makeError("jobTitle is required")
  if (!process.env.GEMINI_API_KEY) throw makeError("AI service not configured", 503)

  const prompt = `You are an expert HR professional. Write a complete, professional job description.

Job Title: ${jobTitle}
Company: ${company || "Our Company"}
Location: ${location || "Remote"}
Employment Type: ${employmentType || "Full-time"}
Key Requirements: ${keyRequirements || "Not specified"}

Return a JSON object with EXACTLY these fields:
{
  "title": "${jobTitle}",
  "description": "2-3 sentence overview",
  "responsibilities": ["5-7 specific responsibilities"],
  "requirements": ["5-6 specific requirements"],
  "skills": ["6-8 skills"],
  "benefits": ["4-5 benefits"],
  "employmentType": "${employmentType || "Full-time"}",
  "location": "${location || "Remote"}"
}

Return only valid JSON.`

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-1.5-pro"}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
        responseMimeType: "application/json",
      }
    }),
    signal: AbortSignal.timeout(25_000),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => "")
    console.error("Gemini API error:", errText)
    throw makeError("AI service error. Please try again.", 502)
  }

  const data = await response.json()
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) throw makeError("AI returned empty response", 502)

  return JSON.parse(content)
}

module.exports = {
  createJobDescription,
  getMyJobs,
  getAllJobs,
  getJobById,
  updateJobDescription,
  deleteJobDescription,
  generateJobDescription,
}
