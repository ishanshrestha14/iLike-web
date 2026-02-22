import express from "express";
import { authenticateToken, isAdmin } from "../middleware/auth.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import {
  getDashboardStats,
  getAdminUsers,
  getAdminUser,
  updateUserStatus,
  getAdminReports,
  updateReport,
} from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require authentication + admin role + rate limiting
router.use(authenticateToken, isAdmin, apiLimiter);

router.get("/stats", getDashboardStats);
router.get("/users", getAdminUsers);
router.get("/users/:id", getAdminUser);
router.put("/users/:id/status", updateUserStatus);
router.get("/reports", getAdminReports);
router.put("/reports/:id", updateReport);

export default router;
