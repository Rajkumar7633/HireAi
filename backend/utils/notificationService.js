const Notification = require("../models/Notification");

const createNotification = async (
  userId,
  type,
  message,
  relatedEntity = null
) => {
  try {
    const notification = new Notification({
      userId,
      type,
      message,
      relatedEntity,
      createdAt: new Date(),
    });

    await notification.save();

    if (global.io) {
      global.io.to(`user_${userId}`).emit("new_notification", {
        _id: notification._id,
        type: notification.type,
        message: notification.message,
        read: notification.read,
        createdAt: notification.createdAt,
        relatedEntity: notification.relatedEntity,
      });
    }

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

const getUnreadCount = async (userId) => {
  try {
    const count = await Notification.countDocuments({
      userId,
      read: false,
    });
    return count;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
};

const markAllAsRead = async (userId) => {
  try {
    await Notification.updateMany({ userId, read: false }, { read: true });

    if (global.io) {
      global.io.to(`user_${userId}`).emit("notifications_read");
    }

    return true;
  } catch (error) {
    console.error("Error marking all as read:", error);
    return false;
  }
};

module.exports = {
  createNotification,
  getUnreadCount,
  markAllAsRead,
};
