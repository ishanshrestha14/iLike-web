import Notification from "../models/Notification.js";
import Profile from "../models/Profile.js";
import { getSocketServer } from "../socket/socketServer.js";

/**
 * Create a notification, save to DB, and push via socket if user is online.
 * Returns the created notification or null if duplicate (for like/match types).
 */
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  fromUserId,
  actionUrl,
}) => {
  let avatar = null;
  if (fromUserId) {
    const profile = await Profile.findOne({ userId: fromUserId });
    avatar = profile?.profilePictureUrl || null;
  }

  let notification;
  try {
    notification = await Notification.create({
      userId,
      type,
      title,
      message,
      fromUserId,
      actionUrl,
      avatar,
    });
  } catch (err) {
    if (err.code === 11000) return null;
    throw err;
  }

  const socketServer = getSocketServer();
  if (socketServer) {
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    socketServer.sendToUser(userId.toString(), "new_notification", {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      timestamp: notification.createdAt,
      isRead: false,
      avatar: notification.avatar,
      actionUrl: notification.actionUrl,
    });

    socketServer.sendToUser(userId.toString(), "notification_count", {
      count: unreadCount,
    });
  }

  return notification;
};
