const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const Notification = require("../models/Notification")
const User = require("../models/User")

// Store connected users for WebSocket-like functionality
const connectedUsers = new Map()

// @route   GET /api/notifications
// @desc    Get all notifications for current user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)

    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    })

    res.json({
      success: true,
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error("Get notifications error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" })
    }

    if (notification.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    notification.read = true
    await notification.save()

    res.json({
      success: true,
      notification,
      msg: "Notification marked as read"
    })
  } catch (error) {
    console.error("Mark notification read error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put("/read-all", auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, read: false },
      { read: true }
    )

    res.json({
      success: true,
      msg: "All notifications marked as read"
    })
  } catch (error) {
    console.error("Mark all read error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/notifications/create
// @desc    Create a new notification
// @access  Private
router.post("/create", auth, async (req, res) => {
  const { userId, type, message, relatedEntity } = req.body

  if (!userId || !type || !message) {
    return res.status(400).json({ msg: "userId, type, and message are required" })
  }

  try {
    const notification = new Notification({
      userId,
      type,
      message,
      relatedEntity,
    })

    await notification.save()

    // Send real-time notification if user is connected
    if (connectedUsers.has(userId.toString())) {
      const userSocket = connectedUsers.get(userId.toString())
      // In a real WebSocket implementation, you would emit the notification here
      // userSocket.emit('notification', notification)
    }

    res.json({
      success: true,
      notification,
      msg: "Notification created successfully"
    })
  } catch (error) {
    console.error("Create notification error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" })
    }

    if (notification.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" })
    }

    await Notification.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      msg: "Notification deleted successfully"
    })
  } catch (error) {
    console.error("Delete notification error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get("/unread-count", auth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user.id, 
      read: false 
    })

    res.json({
      success: true,
      unreadCount
    })
  } catch (error) {
    console.error("Get unread count error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

// @route   POST /api/notifications/broadcast
// @desc    Broadcast notification to multiple users
// @access  Private (Admin/Recruiter)
router.post("/broadcast", auth, async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "recruiter") {
    return res.status(403).json({ msg: "Access denied" })
  }

  const { userIds, type, message, relatedEntity } = req.body

  if (!userIds || !Array.isArray(userIds) || !type || !message) {
    return res.status(400).json({ msg: "userIds array, type, and message are required" })
  }

  try {
    const notifications = []

    for (const userId of userIds) {
      const notification = new Notification({
        userId,
        type,
        message,
        relatedEntity,
      })
      await notification.save()
      notifications.push(notification)
    }

    res.json({
      success: true,
      notifications,
      msg: `Broadcast sent to ${userIds.length} users`
    })
  } catch (error) {
    console.error("Broadcast notification error:", error)
    res.status(500).json({ msg: "Server error", error: error.message })
  }
})

module.exports = router
