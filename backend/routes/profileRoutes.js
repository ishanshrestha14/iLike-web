import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { upload } from "../utils/cloudinaryConfig.js";
import {
  getProfile,
  setupProfile,
  updateProfile,
  updateProfilePicture,
  uploadIndividualPhoto,
} from "../controllers/profileController.js";

const router = express.Router();

router.get("/me", verifyToken, getProfile);
router.post("/setup", verifyToken, upload.array("photos", 6), setupProfile);
router.put("/update", verifyToken, upload.array("photos", 6), updateProfile);

// Profile picture upload (single photo)
router.put(
  "/picture",
  verifyToken,
  upload.single("profilePicture"),
  updateProfilePicture
);

// Individual photo upload for onboarding (single photo)
router.post(
  "/upload",
  verifyToken,
  upload.single("photo"),
  uploadIndividualPhoto
);

export default router;
