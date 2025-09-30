const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Notification = require("../models/Notification");
const {
  getUnreadCount,
  markAllAsRead,
} = require("../utils/notificationService");

// @route   GET /api/notifications
// @desc    Get all notifications for the authenticated user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit));

    const total = await Notification.countDocuments({ userId: req.user.id });
    const unreadCount = await getUnreadCount(req.user.id);

    res.json({
      notifications,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await getUnreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put("/mark-all-read", auth, async (req, res) => {
  try {
    await markAllAsRead(req.user.id);
    res.json({ msg: "All notifications marked as read" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put("/:id/read", auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    // Ensure user owns the notification
    if (notification.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    notification.read = true;
    await notification.save();

    res.json({ msg: "Notification marked as read", notification });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    // Ensure user owns the notification
    if (notification.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }

    await Notification.deleteOne({ _id: req.params.id });

    res.json({ msg: "Notification removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
