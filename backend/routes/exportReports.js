const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const JobApplication = require("../models/JobApplication")
const JobDescription = require("../models/JobDescription")
const StudentTracking = require("../models/StudentTracking")
const { Parser } = require("json2csv")
const PDFDocument = require("pdfkit")

// @route   POST /api/export/applications
// @desc    Export applications to CSV or PDF
// @access  Private (Recruiter/Admin)
router.post("/applications", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { format = "csv", jobId, filters } = req.body

  try {
    const query = {}
    if (jobId) {
      query.jobDescriptionId = jobId
    }

    const applications = await JobApplication.find(query)
      .populate("userId", "name email")
      .populate("jobDescriptionId", "title company")
      .sort({ createdAt: -1 })

    if (format === "csv") {
      const exportData = applications.map(app => ({
        candidateName: app.userId.name,
        candidateEmail: app.userId.email,
        jobTitle: app.jobDescriptionId.title,
        company: app.jobDescriptionId.company,
        status: app.status,
        atsScore: app.atsScore || 0,
        appliedDate: app.createdAt,
        lastUpdated: app.updatedAt
      }))

      const parser = new Parser()
      const csv = parser.parse(exportData)

      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", "attachment; filename=applications-export.csv")
      res.send(csv)
    } else if (format === "pdf") {
      // Generate PDF
      const doc = new PDFDocument()
      const chunks = []

      doc.on("data", chunk => chunks.push(chunk))
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks)
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", "attachment; filename=applications-export.pdf")
        res.send(pdfBuffer)
      })

      doc.fontSize(20).text("Applications Report", { align: "center" })
      doc.moveDown()
      
      applications.forEach((app, index) => {
        doc.fontSize(12).text(`${index + 1}. ${app.userId.name}`)
        doc.fontSize(10).text(`Email: ${app.userId.email}`)
        doc.text(`Job: ${app.jobDescriptionId.title}`)
        doc.text(`Status: ${app.status}`)
        doc.text(`ATS Score: ${app.atsScore || 0}`)
        doc.moveDown()
      })

      doc.end()
    }
  } catch (error) {
    console.error("Export applications error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/export/students
// @desc    Export student data to CSV or PDF
// @access  Private (College Admin)
router.post("/students", auth, async (req, res) => {
  if ((req.user.role !== "college" && req.user.role !== "college_admin" && req.user.role !== "admin")) {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { format = "csv", collegeId, filters } = req.body

  try {
    const query = collegeId ? { collegeId } : {}
    
    const trackingRecords = await StudentTracking.find(query)
      .populate("studentId", "name email")

    if (format === "csv") {
      const exportData = trackingRecords.map(tracking => ({
        studentName: tracking.studentId.name,
        studentEmail: tracking.studentId.email,
        year: tracking.academicInfo.currentYear,
        branch: tracking.academicInfo.branch,
        cgpa: tracking.academicInfo.cgpa || 0,
        readiness: tracking.placementReadiness?.interviewReadiness?.overall || 0,
        placed: tracking.placementStatus?.placed || false,
        createdAt: tracking.createdAt
      }))

      const parser = new Parser()
      const csv = parser.parse(exportData)

      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", "attachment; filename=students-export.csv")
      res.send(csv)
    } else if (format === "pdf") {
      const doc = new PDFDocument()
      const chunks = []

      doc.on("data", chunk => chunks.push(chunk))
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks)
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", "attachment; filename=students-export.pdf")
        res.send(pdfBuffer)
      })

      doc.fontSize(20).text("Student Report", { align: "center" })
      doc.moveDown()
      
      trackingRecords.forEach((tracking, index) => {
        doc.fontSize(12).text(`${index + 1}. ${tracking.studentId.name}`)
        doc.fontSize(10).text(`Email: ${tracking.studentId.email}`)
        doc.text(`Year: ${tracking.academicInfo.currentYear}`)
        doc.text(`Branch: ${tracking.academicInfo.branch}`)
        doc.text(`CGPA: ${tracking.academicInfo.cgpa || 0}`)
        doc.text(`Readiness: ${tracking.placementReadiness?.interviewReadiness?.overall || 0}%`)
        doc.text(`Placed: ${tracking.placementStatus?.placed ? "Yes" : "No"}`)
        doc.moveDown()
      })

      doc.end()
    }
  } catch (error) {
    console.error("Export students error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/export/analytics
// @desc    Export analytics data to CSV or PDF
// @access  Private (Recruiter/Admin)
router.post("/analytics", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { format = "csv", period = "30d" } = req.body

  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    const recruiterId = req.user.id
    const jobDescriptions = await JobDescription.find({ recruiterId })
    const jobIds = jobDescriptions.map(j => j._id)

    const applications = await JobApplication.find({
      jobDescriptionId: { $in: jobIds },
      createdAt: { $gte: startDate }
    })

    const analytics = {
      period,
      totalApplications: applications.length,
      byStatus: {},
      byJob: {}
    }

    applications.forEach(app => {
      analytics.byStatus[app.status] = (analytics.byStatus[app.status] || 0) + 1
    })

    jobDescriptions.forEach(job => {
      const jobApps = applications.filter(a => a.jobDescriptionId.toString() === job._id.toString())
      analytics.byJob[job.title] = jobApps.length
    })

    if (format === "csv") {
      const exportData = [
        { metric: "Period", value: period },
        { metric: "Total Applications", value: analytics.totalApplications },
        ...Object.entries(analytics.byStatus).map(([status, count]) => ({
          metric: `Status: ${status}`,
          value: count
        })),
        ...Object.entries(analytics.byJob).map(([job, count]) => ({
          metric: `Job: ${job}`,
          value: count
        }))
      ]

      const parser = new Parser()
      const csv = parser.parse(exportData)

      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", "attachment; filename=analytics-export.csv")
      res.send(csv)
    } else if (format === "pdf") {
      const doc = new PDFDocument()
      const chunks = []

      doc.on("data", chunk => chunks.push(chunk))
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks)
        res.setHeader("Content-Type", "application/pdf")
        res.setHeader("Content-Disposition", "attachment; filename=analytics-export.pdf")
        res.send(pdfBuffer)
      })

      doc.fontSize(20).text("Analytics Report", { align: "center" })
      doc.moveDown()
      doc.fontSize(12).text(`Period: Last ${period} days`)
      doc.text(`Total Applications: ${analytics.totalApplications}`)
      doc.moveDown()
      doc.fontSize(14).text("By Status:")
      Object.entries(analytics.byStatus).forEach(([status, count]) => {
        doc.fontSize(10).text(`${status}: ${count}`)
      })
      doc.moveDown()
      doc.fontSize(14).text("By Job:")
      Object.entries(analytics.byJob).forEach(([job, count]) => {
        doc.fontSize(10).text(`${job}: ${count}`)
      })

      doc.end()
    }
  } catch (error) {
    console.error("Export analytics error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
