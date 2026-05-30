const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const OfferLetter = require("../models/OfferLetter")
const JobApplication = require("../models/JobApplication")
const User = require("../models/User")
const PDFDocument = require("pdfkit")

// @route   POST /api/offer-letter/create
// @desc    Create a new offer letter
// @access  Private (Recruiter)
router.post("/create", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can create offer letters." })
  }

  const {
    applicationId,
    offerDetails,
    compensation,
    terms,
    customContent,
    expiresAt,
  } = req.body

  try {
    const application = await JobApplication.findById(applicationId)
    if (!application) {
      return res.status(404).json({ msg: "Application not found" })
    }

    const offerLetter = new OfferLetter({
      applicationId,
      candidateId: application.userId,
      recruiterId: req.user.id,
      jobId: application.jobDescriptionId,
      offerDetails,
      compensation,
      terms,
      customContent,
      expiresAt: expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default
      status: "Draft",
      history: [{
        action: "Created",
        performedBy: req.user.id,
        timestamp: Date.now(),
        details: { message: "Offer letter created as draft" }
      }]
    })

    await offerLetter.save()

    res.json({
      success: true,
      offerLetter,
      msg: "Offer letter created successfully"
    })
  } catch (error) {
    console.error("Offer letter creation error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/offer-letter/:id/update
// @desc    Update offer letter details
// @access  Private (Recruiter)
router.put("/:id/update", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can update offer letters." })
  }

  try {
    const offerLetter = await OfferLetter.findById(req.params.id)
    
    if (!offerLetter) {
      return res.status(404).json({ msg: "Offer letter not found" })
    }

    if (offerLetter.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to modify this offer letter" })
    }

    if (offerLetter.status !== "Draft") {
      return res.status(400).json({ msg: "Can only update draft offer letters" })
    }

    const updates = req.body
    Object.keys(updates).forEach(key => {
      offerLetter[key] = updates[key]
    })

    offerLetter.history.push({
      action: "Updated",
      performedBy: req.user.id,
      timestamp: Date.now(),
      details: { message: "Offer letter updated" }
    })

    await offerLetter.save()

    res.json({
      success: true,
      offerLetter,
      msg: "Offer letter updated successfully"
    })
  } catch (error) {
    console.error("Offer letter update error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/offer-letter/:id/send
// @desc    Send offer letter to candidate
// @access  Private (Recruiter)
router.post("/:id/send", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can send offer letters." })
  }

  try {
    const offerLetter = await OfferLetter.findById(req.params.id)
      .populate("candidateId")
      .populate("recruiterId")
    
    if (!offerLetter) {
      return res.status(404).json({ msg: "Offer letter not found" })
    }

    if (offerLetter.recruiterId._id.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to send this offer letter" })
    }

    if (offerLetter.status !== "Draft") {
      return res.status(400).json({ msg: "Can only send draft offer letters" })
    }

    offerLetter.status = "Sent"
    offerLetter.sentAt = Date.now()
    offerLetter.history.push({
      action: "Sent",
      performedBy: req.user.id,
      timestamp: Date.now(),
      details: { 
        message: `Offer letter sent to ${offerLetter.candidateId.name}`,
        email: offerLetter.candidateId.email
      }
    })

    await offerLetter.save()

    // TODO: Send email notification to candidate
    // await sendOfferLetterEmail(offerLetter)

    res.json({
      success: true,
      offerLetter,
      msg: "Offer letter sent successfully"
    })
  } catch (error) {
    console.error("Offer letter send error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/offer-letter/:id/accept
// @desc    Candidate accepts offer letter
// @access  Private (Candidate)
router.post("/:id/accept", auth, async (req, res) => {
  try {
    const offerLetter = await OfferLetter.findById(req.params.id)
    
    if (!offerLetter) {
      return res.status(404).json({ msg: "Offer letter not found" })
    }

    if (offerLetter.candidateId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to accept this offer letter" })
    }

    if (offerLetter.status !== "Sent") {
      return res.status(400).json({ msg: "Offer letter is not in sent status" })
    }

    if (offerLetter.expiresAt && new Date(offerLetter.expiresAt) < new Date()) {
      return res.status(400).json({ msg: "Offer letter has expired" })
    }

    const { signature } = req.body

    offerLetter.status = "Accepted"
    offerLetter.signature.candidateSigned = true
    offerLetter.signature.candidateSignature = signature
    offerLetter.signature.candidateSignedAt = Date.now()
    offerLetter.respondedAt = Date.now()
    offerLetter.history.push({
      action: "Accepted",
      performedBy: req.user.id,
      timestamp: Date.now(),
      details: { message: "Candidate accepted the offer letter" }
    })

    await offerLetter.save()

    // TODO: Update application status to Offer Accepted
    // TODO: Send notification to recruiter

    res.json({
      success: true,
      offerLetter,
      msg: "Offer letter accepted successfully"
    })
  } catch (error) {
    console.error("Offer letter accept error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/offer-letter/:id/reject
// @desc    Candidate rejects offer letter
// @access  Private (Candidate)
router.post("/:id/reject", auth, async (req, res) => {
  try {
    const offerLetter = await OfferLetter.findById(req.params.id)
    
    if (!offerLetter) {
      return res.status(404).json({ msg: "Offer letter not found" })
    }

    if (offerLetter.candidateId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to reject this offer letter" })
    }

    if (offerLetter.status !== "Sent") {
      return res.status(400). json({ msg: "Offer letter is not in sent status" })
    }

    const { reason } = req.body

    offerLetter.status = "Rejected"
    offerLetter.respondedAt = Date.now()
    offerLetter.history.push({
      action: "Rejected",
      performedBy: req.user.id,
      timestamp: Date.now(),
      details: { message: "Candidate rejected the offer letter", reason }
    })

    await offerLetter.save()

    // TODO: Update application status
    // TODO: Send notification to recruiter

    res.json({
      success: true,
      offerLetter,
      msg: "Offer letter rejected successfully"
    })
  } catch (error) {
    console.error("Offer letter reject error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/offer-letter/:id
// @desc    Get offer letter details
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const offerLetter = await OfferLetter.findById(req.params.id)
      .populate("candidateId", "name email")
      .populate("recruiterId", "name email")
      .populate("jobId", "title")
      .populate("applicationId")
    
    if (!offerLetter) {
      return res.status(404).json({ msg: "Offer letter not found" })
    }

    // Check authorization
    if (
      offerLetter.candidateId._id.toString() !== req.user.id &&
      offerLetter.recruiterId._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ msg: "Not authorized to view this offer letter" })
    }

    // Mark as viewed if candidate is viewing
    if (offerLetter.candidateId._id.toString() === req.user.id && offerLetter.status === "Sent") {
      offerLetter.viewedAt = Date.now()
      offerLetter.history.push({
        action: "Viewed",
        performedBy: req.user.id,
        timestamp: Date.now(),
        details: { message: "Candidate viewed the offer letter" }
      })
      await offerLetter.save()
    }

    res.json({
      success: true,
      offerLetter
    })
  } catch (error) {
    console.error("Get offer letter error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/offer-letter/application/:applicationId
// @desc    Get offer letter by application ID
// @access  Private
router.get("/application/:applicationId", auth, async (req, res) => {
  try {
    const offerLetter = await OfferLetter.findOne({ applicationId: req.params.applicationId })
      .populate("candidateId", "name email")
      .populate("recruiterId", "name email")
      .populate("jobId", "title")
    
    if (!offerLetter) {
      return res.status(404).json({ msg: "Offer letter not found" })
    }

    // Check authorization
    if (
      offerLetter.candidateId._id.toString() !== req.user.id &&
      offerLetter.recruiterId._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ msg: "Not authorized to view this offer letter" })
    }

    res.json({
      success: true,
      offerLetter
    })
  } catch (error) {
    console.error("Get offer letter by application error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/offer-letter
// @desc    Get all offer letters for user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    let query = {}
    
    if (req.user.role === "recruiter") {
      query.recruiterId = req.user.id
    } else if (req.user.role === "job_seeker") {
      query.candidateId = req.user.id
    } else if (req.user.role === "admin") {
      // Admin can see all
    } else {
      return res.status(403).json({ msg: "Access denied" })
    }

    const offerLetters = await OfferLetter.find(query)
      .populate("candidateId", "name email")
      .populate("recruiterId", "name email")
      .populate("jobId", "title")
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      offerLetters,
      total: offerLetters.length
    })
  } catch (error) {
    console.error("Get offer letters error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/offer-letter/:id/generate-pdf
// @desc    Generate PDF for offer letter
// @access  Private
router.post("/:id/generate-pdf", auth, async (req, res) => {
  try {
    const offerLetter = await OfferLetter.findById(req.params.id)
      .populate("candidateId", "name email")
      .populate("recruiterId", "name email")
      .populate("jobId", "title")
    
    if (!offerLetter) {
      return res.status(404).json({ msg: "Offer letter not found" })
    }

    // Check authorization
    if (
      offerLetter.candidateId._id.toString() !== req.user.id &&
      offerLetter.recruiterId._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(401).json({ msg: "Not authorized to generate PDF for this offer letter" })
    }

    // Generate PDF
    const doc = new PDFDocument()
    const chunks = []

    doc.on("data", chunk => chunks.push(chunk))
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks)
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `attachment; filename=offer-letter-${offerLetter._id}.pdf`)
      res.send(pdfBuffer)
    })

    // PDF Content
    doc.fontSize(20).text("Offer Letter", { align: "center" })
    doc.moveDown()
    doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`)
    doc.moveDown()
    doc.text(`Dear ${offerLetter.candidateId.name},`)
    doc.moveDown()
    doc.text("We are pleased to offer you the position of:")
    doc.fontSize(14).text(offerLetter.offerDetails.position || offerLetter.jobId.title)
    doc.fontSize(12)
    doc.moveDown()
    doc.text("Position Details:")
    doc.text(`Department: ${offerLetter.offerDetails.department || "Not specified"}`)
    doc.text(`Start Date: ${offerLetter.offerDetails.startDate ? new Date(offerLetter.offerDetails.startDate).toLocaleDateString() : "To be determined"}`)
    doc.text(`Employment Type: ${offerLetter.offerDetails.employmentType}`)
    doc.text(`Work Location: ${offerLetter.offerDetails.workLocation}`)
    doc.moveDown()
    doc.text("Compensation:")
    doc.text(`Base Salary: ${offerLetter.compensation.currency} ${offerLetter.compensation.baseSalary?.toLocaleString()} ${offerLetter.compensation.salaryPeriod}`)
    if (offerLetter.compensation.bonus) {
      doc.text(`Bonus: ${offerLetter.compensation.currency} ${offerLetter.compensation.bonus?.toLocaleString()} (${offerLetter.compensation.bonusType})`)
    }
    doc.moveDown()
    doc.text("Terms:")
    doc.text(`Probation Period: ${offerLetter.terms.probationPeriod} months`)
    doc.text(`Notice Period: ${offerLetter.terms.noticePeriod} days`)
    doc.text(`Working Hours: ${offerLetter.terms.workingHours}`)
    doc.text(`Vacation Days: ${offerLetter.terms.vacationDays}`)
    doc.moveDown()
    
    if (offerLetter.customContent?.additionalTerms) {
      doc.text("Additional Terms:")
      doc.text(offerLetter.customContent.additionalTerms)
      doc.moveDown()
    }

    doc.text("Please sign and return this offer letter by:")
    doc.text(offerLetter.expiresAt ? new Date(offerLetter.expiresAt).toLocaleDateString() : "As soon as possible")
    doc.moveDown()
    doc.text("Sincerely,")
    doc.text(offerLetter.recruiterId.name)
    doc.moveDown()

    // Signature section
    if (offerLetter.signature.candidateSigned) {
      doc.text("Candidate Signature: " + (offerLetter.signature.candidateSignature || "Signed"))
      doc.text(`Signed on: ${new Date(offerLetter.signature.candidateSignedAt).toLocaleDateString()}`)
    }

    doc.end()
  } catch (error) {
    console.error("PDF generation error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   DELETE /api/offer-letter/:id
// @desc    Delete offer letter (draft only)
// @access  Private (Recruiter)
router.delete("/:id", auth, async (req, res) => {
  if (req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied. Only recruiters can delete offer letters." })
  }

  try {
    const offerLetter = await OfferLetter.findById(req.params.id)
    
    if (!offerLetter) {
      return res.status(404).json({ msg: "Offer letter not found" })
    }

    if (offerLetter.recruiterId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized to delete this offer letter" })
    }

    if (offerLetter.status !== "Draft") {
      return res.status(400).json({ msg: "Can only delete draft offer letters" })
    }

    await OfferLetter.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      msg: "Offer letter deleted successfully"
    })
  } catch (error) {
    console.error("Delete offer letter error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
