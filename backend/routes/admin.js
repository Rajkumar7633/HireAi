const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const User = require("../models/User")
const JobDescription = require("../models/JobDescription")
const Resume = require("../models/Resume")
const JobApplication = require("../models/JobApplication")
const Conversation = require("../models/Conversation")
const Message = require("../models/Message")
const Test = require("../models/Test")
const Notification = require("../models/Notification")
const History = require("../models/History")
const Match = require("../models/Match") // Declare the Match variable

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied. Admin privileges required." })
  }
  next()
}

// @route   GET /api/admin/users
// @desc    List users with filters and pagination
// @access  Private (Admin)
router.get("/users", auth, isAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100)
    const role = req.query.role && ["recruiter", "job_seeker", "admin"].includes(req.query.role) ? req.query.role : undefined
    const q = (req.query.q || "").toString().trim()

    const filter = {}
    if (role) filter.role = role
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ]
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .select("-password -passwordHash")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ])

    res.json({ items, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

module.exports = router

// @route   GET /api/admin/users/:id
// @desc    Get user by ID
// @access  Private (Admin)
router.get("/users/:id", auth, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password")
    if (!user) {
      return res.status(404).json({ msg: "User not found" })
    }
    res.json(user)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   PUT /api/admin/users/:id
// @desc    Update user by ID (admin only)
// @access  Private (Admin)
router.put("/users/:id", auth, isAdmin, async (req, res) => {
  const { name, email, role, phone, address } = req.body

  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ msg: "User not found" })
    }

    // Prevent admin from changing their own role to non-admin
    if (req.user.id === req.params.id && role && role !== "admin") {
      return res.status(400).json({ msg: "Admin cannot demote themselves." })
    }

    // Check if new email already exists for another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email })
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ msg: "Email already in use by another account" })
      }
    }

    user.name = name || user.name
    user.email = email || user.email
    user.role = role || user.role
    user.phone = phone || user.phone
    user.address = address || user.address

    await user.save()
    res.json({ msg: "User updated successfully", user })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   DELETE /api/admin/users/:id
// @desc    Delete user by ID (admin only)
// @access  Private (Admin)
router.delete("/users/:id", auth, isAdmin, async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id)

    if (!userToDelete) {
      return res.status(404).json({ msg: "User not found" })
    }

    // Prevent admin from deleting themselves
    if (req.user.id === req.params.id) {
      return res.status(400).json({ msg: "Admin cannot delete their own account via this route." })
    }

    // Delete all associated data for the user
    await Resume.deleteMany({ userId: req.params.id })
    await JobDescription.deleteMany({ recruiterId: req.params.id })
    await JobApplication.deleteMany({ jobSeekerId: req.params.id })
    await JobApplication.deleteMany({ "jobDescriptionId.recruiterId": req.params.id }) // Applications for recruiter's jobs
    await Match.deleteMany({
      $or: [{ "resumeId.userId": req.params.id }, { "jobDescriptionId.recruiterId": req.params.id }],
    })
    await Conversation.deleteMany({ $or: [{ jobSeekerId: req.params.id }, { recruiterId: req.params.id }] })
    await Message.deleteMany({ $or: [{ senderId: req.params.id }, { readBy: req.params.id }] })
    await Test.deleteMany({ recruiterId: req.params.id })
    await Notification.deleteMany({ userId: req.params.id })
    await History.deleteMany({ userId: req.params.id })

    await User.deleteOne({ _id: req.params.id })

    res.json({ msg: "User and all associated data removed" })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// Admin statistics for dashboard
// @route   GET /api/admin/stats/overview
// @desc    Aggregate counts for KPI cards
// @access  Private (Admin)
router.get("/stats/overview", auth, isAdmin, async (req, res) => {
  try {
    const [total, students, recruiters, admins, activeSubs] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: "job_seeker" }),
      User.countDocuments({ role: "recruiter" }),
      User.countDocuments({ role: "admin" }),
      User.countDocuments({ "subscription.status": "active" }),
    ])

    res.json({ total, students, recruiters, admins, activeSubs })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

// @route   GET /api/admin/stats/timeseries
// @desc    Timeseries for charts (signups, subs) grouped by day over a range
// @access  Private (Admin)
router.get("/stats/timeseries", auth, isAdmin, async (req, res) => {
  try {
    const metric = (req.query.metric || "signups").toString()
    const days = Math.min(Math.max(parseInt(req.query.days || "30", 10), 1), 180)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    if (metric === "subs") {
      const pipeline = [
        { $match: { "subscription.status": "active", updatedAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]
      const rows = await User.aggregate(pipeline)
      return res.json({ metric, days, rows })
    }

    // default: signups
    const pipeline = [
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]
    const rows = await User.aggregate(pipeline)
    return res.json({ metric: "signups", days, rows })
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})
