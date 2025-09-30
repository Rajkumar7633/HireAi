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
// @desc    Get all users
// @access  Private (Admin)
router.get("/users", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 })
    res.json(users)
  } catch (err) {
    console.error(err.message)
    res.status(500).send("Server Error")
  }
})

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

module.exports = router
