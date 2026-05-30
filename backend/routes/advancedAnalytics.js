const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const JobApplication = require("../models/JobApplication")
const JobDescription = require("../models/JobDescription")
const User = require("../models/User")
const Resume = require("../models/Resume")

// @route   GET /api/analytics/recruiter-dashboard
// @desc    Get advanced analytics for recruiter dashboard
// @access  Private (Recruiter)
router.get("/recruiter-dashboard", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const recruiterId = req.user.id

    // Get all job descriptions by this recruiter
    const jobDescriptions = await JobDescription.find({ recruiterId })
    const jobIds = jobDescriptions.map(j => j._id)

    // Get all applications for these jobs
    const applications = await JobApplication.find({ jobDescriptionId: { $in: jobIds } })
      .populate("userId", "name email")
      .populate("jobDescriptionId", "title")

    // Calculate metrics
    const analytics = {
      overview: {
        totalJobs: jobDescriptions.length,
        totalApplications: applications.length,
        activeJobs: jobDescriptions.filter(j => j.status === "Active").length,
        totalViews: jobDescriptions.reduce((sum, j) => sum + (j.views || 0), 0),
      },
      funnel: {
        applied: applications.length,
        shortlisted: applications.filter(a => a.status === "Shortlisted").length,
        test: applications.filter(a => a.status === "Test").length,
        interview: applications.filter(a => a.status === "Interview").length,
        offer: applications.filter(a => a.status === "Offer").length,
        hired: applications.filter(a => a.status === "Hired").length,
        rejected: applications.filter(a => a.status === "Rejected").length,
      },
      timeToHire: {
        average: 0,
        byJob: []
      },
      sourcePerformance: {},
      conversionRates: {}
    }

    // Calculate time to hire
    const hiredApplications = applications.filter(a => a.status === "Hired" && a.appliedAt)
    if (hiredApplications.length > 0) {
      const totalDays = hiredApplications.reduce((sum, app) => {
        const applied = new Date(app.appliedAt)
        const hired = new Date(app.updatedAt)
        const days = Math.floor((hired - applied) / (1000 * 60 * 60 * 24))
        return sum + days
      }, 0)
      analytics.timeToHire.average = Math.round(totalDays / hiredApplications.length)
    }

    // Calculate conversion rates
    if (analytics.funnel.applied > 0) {
      analytics.conversionRates.applicationToShortlist = (
        (analytics.funnel.shortlisted / analytics.funnel.applied) * 100
      ).toFixed(2)
      analytics.conversionRates.shortlistToInterview = (
        (analytics.funnel.interview / analytics.funnel.shortlisted) * 100
      ).toFixed(2)
      analytics.conversionRates.interviewToOffer = (
        (analytics.funnel.offer / analytics.funnel.interview) * 100
      ).toFixed(2)
      analytics.conversionRates.offerToHire = (
        (analytics.funnel.hired / analytics.funnel.offer) * 100
      ).toFixed(2)
      analytics.conversionRates.overallHireRate = (
        (analytics.funnel.hired / analytics.funnel.applied) * 100
      ).toFixed(2)
    }

    // Job-wise analytics
    analytics.byJob = jobDescriptions.map(job => {
      const jobApplications = applications.filter(a => 
        a.jobDescriptionId._id.toString() === job._id.toString()
      )

      return {
        jobId: job._id,
        jobTitle: job.title,
        applications: jobApplications.length,
        shortlisted: jobApplications.filter(a => a.status === "Shortlisted").length,
        interviewed: jobApplications.filter(a => a.status === "Interview").length,
        offered: jobApplications.filter(a => a.status === "Offer").length,
        hired: jobApplications.filter(a => a.status === "Hired").length,
        views: job.views || 0,
        createdAt: job.createdAt
      }
    })

    res.json({
      success: true,
      analytics
    })
  } catch (error) {
    console.error("Recruiter analytics error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/analytics/timeseries
// @desc    Get time-series analytics data
// @access  Private (Recruiter/Admin)
router.get("/timeseries", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { period = "30d", metric = "applications" } = req.query

  try {
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const recruiterId = req.user.id
    const jobDescriptions = await JobDescription.find({ recruiterId })
    const jobIds = jobDescriptions.map(j => j._id)

    const query = {
      jobDescriptionId: { $in: jobIds },
      createdAt: { $gte: startDate }
    }

    let data = []

    if (metric === "applications") {
      const applications = await JobApplication.find(query)
      data = applications.map(app => ({
        date: app.createdAt,
        value: 1,
        type: "application"
      }))
    } else if (metric === "views") {
      // Aggregate views by date
      const views = await JobDescription.aggregate([
        {
          $match: {
            recruiterId: recruiterId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            totalViews: { $sum: "$views" }
          }
        },
        { $sort: { _id: 1 } }
      ])
      data = views.map(v => ({
        date: v._id,
        value: v.totalViews,
        type: "views"
      }))
    }

    res.json({
      success: true,
      data,
      period,
      metric
    })
  } catch (error) {
    console.error("Time series analytics error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/analytics/skill-demand
// @desc    Get skill demand analytics
// @access  Private (Recruiter/Admin)
router.get("/skill-demand", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const jobDescriptions = await JobDescription.find()
    const skillFrequency = {}

    jobDescriptions.forEach(job => {
      if (job.skills && Array.isArray(job.skills)) {
        job.skills.forEach(skill => {
          const skillLower = skill.toLowerCase()
          skillFrequency[skillLower] = (skillFrequency[skillLower] || 0) + 1
        })
      }
    })

    const sortedSkills = Object.entries(skillFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill, count]) => ({ skill, count }))

    res.json({
      success: true,
      skills: sortedSkills
    })
  } catch (error) {
    console.error("Skill demand analytics error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/analytics/candidate-quality
// @desc    Get candidate quality analytics
// @access  Private (Recruiter/Admin)
router.get("/candidate-quality", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const recruiterId = req.user.id
    const jobDescriptions = await JobDescription.find({ recruiterId })
    const jobIds = jobDescriptions.map(j => j._id)

    const applications = await JobApplication.find({ jobDescriptionId: { $in: jobIds } })
      .populate("userId")

    const qualityMetrics = {
      averageATS: 0,
      atsDistribution: { high: 0, medium: 0, low: 0 },
      skillMatch: {},
      experienceDistribution: {}
    }

    let totalATS = 0
    const atsScores = []

    applications.forEach(app => {
      if (app.atsScore) {
        totalATS += app.atsScore
        atsScores.push(app.atsScore)

        if (app.atsScore >= 70) {
          qualityMetrics.atsDistribution.high++
        } else if (app.atsScore >= 50) {
          qualityMetrics.atsDistribution.medium++
        } else {
          qualityMetrics.atsDistribution.low++
        }
      }

      if (app.matchedSkills && Array.isArray(app.matchedSkills)) {
        app.matchedSkills.forEach(skill => {
          const skillLower = skill.toLowerCase()
          qualityMetrics.skillMatch[skillLower] = (qualityMetrics.skillMatch[skillLower] || 0) + 1
        })
      }
    })

    if (atsScores.length > 0) {
      qualityMetrics.averageATS = (totalATS / atsScores.length).toFixed(2)
    }

    // Sort skills by frequency
    qualityMetrics.topSkills = Object.entries(qualityMetrics.skillMatch)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }))

    res.json({
      success: true,
      qualityMetrics
    })
  } catch (error) {
    console.error("Candidate quality analytics error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
