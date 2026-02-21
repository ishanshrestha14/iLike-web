import Notification from "../models/Notification.js";
import { isValidObjectId } from "../utils/validate.js";

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const { limit = 30, before, type } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit) || 30, 1), 100);

    const filter = { userId: req.userId };
    if (type && ["match", "like", "message", "system"].includes(type)) {
      filter.type = type;
    }
    if (before) {
      filter.createdAt = { $lt: new Date(before) };
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parsedLimit + 1);

    const hasMore = notifications.length > parsedLimit;
    if (hasMore) notifications.pop();

    res.status(200).json({
      success: true,
      data: notifications,
      hasMore,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching notifications",
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.userId,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching unread count",
    });
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error marking notification as read",
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error marking notifications as read",
    });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting notification",
    });
  }
};
