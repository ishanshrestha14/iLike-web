import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { apiLimiter, writeLimiter } from "../middleware/rateLimiter.js";
import {
  getPotentialMatches,
  likeUser,
  dislikeUser,
  undoLastSwipe,
  getMatches,
  getLikes,
  getLikesSent,
} from "../controllers/matchController.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get potential matches for the current user
router.get("/potential", apiLimiter, getPotentialMatches);

// Like a user
router.post("/like/:userId", writeLimiter, likeUser);

// Dislike a user (remove like)
router.delete("/like/:userId", writeLimiter, dislikeUser);

// Undo last swipe (within 30 seconds)
router.post("/undo", writeLimiter, undoLastSwipe);

// Get user's matches
router.get("/", apiLimiter, getMatches);

// Get user's likes (people who liked them)
router.get("/likes", apiLimiter, getLikes);

// Get likes sent by current user
router.get("/likes-sent", apiLimiter, getLikesSent);

export default router;
