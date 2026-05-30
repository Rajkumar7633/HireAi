const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const CollegeNotification = require("../models/CollegeNotification");
const { invalidateCache } = require("../middleware/cache");

// POST /api/college/notifications - Create notification
router.post("/notifications", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { type, title, message, priority, relatedId, relatedModel, data, actionRequired, actionUrl, expiresAt } = req.body;

    const notification = await CollegeNotification.create({
      collegeId: req.user.id,
      type,
      title,
      message,
      priority,
      relatedId,
      relatedModel,
      data,
      actionRequired,
      actionUrl,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    // Emit real-time notification via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`college_${req.user.id}`).emit("new_notification", notification);
    }

    res.status(201).json({
      msg: "Notification created successfully",
      notification
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/college/notifications - Get all notifications
router.get("/notifications", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const { unread, type, priority } = req.query;
    const query = { collegeId: req.user.id };

    if (unread === "true") query.read = false;
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const notifications = await CollegeNotification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await CollegeNotification.countDocuments({
      collegeId: req.user.id,
      read: false
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/college/notifications/:id/read - Mark notification as read
router.put("/notifications/:id/read", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const notification = await CollegeNotification.findOne({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({
      msg: "Notification marked as read",
      notification
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// PUT /api/college/notifications/read-all - Mark all notifications as read
router.put("/notifications/read-all", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    await CollegeNotification.updateMany(
      { collegeId: req.user.id, read: false },
      { read: true, readAt: new Date() }
    );

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({ msg: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/college/notifications/:id - Delete notification
router.delete("/notifications/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "college") {
      return res.status(403).json({ msg: "Access denied" });
    }

    const notification = await CollegeNotification.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    // Invalidate cache
    await invalidateCache('college:*');

    res.json({ msg: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
