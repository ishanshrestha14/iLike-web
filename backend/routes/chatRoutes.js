import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { apiLimiter, writeLimiter, messageLimiter } from "../middleware/rateLimiter.js";
import {
  getChats,
  getMessages,
  sendMessage,
  deleteMessage,
  markMessagesAsRead,
  createChat,
  getChatById,
  deleteChat,
} from "../controllers/chatController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all chats for the current user
router.get("/", apiLimiter, getChats);

// Create a new chat
router.post("/", writeLimiter, createChat);

// Get chat by ID
router.get("/:chatId", apiLimiter, getChatById);

// Get messages for a specific chat
router.get("/:chatId/messages", apiLimiter, getMessages);

// Send a message in a chat
router.post("/:chatId/messages", messageLimiter, sendMessage);

// Delete a message (soft delete, sender only)
router.delete("/:chatId/messages/:messageId", writeLimiter, deleteMessage);

// Mark messages as read in a chat
router.put("/:chatId/read", apiLimiter, markMessagesAsRead);

// Delete a chat (soft delete)
router.delete("/:chatId", writeLimiter, deleteChat);

export default router;
