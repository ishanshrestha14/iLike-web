import Block from "../models/Block.js";
import Report from "../models/Report.js";
import User from "../models/user.js";
import { isValidObjectId } from "../utils/validate.js";

// @desc    Block a user
// @route   POST /api/users/block/:id
// @access  Private
export const blockUser = async (req, res) => {
  try {
    const blockerId = req.userId;
    const blockedId = req.params.id;

    if (!isValidObjectId(blockedId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    if (blockerId === blockedId) {
      return res.status(400).json({ success: false, message: "You can't block yourself" });
    }

    const targetUser = await User.findById(blockedId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if already blocked
    const existing = await Block.findOne({ blockerId, blockedId });
    if (existing) {
      return res.status(400).json({ success: false, message: "User is already blocked" });
    }

    await Block.create({ blockerId, blockedId });

    res.json({ success: true, message: "User blocked" });
  } catch (error) {

    res.status(500).json({ success: false, message: "Failed to block user" });
  }
};

// @desc    Unblock a user
// @route   DELETE /api/users/block/:id
// @access  Private
export const unblockUser = async (req, res) => {
  try {
    const blockerId = req.userId;
    const blockedId = req.params.id;

    if (!isValidObjectId(blockedId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const deleted = await Block.findOneAndDelete({ blockerId, blockedId });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Block not found" });
    }

    res.json({ success: true, message: "User unblocked" });
  } catch (error) {

    res.status(500).json({ success: false, message: "Failed to unblock user" });
  }
};

// @desc    Report a user
// @route   POST /api/users/report/:id
// @access  Private
export const reportUser = async (req, res) => {
  try {
    const reporterId = req.userId;
    const reportedId = req.params.id;
    const { reason, description } = req.body;

    if (!isValidObjectId(reportedId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    if (reporterId === reportedId) {
      return res.status(400).json({ success: false, message: "You can't report yourself" });
    }

    const targetUser = await User.findById(reportedId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason is required" });
    }

    const existingReport = await Report.findOne({ reporterId, reportedId });
    if (existingReport) {
      return res.status(400).json({ success: false, message: "You have already reported this user" });
    }

    await Report.create({
      reporterId,
      reportedId,
      reason,
      description: description || "",
    });

    res.json({ success: true, message: "Report submitted" });
  } catch (error) {

    res.status(500).json({ success: false, message: "Failed to report user" });
  }
};
