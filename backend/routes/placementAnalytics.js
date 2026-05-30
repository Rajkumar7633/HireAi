const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const StudentTracking = require("../models/StudentTracking")
const JobApplication = require("../models/JobApplication")
const User = require("../models/User")

// @route   GET /api/placement-analytics/:collegeId/overview
// @desc    Get placement readiness overview for college
// @access  Private (College Admin)
router.get("/:collegeId/overview", auth, async (req, res) => {
  if (req.user.role !== "college_admin" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const trackingRecords = await StudentTracking.find({ collegeId: req.params.collegeId })
      .populate("studentId", "name email")

    const overview = {
      totalStudents: trackingRecords.length,
      readyForPlacement: 0,
      needImprovement: 0,
      notReady: 0,
      averageReadinessScore: 0,
      skillGaps: {},
      topPerformers: [],
      atRiskStudents: []
    }

    let totalReadiness = 0

    trackingRecords.forEach(tracking => {
      const readiness = tracking.placementReadiness?.interviewReadiness?.overall || 0
      totalReadiness += readiness

      if (readiness >= 70) {
        overview.readyForPlacement++
      } else if (readiness >= 50) {
        overview.needImprovement++
      } else {
        overview.notReady++
      }

      // Track skill gaps
      tracking.placementReadiness?.skillsGap?.forEach(gap => {
        if (!overview.skillGaps[gap.skill]) {
          overview.skillGaps[gap.skill] = { required: 0, missing: 0 }
        }
        if (gap.required) overview.skillGaps[gap.skill].required++
        else overview.skillGaps[gap.skill].missing++
      })
    })

    overview.averageReadinessScore = trackingRecords.length > 0 
      ? (totalReadiness / trackingRecords.length).toFixed(2)
      : 0

    // Top performers (high CGPA + high readiness)
    overview.topPerformers = trackingRecords
      .filter(t => t.academicInfo.cgpa >= 8.0 && (t.placementReadiness?.interviewReadiness?.overall || 0) >= 70)
      .sort((a, b) => b.academicInfo.cgpa - a.academicInfo.cgpa)
      .slice(0, 10)
      .map(t => ({
        studentId: t.studentId._id,
        name: t.studentId.name,
        email: t.studentId.email,
        cgpa: t.academicInfo.cgpa,
        readiness: t.placementReadiness?.interviewReadiness?.overall || 0
      }))

    // At-risk students (low CGPA + low readiness + critical alerts)
    overview.atRiskStudents = trackingRecords
      .filter(t => 
        (t.academicInfo.cgpa < 6.0 || (t.placementReadiness?.interviewReadiness?.overall || 0) < 50) &&
        t.alerts.some(a => a.severity === "Critical" && !a.resolved)
      )
      .map(t => ({
        studentId: t.studentId._id,
        name: t.studentId.name,
        cgpa: t.academicInfo.cgpa,
        readiness: t.placementReadiness?.interviewReadiness?.overall || 0,
        criticalAlerts: t.alerts.filter(a => a.severity === "Critical" && !a.resolved).length
      }))

    res.json({
      success: true,
      overview
    })
  } catch (error) {
    console.error("Placement analytics overview error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/placement-analytics/:collegeId/skills-heatmap
// @desc    Get skills heatmap showing strong/weak skills by cohort
// @access  Private (College Admin)
router.get("/:collegeId/skills-heatmap", auth, async (req, res) => {
  if (req.user.role !== "college_admin" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const trackingRecords = await StudentTracking.find({ collegeId: req.params.collegeId })

    const heatmap = {
      byYear: {},
      byBranch: {},
      overall: {}
    }

    trackingRecords.forEach(tracking => {
      const year = tracking.academicInfo.currentYear
      const branch = tracking.academicInfo.branch || "Unknown"

      // Initialize year data
      if (!heatmap.byYear[year]) {
        heatmap.byYear[year] = {}
      }

      // Initialize branch data
      if (!heatmap.byBranch[branch]) {
        heatmap.byBranch[branch] = {}
      }

      // Process technical skills
      tracking.skillDevelopment?.technicalSkills?.forEach(skill => {
        const skillName = skill.name.toLowerCase()
        
        // Year-wise
        if (!heatmap.byYear[year][skillName]) {
          heatmap.byYear[year][skillName] = { beginner: 0, intermediate: 0, advanced: 0 }
        }
        heatmap.byYear[year][skillName][skill.level.toLowerCase()]++

        // Branch-wise
        if (!heatmap.byBranch[branch][skillName]) {
          heatmap.byBranch[branch][skillName] = { beginner: 0, intermediate: 0, advanced: 0 }
        }
        heatmap.byBranch[branch][skillName][skill.level.toLowerCase()]++

        // Overall
        if (!heatmap.overall[skillName]) {
          heatmap.overall[skillName] = { beginner: 0, intermediate: 0, advanced: 0 }
        }
        heatmap.overall[skillName][skill.level.toLowerCase()]++
      })
    })

    res.json({
      success: true,
      heatmap
    })
  } catch (error) {
    console.error("Skills heatmap error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/placement-analytics/:collegeId/leaderboard
// @desc    Get leaderboard by batch/branch/skill
// @access  Private (College Admin)
router.get("/:collegeId/leaderboard", auth, async (req, res) => {
  if (req.user.role !== "college_admin" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { type, value } = req.query

  try {
    const trackingRecords = await StudentTracking.find({ collegeId: req.params.collegeId })
      .populate("studentId", "name email")

    let filteredRecords = trackingRecords

    if (type === "year" && value) {
      filteredRecords = trackingRecords.filter(t => t.academicInfo.currentYear === parseInt(value))
    } else if (type === "branch" && value) {
      filteredRecords = trackingRecords.filter(t => t.academicInfo.branch === value)
    } else if (type === "batch" && value) {
      filteredRecords = trackingRecords.filter(t => t.academicInfo.batch === value)
    }

    const leaderboard = filteredRecords
      .map(t => ({
        studentId: t.studentId._id,
        name: t.studentId.name,
        email: t.studentId.email,
        cgpa: t.academicInfo.cgpa || 0,
        readiness: t.placementReadiness?.interviewReadiness?.overall || 0,
        skillsCount: t.skillDevelopment?.technicalSkills?.length || 0,
        projectsCount: t.yearlyProgress?.reduce((sum, y) => sum + (y.projects?.length || 0), 0) || 0,
        certificationsCount: t.yearlyProgress?.reduce((sum, y) => sum + (y.certifications?.length || 0), 0) || 0
      }))
      .sort((a, b) => b.cgpa - a.cgpa)
      .slice(0, 20)

    res.json({
      success: true,
      leaderboard,
      total: leaderboard.length
    })
  } catch (error) {
    console.error("Leaderboard error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/placement-analytics/:collegeId/placement-funnel
// @desc    Get placement funnel analytics
// @access  Private (College Admin)
router.get("/:collegeId/placement-funnel", auth, async (req, res) => {
  if (req.user.role !== "college_admin" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const trackingRecords = await StudentTracking.find({ collegeId: req.params.collegeId })
    const applications = await JobApplication.find({ collegeId: req.params.collegeId })

    const funnel = {
      totalStudents: trackingRecords.length,
      eligible: trackingRecords.filter(t => t.placementStatus?.isEligible).length,
      applied: applications.length,
      shortlisted: applications.filter(a => a.status === "Shortlisted").length,
      testGiven: applications.filter(a => a.status === "Test").length,
      interviewed: applications.filter(a => a.status === "Interview").length,
      offered: applications.filter(a => a.status === "Offer").length,
      placed: trackingRecords.filter(t => t.placementStatus?.placed).length,
      conversionRates: {}
    }

    // Calculate conversion rates
    if (funnel.eligible > 0) {
      funnel.conversionRates.eligibleToApplied = ((funnel.applied / funnel.eligible) * 100).toFixed(2)
    }
    if (funnel.applied > 0) {
      funnel.conversionRates.appliedToShortlisted = ((funnel.shortlisted / funnel.applied) * 100).toFixed(2)
    }
    if (funnel.shortlisted > 0) {
      funnel.conversionRates.shortlistedToTest = ((funnel.testGiven / funnel.shortlisted) * 100).toFixed(2)
    }
    if (funnel.testGiven > 0) {
      funnel.conversionRates.testToInterview = ((funnel.interviewed / funnel.testGiven) * 100).toFixed(2)
    }
    if (funnel.interviewed > 0) {
      funnel.conversionRates.interviewToOffer = ((funnel.offered / funnel.interviewed) * 100).toFixed(2)
    }
    if (funnel.offered > 0) {
      funnel.conversionRates.offerToPlaced = ((funnel.placed / funnel.offered) * 100).toFixed(2)
    }
    if (funnel.totalStudents > 0) {
      funnel.conversionRates.overallPlacementRate = ((funnel.placed / funnel.totalStudents) * 100).toFixed(2)
    }

    res.json({
      success: true,
      funnel
    })
  } catch (error) {
    console.error("Placement funnel error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/placement-analytics/:collegeId/company-performance
// @desc    Get company-wise placement performance
// @access  Private (College Admin)
router.get("/:collegeId/company-performance", auth, async (req, res) => {
  if (req.user.role !== "college_admin" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const trackingRecords = await StudentTracking.find({ collegeId: req.params.collegeId })

    const companyPerformance = {}

    trackingRecords.forEach(tracking => {
      tracking.placementStatus?.offers?.forEach(offer => {
        const companyId = offer.companyId?.toString() || "Unknown"
        if (!companyPerformance[companyId]) {
          companyPerformance[companyId] = {
            companyId,
            offers: 0,
            accepted: 0,
            rejected: 0,
            averagePackage: 0,
            packages: []
          }
        }
        companyPerformance[companyId].offers++
        companyPerformance[companyId].packages.push(offer.package)
        if (offer.accepted) {
          companyPerformance[companyId].accepted++
        } else {
          companyPerformance[companyId].rejected++
        }
      })
    })

    // Calculate average packages
    Object.values(companyPerformance).forEach(company => {
      if (company.packages.length > 0) {
        company.averagePackage = (company.packages.reduce((sum, pkg) => sum + pkg, 0) / company.packages.length).toFixed(2)
      }
      delete company.packages
    })

    const performanceArray = Object.values(companyPerformance).sort((a, b) => b.accepted - a.accepted)

    res.json({
      success: true,
      companyPerformance: performanceArray
    })
  } catch (error) {
    console.error("Company performance error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
