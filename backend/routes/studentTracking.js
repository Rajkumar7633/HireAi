const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const StudentTracking = require("../models/StudentTracking")
const User = require("../models/User")

// @route   POST /api/student-tracking/create
// @desc    Create or update student tracking record
// @access  Private (College Admin)
router.post("/create", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied. Only college admins can create student tracking records." })
  }

  const {
    studentId,
    collegeId,
    academicInfo,
    yearlyProgress,
    placementReadiness,
    skillDevelopment,
  } = req.body

  try {
    if (!studentId) {
      return res.status(400).json({ msg: "Student ID is required" })
    }

    // Check if student exists
    const student = await User.findById(studentId)
    if (!student) {
      return res.status(404).json({ msg: "Student not found" })
    }

    // Check if tracking record already exists
    let tracking = await StudentTracking.findOne({ studentId })

    if (tracking) {
      // Update existing record
      Object.keys(req.body).forEach(key => {
        if (key !== "studentId" && key !== "collegeId") {
          tracking[key] = req.body[key]
        }
      })
      
      tracking.history.push({
        action: "Updated",
        performedBy: req.user.id,
        timestamp: Date.now(),
        details: { message: "Student tracking record updated" }
      })
    } else {
      // Create new record
      tracking = new StudentTracking({
        studentId,
        collegeId,
        academicInfo,
        yearlyProgress,
        placementReadiness,
        skillDevelopment,
        history: [{
          action: "Created",
          performedBy: req.user.id,
          timestamp: Date.now(),
          details: { message: "Student tracking record created" }
        }]
      })
    }

    await tracking.save()

    res.json({
      success: true,
      tracking,
      msg: tracking.isNew ? "Student tracking record created successfully" : "Student tracking record updated successfully"
    })
  } catch (error) {
    console.error("Student tracking creation error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/student-tracking/student/:studentId
// @desc    Get student tracking record
// @access  Private
router.get("/student/:studentId", auth, async (req, res) => {
  try {
    const tracking = await StudentTracking.findOne({ studentId: req.params.studentId })
      .populate("studentId", "name email")
      .populate("collegeId", "name")

    if (!tracking) {
      return res.status(404).json({ msg: "Student tracking record not found" })
    }

    // Check authorization: the student themselves, college_admin, or admin can view
    if (
      tracking.studentId?._id?.toString() !== req.user.id &&
      req.user.role !== "college_admin" &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ msg: "Not authorized to view this record" })
    }

    res.json({
      success: true,
      tracking
    })
  } catch (error) {
    console.error("Get student tracking error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/student-tracking/college/:collegeId
// @desc    Get all student tracking records for a college
// @access  Private (College Admin)
router.get("/college/:collegeId", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const { year, branch, batch } = req.query
    const filter = { collegeId: req.params.collegeId }

    if (year) filter["academicInfo.currentYear"] = parseInt(year)
    if (branch) filter["academicInfo.branch"] = branch
    if (batch) filter["academicInfo.batch"] = batch

    const trackingRecords = await StudentTracking.find(filter)
      .populate("studentId", "name email")
      .sort({ "academicInfo.currentYear": 1, "academicInfo.cgpa": -1 })

    res.json({
      success: true,
      trackingRecords,
      total: trackingRecords.length
    })
  } catch (error) {
    console.error("Get college tracking error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/student-tracking/:id/update-progress
// @desc    Update yearly progress
// @access  Private (College Admin)
router.put("/:id/update-progress", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { year, semester, progressData } = req.body

  try {
    const tracking = await StudentTracking.findById(req.params.id)

    if (!tracking) {
      return res.status(404).json({ msg: "Student tracking record not found" })
    }

    // Find or create the yearly progress entry
    let yearProgress = tracking.yearlyProgress.find(
      p => p.year === year && p.semester === semester
    )

    if (yearProgress) {
      Object.assign(yearProgress, progressData)
    } else {
      tracking.yearlyProgress.push({
        year,
        semester,
        ...progressData
      })
    }

    tracking.history.push({
      action: "Progress Updated",
      performedBy: req.user.id,
      timestamp: Date.now(),
      details: { year, semester }
    })

    await tracking.save()

    res.json({
      success: true,
      tracking,
      msg: "Yearly progress updated successfully"
    })
  } catch (error) {
    console.error("Update progress error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/student-tracking/:id/update-readiness
// @desc    Update placement readiness
// @access  Private (College Admin)
router.put("/:id/update-readiness", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { readinessData } = req.body

  try {
    const tracking = await StudentTracking.findById(req.params.id)

    if (!tracking) {
      return res.status(404).json({ msg: "Student tracking record not found" })
    }

    tracking.placementReadiness = {
      ...tracking.placementReadiness,
      ...readinessData
    }

    tracking.history.push({
      action: "Readiness Updated",
      performedBy: req.user.id,
      timestamp: Date.now(),
      details: readinessData
    })

    await tracking.save()

    res.json({
      success: true,
      tracking,
      msg: "Placement readiness updated successfully"
    })
  } catch (error) {
    console.error("Update readiness error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/student-tracking/:id/add-alert
// @desc    Add alert for student
// @access  Private (College Admin)
router.put("/:id/add-alert", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { type, message, severity } = req.body

  try {
    const tracking = await StudentTracking.findById(req.params.id)

    if (!tracking) {
      return res.status(404).json({ msg: "Student tracking record not found" })
    }

    tracking.alerts.push({
      type,
      message,
      severity,
      createdAt: Date.now(),
      resolved: false
    })

    await tracking.save()

    res.json({
      success: true,
      tracking,
      msg: "Alert added successfully"
    })
  } catch (error) {
    console.error("Add alert error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/student-tracking/:id/add-recommendation
// @desc    Add recommendation for student
// @access  Private (College Admin)
router.put("/:id/add-recommendation", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { category, action, priority, deadline } = req.body

  try {
    const tracking = await StudentTracking.findById(req.params.id)

    if (!tracking) {
      return res.status(404).json({ msg: "Student tracking record not found" })
    }

    tracking.recommendations.push({
      category,
      action,
      priority,
      deadline,
      status: "Pending"
    })

    await tracking.save()

    res.json({
      success: true,
      tracking,
      msg: "Recommendation added successfully"
    })
  } catch (error) {
    console.error("Add recommendation error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/student-tracking/analytics/:collegeId
// @desc    Get student tracking analytics for college
// @access  Private (College Admin)
router.get("/analytics/:collegeId", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const trackingRecords = await StudentTracking.find({ collegeId: req.params.collegeId })

    const analytics = {
      totalStudents: trackingRecords.length,
      byYear: {},
      byBranch: {},
      averageCGPA: 0,
      placementRate: 0,
      readinessDistribution: {
        high: 0,
        medium: 0,
        low: 0
      },
      skillsGap: {},
      atRiskStudents: []
    }

    let totalCGPA = 0
    let placedCount = 0

    trackingRecords.forEach(tracking => {
      // By year
      const year = tracking.academicInfo.currentYear
      analytics.byYear[year] = (analytics.byYear[year] || 0) + 1

      // By branch
      const branch = tracking.academicInfo.branch || "Unknown"
      analytics.byBranch[branch] = (analytics.byBranch[branch] || 0) + 1

      // CGPA
      if (tracking.academicInfo.cgpa) {
        totalCGPA += tracking.academicInfo.cgpa
      }

      // Placement status
      if (tracking.placementStatus.placed) {
        placedCount++
      }

      // Readiness distribution
      const readinessScore = tracking.placementReadiness?.interviewReadiness?.overall || 0
      if (readinessScore >= 70) {
        analytics.readinessDistribution.high++
      } else if (readinessScore >= 50) {
        analytics.readinessDistribution.medium++
      } else {
        analytics.readinessDistribution.low++
      }

      // Skills gap
      tracking.placementReadiness?.skillsGap?.forEach(gap => {
        if (!analytics.skillsGap[gap.skill]) {
          analytics.skillsGap[gap.skill] = { required: 0, missing: 0 }
        }
        if (gap.required) analytics.skillsGap[gap.skill].required++
        else analytics.skillsGap[gap.skill].missing++
      })

      // At-risk students (low CGPA, low readiness, unresolved critical alerts)
      const isAtRisk = 
        (tracking.academicInfo.cgpa && tracking.academicInfo.cgpa < 6.0) ||
        (tracking.placementReadiness?.interviewReadiness?.overall < 50) ||
        tracking.alerts.some(a => a.severity === "Critical" && !a.resolved)

      if (isAtRisk) {
        analytics.atRiskStudents.push({
          studentId: tracking.studentId,
          name: tracking.studentId.name || "Unknown",
          cgpa: tracking.academicInfo.cgpa,
          readiness: tracking.placementReadiness?.interviewReadiness?.overall || 0,
          criticalAlerts: tracking.alerts.filter(a => a.severity === "Critical" && !a.resolved).length
        })
      }
    })

    analytics.averageCGPA = trackingRecords.length > 0 ? (totalCGPA / trackingRecords.length).toFixed(2) : 0
    analytics.placementRate = trackingRecords.length > 0 ? ((placedCount / trackingRecords.length) * 100).toFixed(2) : 0

    res.json({
      success: true,
      analytics
    })
  } catch (error) {
    console.error("Get analytics error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
