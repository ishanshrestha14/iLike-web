import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { apiLimiter, writeLimiter } from "../middleware/rateLimiter.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", apiLimiter, getNotifications);
router.get("/unread-count", apiLimiter, getUnreadCount);
router.put("/read-all", writeLimiter, markAllAsRead);
router.put("/:id/read", writeLimiter, markAsRead);
router.delete("/:id", writeLimiter, deleteNotification);

export default router;
