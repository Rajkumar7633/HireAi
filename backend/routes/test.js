const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const Test = require("../models/Test")
const JobApplication = require("../models/JobApplication")
const Notification = require("../models/Notification")
const sendEmail = require("../utils/emailService")
const User = require("../models/User")

// @route   POST /api/tests
// @desc    Create a new test
// @access  Private (Recruiter)
router.post("/", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can create tests." })
  }

  const { title, description, questions, durationMinutes } = req.body

  if (!title || !questions || !durationMinutes) {
    return res.status(400).json({ msg: "Please provide title, questions, and duration for the test." })
  }

  try {
    const newTest = new Test({
      recruiterId: req.user.id,
      title,
      description,
      questions,
      durationMinutes,
      createdAt: new Date(),
    })

    await newTest.save()
    res.json({ msg: "Test created successfully", test: newTest })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/tests/my-tests
// @desc    Get all tests created by the authenticated recruiter
// @access  Private (Recruiter)
router.get("/my-tests", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can view their tests." })
  }

  try {
    const tests = await Test.find({ recruiterId: req.user.id }).sort({ createdAt: -1 })
    res.json(tests)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/tests/:id
// @desc    Get a single test by ID
// @access  Private (Recruiter who created it, or Job Seeker assigned to it, Admin)
router.get("/:id", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)

    if (!test) {
      return res.status(404).json({ msg: "Test not found" })
    }

    // Authorization:
    // Recruiter can view their own tests.
    // Job seeker can view tests assigned to them.
    // Admin can view any test.
    const isRecruiterTest = test.recruiterId.toString() === req.user.id
    const isJobSeekerAssigned = await JobApplication.exists({
      jobSeekerId: req.user.id,
      testId: req.params.id,
    })

    if (req.user.role === "recruiter" && !isRecruiterTest) {
      return res.status(401).json({ msg: "Not authorized to view this test" })
    }
    if (req.user.role === "job_seeker" && !isJobSeekerAssigned) {
      return res.status(401).json({ msg: "Not authorized to view this test" })
    }
    if (req.user.role === "admin") {
      // Admin can view
    } else if (!isRecruiterTest && !isJobSeekerAssigned) {
      return res.status(401).json({ msg: "Not authorized to view this test" })
    }

    res.json(test)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   PUT /api/tests/:id
// @desc    Update a test by ID
// @access  Private (Recruiter)
router.put("/:id", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can update tests." })
  }

  const { title, description, questions, durationMinutes } = req.body

  try {
    const test = await Test.findById(req.params.id)

    if (!test) {
      return res.status(404).json({ msg: "Test not found" })
    }

    // Ensure recruiter owns the test
    if (test.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    test.title = title || test.title
    test.description = description || test.description
    test.questions = questions || test.questions
    test.durationMinutes = durationMinutes || test.durationMinutes

    await test.save()
    res.json({ msg: "Test updated successfully", test })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   DELETE /api/tests/:id
// @desc    Delete a test by ID
// @access  Private (Recruiter)
router.delete("/:id", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can delete tests." })
  }

  try {
    const test = await Test.findById(req.params.id)

    if (!test) {
      return res.status(404).json({ msg: "Test not found" })
    }

    // Ensure recruiter owns the test
    if (test.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    await Test.deleteOne({ _id: req.params.id })

    res.json({ msg: "Test removed" })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/applications/:id/assign-test
// @desc    Assign a test to a job application
// @access  Private (Recruiter)
router.post("/applications/:id/assign-test", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can assign tests." })
  }

  const { testId } = req.body

  try {
    const application = await JobApplication.findById(req.params.id)
      .populate("jobSeekerId", "email name")
      .populate("jobDescriptionId", "title recruiterId")

    if (!application) {
      return res.status(404).json({ msg: "Application not found" })
    }

    // Ensure recruiter owns the job description associated with this application
    if (application.jobDescriptionId.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to assign test to this application" })
    }

    const test = await Test.findById(testId)
    if (!test) {
      return res.status(404).json({ msg: "Test not found" })
    }

    application.testId = test._id
    application.status = "Test Assigned"
    await application.save()

    // Notify job seeker
    const jobSeeker = await User.findById(application.jobSeekerId._id)
    if (jobSeeker) {
      const notification = new Notification({
        userId: jobSeeker._id,
        type: "test_assigned",
        message: `A new test "${test.title}" has been assigned for your application to "${application.jobDescriptionId.title}".`,
        relatedEntity: {
          id: application._id,
          type: "JobApplication",
        },
      })
      await notification.save()

      await sendEmail({
        to: jobSeeker.email,
        subject: `Test Assigned for Your Application to "${application.jobDescriptionId.title}"`,
        html: `<p>Dear ${jobSeeker.name || "Applicant"},</p>
               <p>A new test, <strong>${test.title}</strong>, has been assigned for your application to <strong>${application.jobDescriptionId.title}</strong>.</p>
               <p>Please log in to your HireAI dashboard to take the test.</p>
               <p>Best regards,<br>The HireAI Team</p>`,
      })
    }

    res.json({ msg: "Test assigned successfully", application })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/applications/:id/submit-test
// @desc    Submit a test for a job application
// @access  Private (Job Seeker)
router.post("/applications/:id/submit-test", auth, async (req, res) => {
  if (req.user.role !== "job_seeker") {
    return res.status(403).json({ msg: "Access denied. Only job seekers can submit tests." })
  }

  const { answers } = req.body // answers should be an array of { questionId, answer }

  try {
    const application = await JobApplication.findById(req.params.id)
      .populate("jobSeekerId", "email name")
      .populate("jobDescriptionId", "title recruiterId")
      .populate("testId")

    if (!application) {
      return res.status(404).json({ msg: "Application not found" })
    }

    if (application.jobSeekerId._id.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to submit test for this application" })
    }

    if (!application.testId) {
      return res.status(400).json({ msg: "No test assigned to this application" })
    }

    // Simulate scoring
    let score = 0
    const totalPoints = application.testId.questions.reduce((sum, q) => sum + q.points, 0)

    for (const question of application.testId.questions) {
      const submittedAnswer = answers.find((a) => a.questionId === question._id.toString())
      if (submittedAnswer) {
        if (question.type === "multiple_choice") {
          // For multiple choice, check if submitted answer matches correct answer
          if (Array.isArray(question.correctAnswer)) {
            // If multiple correct options
            const submittedSet = new Set(submittedAnswer.answer)
            const correctSet = new Set(question.correctAnswer)
            const isCorrect =
              submittedSet.size === correctSet.size && [...submittedSet].every((val) => correctSet.has(val))
            if (isCorrect) {
              score += question.points
            }
          } else {
            // Single correct option
            if (submittedAnswer.answer === question.correctAnswer) {
              score += question.points
            }
          }
        } else if (question.type === "short_answer" || question.type === "code_snippet") {
          // For short answer/code snippet, a simple check or manual review is needed.
          // For simulation, let's give partial points if answer is not empty.
          if (submittedAnswer.answer && submittedAnswer.answer.trim() !== "") {
            score += question.points * 0.5 // Give half points for submission
          }
        }
      }
    }

    const percentageScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0

    application.testScore = percentageScore
    application.status = "Reviewed" // Or "Test Completed"
    await application.save()

    // Notify recruiter
    const recruiter = await User.findById(application.jobDescriptionId.recruiterId)
    if (recruiter) {
      const notification = new Notification({
        userId: recruiter._id,
        type: "test_completed",
        message: `Test "${application.testId.title}" completed by ${application.jobSeekerId.name || application.jobSeekerId.email} for application to "${application.jobDescriptionId.title}". Score: ${percentageScore}%.`,
        relatedEntity: {
          id: application._id,
          type: "JobApplication",
        },
      })
      await notification.save()

      await sendEmail({
        to: recruiter.email,
        subject: `Test Completed for Application to "${application.jobDescriptionId.title}"`,
        html: `<p>Dear ${recruiter.name || "Recruiter"},</p>
               <p>The test <strong>"${application.testId.title}"</strong> has been completed by ${application.jobSeekerId.name || application.jobSeekerId.email} for the application to <strong>${application.jobDescriptionId.title}</strong>.</p>
               <p>Score: <strong>${percentageScore}%</strong></p>
               <p>Please log in to your HireAI dashboard to review the results.</p>
               <p>Best regards,<br>The HireAI Team</p>`,
      })
    }

    res.json({ msg: "Test submitted successfully", application, score: percentageScore })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/applications/:id/schedule-interview
// @desc    Schedule an interview for a job application
// @access  Private (Recruiter)
router.post("/applications/:id/schedule-interview", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can schedule interviews." })
  }

  const { interviewDate, interviewDetails } = req.body

  if (!interviewDate) {
    return res.status(400).json({ msg: "Interview date is required." })
  }

  try {
    const application = await JobApplication.findById(req.params.id)
      .populate("jobSeekerId", "email name")
      .populate("jobDescriptionId", "title recruiterId")

    if (!application) {
      return res.status(404).json({ msg: "Application not found" })
    }

    // Ensure recruiter owns the job description associated with this application
    if (application.jobDescriptionId.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to schedule interview for this application" })
    }

    application.interviewDate = new Date(interviewDate)
    application.status = "Interview Scheduled"
    application.interviewFeedback = interviewDetails // Store details here for simplicity
    await application.save()

    // Notify job seeker
    const jobSeeker = await User.findById(application.jobSeekerId._id)
    if (jobSeeker) {
      const notification = new Notification({
        userId: jobSeeker._id,
        type: "interview_scheduled",
        message: `An interview has been scheduled for your application to "${application.jobDescriptionId.title}" on ${new Date(interviewDate).toLocaleString()}.`,
        relatedEntity: {
          id: application._id,
          type: "JobApplication",
        },
      })
      await notification.save()

      await sendEmail({
        to: jobSeeker.email,
        subject: `Interview Scheduled for Your Application to "${application.jobDescriptionId.title}"`,
        html: `<p>Dear ${jobSeeker.name || "Applicant"},</p>
               <p>An interview has been scheduled for your application to <strong>${application.jobDescriptionId.title}</strong>.</p>
               <p>Date & Time: <strong>${new Date(interviewDate).toLocaleString()}</strong></p>
               <p>Details: ${interviewDetails || "No additional details provided."}</p>
               <p>Please check your HireAI dashboard for more information.</p>
               <p>Best regards,<br>The HireAI Team</p>`,
      })
    }

    res.json({ msg: "Interview scheduled successfully", application })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/applications/:id/interview-feedback
// @desc    Submit interview feedback for a job application
// @access  Private (Recruiter)
router.post("/applications/:id/interview-feedback", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can submit interview feedback." })
  }

  const { feedback, newStatus } = req.body

  try {
    const application = await JobApplication.findById(req.params.id)
      .populate("jobSeekerId", "email name")
      .populate("jobDescriptionId", "title recruiterId")

    if (!application) {
      return res.status(404).json({ msg: "Application not found" })
    }

    // Ensure recruiter owns the job description associated with this application
    if (application.jobDescriptionId.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to submit feedback for this application" })
    }

    application.interviewFeedback = feedback
    if (newStatus) {
      application.status = newStatus
    }
    await application.save()

    // Notify job seeker about feedback/status change
    const jobSeeker = await User.findById(application.jobSeekerId._id)
    if (jobSeeker) {
      const notification = new Notification({
        userId: jobSeeker._id,
        type: "interview_feedback",
        message: `Interview feedback received for your application to "${application.jobDescriptionId.title}". Status: ${newStatus || application.status}.`,
        relatedEntity: {
          id: application._id,
          type: "JobApplication",
        },
      })
      await notification.save()

      await sendEmail({
        to: jobSeeker.email,
        subject: `Interview Feedback for Your Application to "${application.jobDescriptionId.title}"`,
        html: `<p>Dear ${jobSeeker.name || "Applicant"},</p>
               <p>Interview feedback has been submitted for your application to <strong>${application.jobDescriptionId.title}</strong>.</p>
               <p>New Status: <strong>${newStatus || application.status}</strong></p>
               <p>Please check your HireAI dashboard for more details.</p>
               <p>Best regards,<br>The HireAI Team</p>`,
      })
    }

    res.json({ msg: "Interview feedback submitted successfully", application })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
