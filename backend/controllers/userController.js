import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Profile from "../models/Profile.js";
import Match from "../models/Match.js";
import Chat from "../models/Chat.js";
import Settings from "../models/Settings.js";
import Block from "../models/Block.js";
import Report from "../models/Report.js";
import Notification from "../models/Notification.js";

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
  user.previousRefreshToken = user.refreshToken;
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
    res.status(500).json({ success: false, message: "Error registering user" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  // Validate request body
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
      received: { email: !!email, password: !!password },
    });
  }

  try {
    const user = await User.findOne({ email });

    if (!user || user.deletedAccount) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

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

    res.status(200).json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging in",
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
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching current user profile" });
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
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching user profile" });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile/:id
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    if (req.userId !== req.params.id) {
      return res.status(403).json({ success: false, message: "Not authorized to update this profile" });
    }

    const updates = req.body;
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).select("-password");
    if (!updatedUser)
      return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating user profile" });
  }
};

// @desc    Get all users (excluding the current user)
// @route   GET /api/users
// @access  Private
export const getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.userId; // from the verifyToken
    const users = await User.find({ _id: { $ne: currentUserId } }).select(
      "-password"
    ); // exclude the current user
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
};

// @desc    Refresh access token using refresh token cookie
// @route   POST /api/users/refresh
// @access  Public (uses cookie)
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "No refresh token" });
    }

    const user = await User.findOne({ refreshToken });

    if (!user) {
      // Reuse detection: if this token was already rotated, it's a replay attack
      const compromised = await User.findOne({ previousRefreshToken: refreshToken });
      if (compromised) {
        // Invalidate all tokens for this user to force re-login
        compromised.refreshToken = null;
        compromised.previousRefreshToken = null;
        await compromised.save();
        res.clearCookie("refreshToken", { path: "/" });
        return res.status(401).json({ success: false, message: "Token reuse detected. Please log in again." });
      }

      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    // Issue new access token
    const token = generateAccessToken(user);

    // Rotate refresh token (stores old token as previousRefreshToken)
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
    res.status(500).json({ success: false, message: "Failed to refresh token" });
  }
};

// @desc    Logout — clear refresh token
// @route   POST /api/users/logout
// @access  Private
export const logoutUser = async (req, res) => {
  try {
    // Clear both current and previous refresh tokens from DB
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await User.findOneAndUpdate(
        { refreshToken },
        { refreshToken: null, previousRefreshToken: null }
      );
    }

    res.clearCookie("refreshToken", { path: "/" });
    res.json({ success: true, message: "Logged out" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to logout" });
  }
};

// @desc    Delete account (soft-delete with cascade cleanup)
// @route   DELETE /api/users/me
// @access  Private
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    // Cascade cleanup
    await Promise.all([
      Notification.deleteMany({ $or: [{ userId }, { fromUserId: userId }] }),
      Block.deleteMany({ $or: [{ blockerId: userId }, { blockedId: userId }] }),
      Report.deleteMany({ reporterId: userId }),
      Match.deleteMany({ $or: [{ likerId: userId }, { likedId: userId }] }),
      Chat.updateMany({ participants: userId }, { $set: { isActive: false } }),
      Settings.deleteOne({ userId }),
      Profile.deleteOne({ userId }),
      User.updateMany(
        { $or: [{ likes: userId }, { followers: userId }] },
        { $pull: { likes: userId, followers: userId } }
      ),
    ]);

    // Soft-delete user: mark as deleted, clear sensitive data, keep as tombstone
    user.deletedAccount = true;
    user.name = "Deleted Account";
    user.email = `deleted_${userId}@deleted.local`;
    user.password = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    user.refreshToken = null;
    user.previousRefreshToken = null;
    user.bio = "";
    user.avatar = "";
    user.likes = [];
    user.followers = [];
    user.hasCompletedProfile = false;
    await user.save();

    res.clearCookie("refreshToken", { path: "/" });
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete account" });
  }
};

