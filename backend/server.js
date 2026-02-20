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

// Use routes
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/chats", chatRoutes);

app.get("/", (req, res) => {
  res.send("iLike application backend is running!");
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

// Start server only if this file is run directly
  const PORT = process.env.PORT || 5000;
  console.log("Starting server...");

  try {
    console.log("Initializing server...");
    // Initialize server and connect to DB
    await initServer();
    console.log("Server initialized");

    console.log("Connecting to database...");
    await connectDB();
    console.log("Database connected");

    // Create HTTP server for Socket.IO
    const server = createServer(app);
    console.log("HTTP server created");

    // Initialize Socket.IO
    try {
      console.log("Initializing Socket.IO...");
      const socketServer = new SocketServer(server);
      console.log("Socket.IO server initialized");
    } catch (error) {
      console.error("Socket.IO initialization failed:", error);
      // Continue without Socket.IO for now
    }

    // Start listening
    console.log("Starting to listen on port", PORT);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Socket.IO server is ready for real-time chat`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }

export { app, connectDB, initServer };
export default app;
