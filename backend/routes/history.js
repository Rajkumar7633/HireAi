const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const History = require("../models/History")

// @route   GET /api/history
// @desc    Get all history entries for the authenticated user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const history = await History.find({ userId: req.user.id }).sort({ createdAt: -1 })
    res.json(history)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   POST /api/history
// @desc    Add a new history entry (internal use, not directly exposed to frontend for creation)
// @access  Private (should be called by backend services)
router.post("/", auth, async (req, res) => {
  const { type, details, relatedEntity } = req.body

  try {
    const newHistory = new History({
      userId: req.user.id,
      type,
      details,
      relatedEntity,
      createdAt: new Date(),
    })

    await newHistory.save()
    res.json({ msg: "History entry added", history: newHistory })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router
