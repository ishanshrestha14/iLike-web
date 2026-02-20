import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { apiLimiter, writeLimiter } from "../middleware/rateLimiter.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";

const router = express.Router();

router.get("/", verifyToken, apiLimiter, getSettings);
router.put("/", verifyToken, writeLimiter, updateSettings);

export default router;
