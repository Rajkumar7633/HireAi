const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const Test = require("../models/Test")
const JobApplication = require("../models/JobApplication")
const Notification = require("../models/Notification")
const sendEmail = require("../utils/emailService")
const User = require("../models/User")
const TestSubmission = require("../models/TestSubmission")

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

// @route   GET /api/tests/:id/submissions
// @desc    Get all submissions for a specific test (recruiter who owns the test or admin)
// @access  Private (Recruiter/Admin)
router.get("/:id/submissions", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
    if (!test) {
      return res.status(404).json({ msg: "Test not found" })
    }

    // Recruiter can only see their own tests, admin can see all
    if (req.user.role === "recruiter" && test.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to view submissions for this test" })
    }

    const submissions = await TestSubmission.find({ testId: req.params.id })
      .populate("candidateId", "name email")
      .populate("applicationId", "status testScore")
      .sort({ createdAt: -1 })

    res.json(submissions)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/tests/:id/analytics
// @desc    Get basic analytics for a specific test (attempts, average score, pass rate)
// @access  Private (Recruiter/Admin)
router.get("/:id/analytics", auth, async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
    if (!test) {
      return res.status(404).json({ msg: "Test not found" })
    }

    if (req.user.role === "recruiter" && test.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to view analytics for this test" })
    }

    const submissions = await TestSubmission.find({ testId: req.params.id })

    const totalAttempts = submissions.length
    const totalScoreSum = submissions.reduce((sum, s) => sum + (s.percentage || 0), 0)
    const averageScore = totalAttempts > 0 ? Math.round(totalScoreSum / totalAttempts) : 0
    const passCount = submissions.filter((s) => (s.percentage || 0) >= 70).length
    const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0
    const avgPlagiarismScore =
      totalAttempts > 0
        ? Math.round(
            submissions.reduce((sum, s) => sum + (s.plagiarismScore || 0), 0) / totalAttempts
          )
        : 0

    res.json({
      testId: test._id,
      title: test.title,
      totalAttempts,
      averageScore,
      passRate,
      avgPlagiarismScore,
    })
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

  const { answers } = req.body // answers should be an array of { questionId, answer, language? }

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

    // Scoring + submission capture
    let score = 0
    const totalPoints = application.testId.questions.reduce((sum, q) => sum + q.points, 0)

    const detailedAnswers = []

    for (const question of application.testId.questions) {
      const submittedAnswer = answers.find((a) => a.questionId === question._id.toString())
      if (!submittedAnswer) {
        continue
      }

      let questionScore = 0
      let passedTestCases = 0
      let totalTestCases = 0

      if (question.type === "multiple_choice") {
        // For multiple choice, check if submitted answer matches correct answer
        if (Array.isArray(question.correctAnswer)) {
          const submittedSet = new Set(submittedAnswer.answer)
          const correctSet = new Set(question.correctAnswer)
          const isCorrect =
            submittedSet.size === correctSet.size && [...submittedSet].every((val) => correctSet.has(val))
          if (isCorrect) {
            questionScore = question.points
          }
        } else {
          if (submittedAnswer.answer === question.correctAnswer) {
            questionScore = question.points
          }
        }
      } else if (question.type === "short_answer") {
        // Simple heuristic: give half points if non-empty
        if (submittedAnswer.answer && submittedAnswer.answer.trim() !== "") {
          questionScore = question.points * 0.5
        }
      } else if (question.type === "code_snippet") {
        // For now, simulate test-case execution: reward half points if answer is non-empty.
        // Later this can be replaced with real code execution & per-test-case scoring.
        if (submittedAnswer.answer && submittedAnswer.answer.trim() !== "") {
          questionScore = question.points * 0.5
        }

        if (Array.isArray(question.testCases) && question.testCases.length > 0) {
          totalTestCases = question.testCases.length
          // Mark all as passed for now when code is present; this is just a placeholder
          passedTestCases = submittedAnswer.answer && submittedAnswer.answer.trim() !== "" ? totalTestCases : 0
        }
      }

      score += questionScore

      detailedAnswers.push({
        questionId: question._id,
        questionType: question.type,
        answer: submittedAnswer.answer,
        language: submittedAnswer.language,
        passedTestCases,
        totalTestCases,
        score: questionScore,
      })
    }

    const percentageScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0

    // Save aggregate score on application (existing behavior)
    application.testScore = percentageScore
    application.status = "Reviewed" // Or "Test Completed"
    await application.save()

    // Persist detailed submission for recruiter analytics and review
    const submission = new TestSubmission({
      testId: application.testId._id,
      applicationId: application._id,
      candidateId: application.jobSeekerId._id,
      recruiterId: application.jobDescriptionId.recruiterId,
      answers: detailedAnswers,
      totalScore: score,
      percentage: percentageScore,
      status: "completed",
      plagiarismScore: 0,
      plagiarismFlags: [],
      startedAt: new Date(),
      submittedAt: new Date(),
    })

    await submission.save()

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

    res.json({ msg: "Test submitted successfully", application, score: percentageScore, submissionId: submission._id })
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
