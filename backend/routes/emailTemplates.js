const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const EmailTemplate = require("../models/EmailTemplate")

// @route   POST /api/email-templates/create
// @desc    Create a new email template
// @access  Private (Admin)
router.post("/create", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { name, category, subject, body, variables } = req.body

  if (!name || !category || !subject || !body) {
    return res.status(400).json({ msg: "Name, category, subject, and body are required" })
  }

  try {
    const template = new EmailTemplate({
      name,
      category,
      subject,
      body,
      variables: variables || [],
      createdBy: req.user.id,
    })

    await template.save()

    res.json({
      success: true,
      template,
      msg: "Email template created successfully"
    })
  } catch (error) {
    console.error("Create template error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/email-templates
// @desc    Get all email templates
// @access  Private (Admin)
router.get("/", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const { category } = req.query
    const filter = category ? { category } : {}

    const templates = await EmailTemplate.find(filter)
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      templates
    })
  } catch (error) {
    console.error("Get templates error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/email-templates/:id
// @desc    Get email template by ID
// @access  Private (Admin)
router.get("/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const template = await EmailTemplate.findById(req.params.id)
      .populate("createdBy", "name")

    if (!template) {
      return res.status(404).json({ msg: "Template not found" })
    }

    res.json({
      success: true,
      template
    })
  } catch (error) {
    console.error("Get template error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/email-templates/:id
// @desc    Update email template
// @access  Private (Admin)
router.put("/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const template = await EmailTemplate.findById(req.params.id)

    if (!template) {
      return res.status(404).json({ msg: "Template not found" })
    }

    Object.keys(req.body).forEach(key => {
      if (key !== "_id" && key !== "createdBy") {
        template[key] = req.body[key]
      }
    })

    await template.save()

    res.json({
      success: true,
      template,
      msg: "Template updated successfully"
    })
  } catch (error) {
    console.error("Update template error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   DELETE /api/email-templates/:id
// @desc    Delete email template
// @access  Private (Admin)
router.delete("/:id", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  try {
    const template = await EmailTemplate.findById(req.params.id)

    if (!template) {
      return res.status(404).json({ msg: "Template not found" })
    }

    await EmailTemplate.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      msg: "Template deleted successfully"
    })
  } catch (error) {
    console.error("Delete template error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/email-templates/preview
// @desc    Preview email template with variables
// @access  Private (Admin)
router.post("/preview", auth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { templateId, variables } = req.body

  if (!templateId) {
    return res.status(400).json({ msg: "Template ID is required" })
  }

  try {
    const template = await EmailTemplate.findById(templateId)

    if (!template) {
      return res.status(404).json({ msg: "Template not found" })
    }

    // Replace variables in subject and body
    let previewSubject = template.subject
    let previewBody = template.body

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`
        previewSubject = previewSubject.replace(new RegExp(placeholder, "g"), value)
        previewBody = previewBody.replace(new RegExp(placeholder, "g"), value)
      })
    }

    res.json({
      success: true,
      preview: {
        subject: previewSubject,
        body: previewBody
      }
    })
  } catch (error) {
    console.error("Preview template error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
