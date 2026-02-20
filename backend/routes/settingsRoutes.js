import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";

const router = express.Router();

router.get("/", verifyToken, getSettings);
router.put("/", verifyToken, updateSettings);

export default router;
