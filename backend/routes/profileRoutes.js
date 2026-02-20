import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { upload } from "../utils/cloudinaryConfig.js";
import { apiLimiter, uploadLimiter } from "../middleware/rateLimiter.js";
import {
  getProfile,
  setupProfile,
  updateProfile,
  updateProfilePicture,
  uploadIndividualPhoto,
} from "../controllers/profileController.js";

const router = express.Router();

router.get("/me", verifyToken, apiLimiter, getProfile);
router.post("/setup", verifyToken, uploadLimiter, upload.array("photos", 6), setupProfile);
router.put("/update", verifyToken, uploadLimiter, upload.array("photos", 6), updateProfile);

// Profile picture upload (single photo)
router.put(
  "/picture",
  verifyToken,
  uploadLimiter,
  upload.single("profilePicture"),
  updateProfilePicture
);

// Individual photo upload for onboarding (single photo)
router.post(
  "/upload",
  verifyToken,
  uploadLimiter,
  upload.single("photo"),
  uploadIndividualPhoto
);

export default router;
