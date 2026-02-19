import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

/** Generate a short-lived access token (15 min) */
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      hasCompletedProfile: user.hasCompletedProfile || false,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

/** Generate an opaque refresh token and persist it on the user doc */
export const generateRefreshToken = async (user) => {
  const token = crypto.randomBytes(40).toString("hex");
  user.refreshToken = token;
  await user.save();
  return token;
};

/** Kept for backwards compat (profileController uses it) */
export const generateToken = generateAccessToken;

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const register = async (req, res) => {
  const { name, email, password, bio, avatar } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      bio: bio || "",
      avatar: avatar || "",
      hasCompletedProfile: false,
    });

    await newUser.save();

    // Generate tokens
    const token = generateAccessToken(newUser);
    const refreshToken = await generateRefreshToken(newUser);

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Return response
    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        isAdmin: newUser.isAdmin || false,
      },
      message: "User registered successfully",
    });
  } catch (error) {
    res.status(500).json({ error: "Error registering user" });
  }
};

export const login = async (req, res) => {
  console.log("Login request received:", {
    body: req.body,
    headers: req.headers,
  });

  const { email, password } = req.body;

  // Validate request body
  if (!email || !password) {
    console.error("Missing email or password");
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
      received: { email: !!email, password: !!password },
    });
  }

  try {
    console.log("Looking for user with email:", email);
    const user = await User.findOne({ email });

    if (!user) {
      console.error("User not found for email:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("User found, checking password...");
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.error("Password does not match for user:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("Authentication successful, generating token...");
    const token = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin || false,
      hasCompletedProfile: user.hasCompletedProfile || false,
      profile: user.profile || null,
    };

    console.log("Login successful for user:", userResponse.email);
    res.status(200).json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

// @desc    Get current user's profile
// @route   GET /api/users/me
// @access  Private
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Error fetching current user profile" });
  }
};

// @desc    Get user profile by ID
// @route   GET /api/users/profile/:id
// @access  Private
export const getProfile = async (req, res) => {
  const targetId = req.params.id || req.userId; // from the verifyToken middleware
  try {
    const user = await User.findById(targetId).select("-password"); // exclude password from the response

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Error fetching user profile" });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile/:id
// @access  Private
export const updateProfile = async (req, res) => {
  console.log("📤 Update profile hit");
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ message: "Not authorized to update this profile" });
    }

    const updates = req.body;
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).select("-password");
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Error updating user profile" });
  }
};

// @desc    Get all users (excluding the current user)
// @route   GET /api/users
// @access  Private
export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user?.id; // from the verifyToken
    const users = await User.find({ _id: { $ne: currentUserId } }).select(
      "-password"
    ); // exclude the current user
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: "Error fetching users" });
  }
};

// @desc    Refresh access token using refresh token cookie
// @route   POST /api/users/refresh
// @access  Public (uses cookie)
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const user = await User.findOne({ refreshToken });
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Issue new access token
    const token = generateAccessToken(user);

    // Rotate refresh token
    const newRefreshToken = await generateRefreshToken(user);
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({ success: true, token });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Failed to refresh token" });
  }
};

// @desc    Logout — clear refresh token
// @route   POST /api/users/logout
// @access  Private
export const logoutUser = async (req, res) => {
  try {
    // Clear refresh token from DB
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await User.findOneAndUpdate({ refreshToken }, { refreshToken: null });
    }

    res.clearCookie("refreshToken", { path: "/" });
    res.json({ success: true, message: "Logged out" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Failed to logout" });
  }
};

