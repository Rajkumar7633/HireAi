const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const StudentTracking = require("../models/StudentTracking")
const User = require("../models/User")
const csv = require("csv-parser")
const fs = require("fs")
const { Parser } = require("json2csv")

// @route   POST /api/bulk/import-students
// @desc    Import students from CSV file
// @access  Private (College Admin)
router.post("/import-students", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied. Only college admins can import students." })
  }

  try {
    if (!req.files || !req.files.csvFile) {
      return res.status(400).json({ msg: "CSV file is required" })
    }

    const csvFile = req.files.csvFile
    const results = []
    const errors = []

    // Parse CSV
    fs.createReadStream(csvFile.tempFilePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("error", (error) => {
        console.error("CSV parsing error:", error)
        errors.push(error.message)
      })
      .on("end", async () => {
        try {
          let successCount = 0
          let failureCount = 0
          const importResults = []

          for (const row of results) {
            try {
              // Check if user already exists
              const existingUser = await User.findOne({ email: row.email })
              if (existingUser) {
                importResults.push({
                  email: row.email,
                  name: row.name,
                  status: "Skipped",
                  reason: "User already exists"
                })
                failureCount++
                continue
              }

              // Create user
              const user = new User({
                name: row.name,
                email: row.email,
                password: row.password || "defaultPassword123", // Should be changed on first login
                role: "job_seeker",
                collegeId: req.user.collegeId,
              })

              await user.save()

              // Create student tracking record
              const tracking = new StudentTracking({
                studentId: user._id,
                collegeId: req.user.collegeId,
                academicInfo: {
                  currentYear: parseInt(row.year) || 1,
                  branch: row.branch || "Unknown",
                  department: row.department || "Unknown",
                  section: row.section || "A",
                  batch: row.batch || "2024-2028",
                  cgpa: parseFloat(row.cgpa) || 0,
                },
                history: [{
                  action: "Imported",
                  performedBy: req.user.id,
                  timestamp: Date.now(),
                  details: { message: "Student imported via bulk operation" }
                }]
              })

              await tracking.save()

              importResults.push({
                email: row.email,
                name: row.name,
                status: "Success",
                studentId: user._id
              })
              successCount++
            } catch (error) {
              importResults.push({
                email: row.email,
                name: row.name,
                status: "Failed",
                reason: error.message
              })
              failureCount++
            }
          }

          // Clean up temp file
          fs.unlinkSync(csvFile.tempFilePath)

          res.json({
            success: true,
            results: {
              total: results.length,
              success: successCount,
              failure: failureCount,
              details: importResults
            },
            msg: `Import completed: ${successCount} successful, ${failureCount} failed`
          })
        } catch (error) {
          console.error("Import processing error:", error)
          res.status(500).json({ msg: "Server error", error: error.message })
        }
      })
  } catch (error) {
    console.error("Bulk import error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/bulk/eligibility-filter
// @desc    Bulk eligibility filtering for placement drives
// @access  Private (College Admin)
router.post("/eligibility-filter", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { collegeId, criteria } = req.body

  if (!collegeId) {
    return res.status(400).json({ msg: "College ID is required" })
  }

  try {
    const { minCGPA, maxBacklogs, requiredBranches, requiredYears, requiredSkills } = criteria

    const trackingRecords = await StudentTracking.find({ collegeId })
      .populate("studentId", "name email")

    const eligibleStudents = []
    const ineligibleStudents = []

    trackingRecords.forEach(tracking => {
      let isEligible = true
      const reasons = []

      // CGPA check
      if (minCGPA && tracking.academicInfo.cgpa < minCGPA) {
        isEligible = false
        reasons.push(`CGPA below threshold (${tracking.academicInfo.cgpa} < ${minCGPA})`)
      }

      // Branch check
      if (requiredBranches && requiredBranches.length > 0) {
        if (!requiredBranches.includes(tracking.academicInfo.branch)) {
          isEligible = false
          reasons.push(`Branch not eligible (${tracking.academicInfo.branch})`)
        }
      }

      // Year check
      if (requiredYears && requiredYears.length > 0) {
        if (!requiredYears.includes(tracking.academicInfo.currentYear)) {
          isEligible = false
          reasons.push(`Year not eligible (${tracking.academicInfo.currentYear})`)
        }
      }

      // Skills check
      if (requiredSkills && requiredSkills.length > 0) {
        const studentSkills = tracking.skillDevelopment?.technicalSkills?.map(s => s.name.toLowerCase()) || []
        const missingSkills = requiredSkills.filter(skill => !studentSkills.includes(skill.toLowerCase()))
        if (missingSkills.length > 0) {
          isEligible = false
          reasons.push(`Missing required skills: ${missingSkills.join(", ")}`)
        }
      }

      const studentData = {
        studentId: tracking.studentId._id,
        name: tracking.studentId.name,
        email: tracking.studentId.email,
        cgpa: tracking.academicInfo.cgpa,
        branch: tracking.academicInfo.branch,
        year: tracking.academicInfo.currentYear,
        readiness: tracking.placementReadiness?.interviewReadiness?.overall || 0
      }

      if (isEligible) {
        eligibleStudents.push(studentData)
      } else {
        ineligibleStudents.push({ ...studentData, reasons })
      }
    })

    res.json({
      success: true,
      results: {
        total: trackingRecords.length,
        eligible: eligibleStudents.length,
        ineligible: ineligibleStudents.length,
        eligibleStudents,
        ineligibleStudents
      },
      msg: `Eligibility filter completed: ${eligibleStudents.length} eligible out of ${trackingRecords.length}`
    })
  } catch (error) {
    console.error("Eligibility filter error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/bulk/bulk-invite
// @desc    Send bulk invitations for assessments/interviews
// @access  Private (College Admin)
router.post("/bulk-invite", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { studentIds, inviteType, details } = req.body

  if (!studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ msg: "Student IDs array is required" })
  }

  try {
    const results = []
    let successCount = 0
    let failureCount = 0

    for (const studentId of studentIds) {
      try {
        // TODO: Implement actual invitation sending logic
        // This would integrate with your notification/email system
        
        results.push({
          studentId,
          status: "Success",
          inviteType
        })
        successCount++
      } catch (error) {
        results.push({
          studentId,
          status: "Failed",
          reason: error.message
        })
        failureCount++
      }
    }

    res.json({
      success: true,
      results: {
        total: studentIds.length,
        success: successCount,
        failure: failureCount,
        details: results
      },
      msg: `Bulk invitations sent: ${successCount} successful, ${failureCount} failed`
    })
  } catch (error) {
    console.error("Bulk invite error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/bulk/bulk-update
// @desc    Bulk update student records
// @access  Private (College Admin)
router.post("/bulk-update", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { studentIds, updateData } = req.body

  if (!studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ msg: "Student IDs array is required" })
  }

  try {
    const results = []
    let successCount = 0
    let failureCount = 0

    for (const studentId of studentIds) {
      try {
        const tracking = await StudentTracking.findOne({ studentId })
        
        if (!tracking) {
          results.push({
            studentId,
            status: "Failed",
            reason: "Student tracking record not found"
          })
          failureCount++
          continue
        }

        // Apply updates
        Object.keys(updateData).forEach(key => {
          if (key === "academicInfo") {
            tracking.academicInfo = { ...tracking.academicInfo, ...updateData.academicInfo }
          } else if (key === "placementReadiness") {
            tracking.placementReadiness = { ...tracking.placementReadiness, ...updateData.placementReadiness }
          } else {
            tracking[key] = updateData[key]
          }
        })

        tracking.history.push({
          action: "Bulk Updated",
          performedBy: req.user.id,
          timestamp: Date.now(),
          details: updateData
        })

        await tracking.save()

        results.push({
          studentId,
          status: "Success"
        })
        successCount++
      } catch (error) {
        results.push({
          studentId,
          status: "Failed",
          reason: error.message
        })
        failureCount++
      }
    }

    res.json({
      success: true,
      results: {
        total: studentIds.length,
        success: successCount,
        failure: failureCount,
        details: results
      },
      msg: `Bulk update completed: ${successCount} successful, ${failureCount} failed`
    })
  } catch (error) {
    console.error("Bulk update error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/bulk/export-students
// @desc    Export student data to CSV
// @access  Private (College Admin)
router.get("/export-students", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { collegeId, filters } = req.query

  try {
    const filterObj = collegeId ? { collegeId } : {}
    
    // Apply additional filters if provided
    if (filters) {
      const parsedFilters = JSON.parse(filters)
      Object.entries(parsedFilters).forEach(([key, value]) => {
        if (key === "year") {
          filterObj["academicInfo.currentYear"] = parseInt(value)
        } else if (key === "branch") {
          filterObj["academicInfo.branch"] = value
        }
      })
    }

    const trackingRecords = await StudentTracking.find(filterObj)
      .populate("studentId", "name email")

    const exportData = trackingRecords.map(tracking => ({
      name: tracking.studentId.name,
      email: tracking.studentId.email,
      year: tracking.academicInfo.currentYear,
      branch: tracking.academicInfo.branch,
      cgpa: tracking.academicInfo.cgpa,
      readiness: tracking.placementReadiness?.interviewReadiness?.overall || 0,
      placed: tracking.placementStatus?.placed || false,
      skills: tracking.skillDevelopment?.technicalSkills?.map(s => s.name).join(", ") || ""
    }))

    const parser = new Parser()
    const csv = parser.parse(exportData)

    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", "attachment; filename=students-export.csv")
    res.send(csv)
  } catch (error) {
    console.error("Export students error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/bulk/bulk-delete
// @desc    Bulk delete student records
// @access  Private (College Admin)
router.post("/bulk-delete", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { studentIds } = req.body

  if (!studentIds || !Array.isArray(studentIds)) {
    return res.status(400).json({ msg: "Student IDs array is required" })
  }

  try {
    const results = []
    let successCount = 0
    let failureCount = 0

    for (const studentId of studentIds) {
      try {
        await StudentTracking.deleteOne({ studentId })
        await User.findByIdAndDelete(studentId)

        results.push({
          studentId,
          status: "Success"
        })
        successCount++
      } catch (error) {
        results.push({
          studentId,
          status: "Failed",
          reason: error.message
        })
        failureCount++
      }
    }

    res.json({
      success: true,
      results: {
        total: studentIds.length,
        success: successCount,
        failure: failureCount,
        details: results
      },
      msg: `Bulk delete completed: ${successCount} successful, ${failureCount} failed`
    })
  } catch (error) {
    console.error("Bulk delete error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
