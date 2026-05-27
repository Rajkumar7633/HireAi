/**
 * backend/routes/recruiterAgent.js
 * Router for the Autonomous AI Recruiter Agent.
 */
const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const Match = require("../models/Match")
const Resume = require("../models/Resume")
const JobApplication = require("../models/JobApplication")
const JobDescription = require("../models/JobDescription")
const Test = require("../models/Test")
const User = require("../models/User")
const Notification = require("../models/Notification")
const sendEmail = require("../utils/emailService")

// @route   POST /api/recruiter-agent/run
// @desc    Run the Recruiter Agent to auto-shortlist and auto-invite top matches
// @access  Private (Recruiter)
router.post("/run", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can run automation agents." })
  }

  const { jobId, minScore = 70, testId } = req.body
  if (!jobId) {
    return res.status(400).json({ msg: "jobId is required" })
  }

  try {
    const job = await JobDescription.findById(jobId)
    if (!job || job.recruiterId.toString() !== req.user.id) {
      return res.status(404).json({ msg: "Job description not found or unauthorized" })
    }

    // Find all matches where score is above minScore
    const matches = await Match.find({
      jobDescriptionId: jobId,
      matchScore: { $gte: minScore },
    }).populate({
      path: "resumeId",
      select: "userId filename",
    })

    let matchedCandidatesCount = matches.length
    let invitedCandidatesCount = 0
    let shortlistedCandidatesCount = 0
    const processedActions = []

    // Fetch details of the test if provided
    let test = null
    if (testId) {
      test = await Test.findById(testId)
      if (!test) {
        return res.status(404).json({ msg: "Target test not found for assignment" })
      }
    }

    for (const match of matches) {
      if (!match.resumeId || !match.resumeId.userId) continue

      const candidateId = match.resumeId.userId
      const candidate = await User.findById(candidateId)
      if (!candidate) continue

      // Find or create JobApplication
      let application = await JobApplication.findOne({
        jobSeekerId: candidateId,
        jobDescriptionId: jobId,
      })

      let wasCreated = false
      if (!application) {
        application = new JobApplication({
          jobSeekerId: candidateId,
          jobDescriptionId: jobId,
          resumeId: match.resumeId._id,
          status: "Pending",
        })
        wasCreated = true
      }

      let action = "shortlisted"

      // If test is provided, auto-assign test and change status
      if (test) {
        application.testId = test._id
        application.status = "Test Assigned"
        application.currentStage = "coding_round"

        // Ensure rounds array exists
        if (!Array.isArray(application.rounds)) {
          application.rounds = []
        }

        const existingRound = application.rounds.find((r) => r.stageKey === "coding_round")
        if (!existingRound) {
          application.rounds.push({
            roundName: "Coding assessment",
            stageKey: "coding_round",
            testId: test._id,
            status: "pending",
          })
        }

        action = "invited_to_test"
        invitedCandidatesCount++
      } else {
        // Just auto-shortlist
        if (application.status === "Pending") {
          application.status = "Reviewed"
        }
        shortlistedCandidatesCount++
      }

      await application.save()

      // Create system notification for candidate
      const notificationMessage = test
        ? `You have been selected by our autonomous agent for the "${job.title}" role. Please complete your coding test: "${test.title}".`
        : `Your profile matches the "${job.title}" role! The recruiter has shortlisted your application.`

      await new Notification({
        userId: candidateId,
        title: test ? "Assigned Coding Assessment" : "Application Shortlisted",
        message: notificationMessage,
        type: "application",
      }).save()

      // Send email notification
      try {
        await sendEmail({
          to: candidate.email,
          subject: test ? `Coding Assessment Invitation: ${job.title}` : `Application Update: ${job.title}`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #6d28d9;">Hi ${candidate.name},</h2>
              <p>${notificationMessage}</p>
              <br />
              <p>Log in to your <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard" style="color: #4f46e5; font-weight: bold;">HireAI Dashboard</a> to view details.</p>
              <p>Best regards,<br/>The ${process.env.NEXT_PUBLIC_COMPANY_NAME || "HireAI"} Recruiter Team</p>
            </div>
          `,
        })
      } catch (emailErr) {
        console.error(`Failed to send email to candidate ${candidate.email}:`, emailErr.message)
      }

      processedActions.push({
        candidateId,
        name: candidate.name,
        email: candidate.email,
        matchScore: match.matchScore,
        action,
        wasCreated,
      })
    }

    res.json({
      status: "success",
      matchedCandidatesCount,
      shortlistedCandidatesCount,
      invitedCandidatesCount,
      actions: processedActions,
    })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
