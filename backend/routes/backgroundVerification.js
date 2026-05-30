const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const BackgroundVerification = require("../models/BackgroundVerification")
const JobApplication = require("../models/JobApplication")

// @route   POST /api/background-verification/initiate
// @desc    Initiate background verification for a candidate
// @access  Private (Recruiter)
router.post("/initiate", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { applicationId, provider, components } = req.body

  if (!applicationId) {
    return res.status(400).json({ msg: "Application ID is required" })
  }

  try {
    const application = await JobApplication.findById(applicationId)
    if (!application) {
      return res.status(404).json({ msg: "Application not found" })
    }

    // Check if verification already exists
    const existingVerification = await BackgroundVerification.findOne({ applicationId })
    if (existingVerification) {
      return res.status(400).json({ msg: "Background verification already initiated for this application" })
    }

    const verification = new BackgroundVerification({
      candidateId: application.userId,
      applicationId,
      recruiterId: req.user.id,
      provider: provider || "Manual",
      components: components || {},
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      history: [{
        action: "Initiated",
        performedBy: req.user.id,
        timestamp: Date.now(),
        details: { provider, components }
      }]
    })

    await verification.save()

    // TODO: Integrate with actual background verification provider API
    // if (provider !== "Manual") {
    //   await initiateProviderVerification(verification, provider)
    // }

    res.json({
      success: true,
      verification,
      msg: "Background verification initiated successfully"
    })
  } catch (error) {
    console.error("Initiate verification error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/background-verification/:id
// @desc    Get background verification details
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const verification = await BackgroundVerification.findById(req.params.id)
      .populate("candidateId", "name email")
      .populate("recruiterId", "name")
      .populate("applicationId")

    if (!verification) {
      return res.status(404).json({ msg: "Verification not found" })
    }

    // Check authorization
    if (
      verification.candidateId._id.toString() !== req.user.id &&
      verification.recruiterId._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    res.json({
      success: true,
      verification
    })
  } catch (error) {
    console.error("Get verification error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/background-verification/:id/update-component
// @desc    Update verification component status
// @access  Private (Recruiter/Admin)
router.put("/:id/update-component", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { component, status, result, notes } = req.body

  if (!component || !status) {
    return res.status(400).json({ msg: "Component and status are required" })
  }

  try {
    const verification = await BackgroundVerification.findById(req.params.id)

    if (!verification) {
      return res.status(404).json({ msg: "Verification not found" })
    }

    if (verification.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    const validComponents = ["identity", "education", "employment", "criminal", "drug", "reference"]
    if (!validComponents.includes(component)) {
      return res.status(400).json({ msg: "Invalid component" })
    }

    verification.components[component] = {
      status,
      verifiedAt: status === "Verified" ? Date.now() : undefined,
      result,
      notes
    }

    verification.history.push({
      action: "Component Updated",
      performedBy: req.user.id,
      timestamp: Date.now(),
      details: { component, status }
    })

    // Check if all components are complete
    const allComplete = validComponents.every(comp => 
      verification.components[comp].status === "Verified" || 
      verification.components[comp].status === "Failed" ||
      verification.components[comp].status === "Not Required"
    )

    if (allComplete) {
      verification.status = "Completed"
      verification.completedAt = Date.now
      
      // Calculate overall result
      const hasFailures = validComponents.some(comp => verification.components[comp].status === "Failed")
      verification.overallResult = hasFailures ? "Consider" : "Clear"
      verification.riskLevel = hasFailures ? "Medium" : "Low"
    }

    await verification.save()

    res.json({
      success: true,
      verification,
      msg: "Component updated successfully"
    })
  } catch (error) {
    console.error("Update component error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/background-verification/:id/finalize
// @desc    Finalize background verification
// @access  Private (Recruiter)
router.put("/:id/finalize", auth, async (req, res) => {
  if (req.user.role !== "recruiter" && req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { overallResult, riskLevel, reportUrl } = req.body

  try {
    const verification = await BackgroundVerification.findById(req.params.id)

    if (!verification) {
      return res.status(404).json({ msg: "Verification not found" })
    }

    if (verification.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    verification.status = "Completed"
    verification.completedAt = Date.now()
    verification.overallResult = overallResult || verification.overallResult
    verification.riskLevel = riskLevel || verification.riskLevel
    verification.reportUrl = reportUrl
    verification.reportGeneratedAt = Date.now

    verification.history.push({
      action: "Finalized",
      performedBy: req.user.id,
      timestamp: Date.now(),
      details: { overallResult, riskLevel }
    })

    await verification.save()

    res.json({
      success: true,
      verification,
      msg: "Verification finalized successfully"
    })
  } catch (error) {
    console.error("Finalize verification error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/background-verification/application/:applicationId
// @desc    Get verification by application ID
// @access  Private
router.get("/application/:applicationId", auth, async (req, res) => {
  try {
    const verification = await BackgroundVerification.findOne({ applicationId: req.params.applicationId })

    if (!verification) {
      return res.status(404).json({ msg: "Verification not found" })
    }

    // Check authorization
    if (
      verification.candidateId.toString() !== req.user.id &&
      verification.recruiterId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    res.json({
      success: true,
      verification
    })
  } catch (error) {
    console.error("Get verification by application error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
