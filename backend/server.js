import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdir } from "fs/promises";
import { createServer } from "http";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import SocketServer from "./socket/socketServer.js";
import { preloadFaceDetectionModel } from "./services/faceDetectionService.js";
import { preloadNsfwModel } from "./services/nsfwModerationService.js";
import { getRedisClient } from "./utils/redisClient.js";

// Load environment variables
dotenv.config();

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure CORS with specific origin and credentials
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Create Express app
const app = express();

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Import routes
import userRoutes from "./routes/userRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// Use routes
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("iLike application backend is running!");
});

// Global error handler — catches multer, validation, and unhandled errors
app.use((err, req, res, _next) => {
  const message = typeof err === "string" ? err : err?.message || "Internal server error";
  console.error("Unhandled error:", message);

  // Multer file size / field errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large (max 5MB)" });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ success: false, message: "Unexpected file field" });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({ success: false, message });
});

// Initialize server function
const initServer = async () => {
  // Ensure uploads directory exists
  const uploadsDir = join(__dirname, "uploads/profiles");
  try {
    await mkdir(uploadsDir, { recursive: true });
    console.log("Uploads directory ready");
  } catch (error) {
    console.error("Error creating uploads directory:", error);
  }

  // Serve static files from uploads directory
  app.use("/uploads", express.static(join(__dirname, "uploads")));

  console.log(
    "Loaded JWT_SECRET:",
    process.env.JWT_SECRET ? "***" : "Not found"
  );
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    // Drop the location index if it exists
    try {
      const Profile = mongoose.model("Profile");
      await Profile.collection.dropIndex("location_2dsphere");
      console.log("Successfully dropped location index");
    } catch (error) {
      // Ignore if index doesn't exist
      if (error.code !== 27) {
        console.error("Error dropping index:", error);
      }
    }
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// Start server only when not in test environment
if (process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 5000;

  try {
    await initServer();
    await connectDB();
    await preloadFaceDetectionModel();
    await preloadNsfwModel();

    // Initialise Redis (non-fatal): caching degrades to DB if unavailable.
    getRedisClient();

    const server = createServer(app);

    try {
      const socketServer = new SocketServer(server);
    } catch (error) {
      console.error("Socket.IO initialization failed:", error);
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

export { app, connectDB, initServer };
export default app;
