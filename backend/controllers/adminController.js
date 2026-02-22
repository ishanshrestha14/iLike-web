import mongoose from "mongoose";
import User from "../models/user.js";
import Profile from "../models/Profile.js";
import Match from "../models/Match.js";
import Report from "../models/Report.js";
import { isValidObjectId } from "../utils/validate.js";

// @desc    Dashboard stats
// @route   GET /api/admin/stats
// @access  Admin
export const getDashboardStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalUsers, activeUsers, totalMatches, pendingReports, newUsersToday] =
      await Promise.all([
        User.countDocuments({ deletedAccount: false }),
        User.countDocuments({ deletedAccount: false, isBanned: false }),
        Match.countDocuments({ status: "matched" }),
        Report.countDocuments({ status: "pending" }),
        User.countDocuments({ createdAt: { $gte: startOfToday }, deletedAccount: false }),
      ]);

    res.json({
      success: true,
      data: { totalUsers, activeUsers, totalMatches, pendingReports, newUsersToday },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};

// @desc    List all users (paginated, searchable, filterable by status)
// @route   GET /api/admin/users
// @access  Admin
export const getAdminUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { search, status } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (status === "banned") {
      filter.isBanned = true;
      filter.deletedAccount = false;
    } else if (status === "suspended") {
      filter.suspendedUntil = { $gt: new Date() };
      filter.isBanned = false;
      filter.deletedAccount = false;
    } else if (status === "deleted") {
      filter.deletedAccount = true;
    } else if (status === "active") {
      filter.deletedAccount = false;
      filter.isBanned = false;
      filter.$or = filter.$or
        ? [{ $and: filter.$or.map((c) => c) }]
        : [{ suspendedUntil: null }, { suspendedUntil: { $lte: new Date() } }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -refreshToken -previousRefreshToken -resetPasswordToken -resetPasswordExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Batch fetch report counts for all returned users
    const userIds = users.map((u) => u._id);
    const reportCounts = await Report.aggregate([
      { $match: { reportedId: { $in: userIds } } },
      { $group: { _id: "$reportedId", count: { $sum: 1 } } },
    ]);
    const reportCountMap = new Map(reportCounts.map((r) => [r._id.toString(), r.count]));

    const data = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      isBanned: u.isBanned,
      suspendedUntil: u.suspendedUntil,
      banReason: u.banReason,
      deletedAccount: u.deletedAccount,
      hasCompletedProfile: u.hasCompletedProfile,
      createdAt: u.createdAt,
      reportCount: reportCountMap.get(u._id.toString()) || 0,
    }));

    res.json({
      success: true,
      data: { data, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

// @desc    Get single user detail (for admin)
// @route   GET /api/admin/users/:id
// @access  Admin
export const getAdminUser = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const [user, profile, reportCount, blockCount, matchCount] = await Promise.all([
      User.findById(req.params.id)
        .select("-password -refreshToken -previousRefreshToken -resetPasswordToken -resetPasswordExpires")
        .lean(),
      Profile.findOne({ userId: req.params.id }).lean(),
      Report.countDocuments({ reportedId: req.params.id }),
      mongoose.model("Block").countDocuments({
        $or: [{ blockerId: req.params.id }, { blockedId: req.params.id }],
      }),
      Match.countDocuments({
        $or: [{ likerId: req.params.id }, { likedId: req.params.id }],
        status: "matched",
      }),
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        suspendedUntil: user.suspendedUntil,
        banReason: user.banReason,
        deletedAccount: user.deletedAccount,
        hasCompletedProfile: user.hasCompletedProfile,
        createdAt: user.createdAt,
        profile: profile
          ? {
              bio: profile.bio,
              profilePictureUrl: profile.profilePictureUrl,
              age: profile.age,
              gender: profile.gender,
            }
          : null,
        reportCount,
        blockCount,
        matchCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
};

// @desc    Ban, suspend, or activate a user
// @route   PUT /api/admin/users/:id/status
// @access  Admin
export const updateUserStatus = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const { action, reason, suspendUntil } = req.body;

    if (!["ban", "suspend", "activate"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action. Must be ban, suspend, or activate." });
    }

    // Prevent admins from banning themselves or other admins
    if (req.params.id === req.userId) {
      return res.status(400).json({ success: false, message: "You cannot change your own account status." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.isAdmin) {
      return res.status(403).json({ success: false, message: "Cannot change status of another admin." });
    }

    if (action === "ban") {
      user.isBanned = true;
      user.banReason = reason || null;
      user.suspendedUntil = null;
      // Invalidate all sessions
      user.refreshToken = null;
      user.previousRefreshToken = null;
    } else if (action === "suspend") {
      if (!suspendUntil) {
        return res.status(400).json({ success: false, message: "suspendUntil date is required for suspend action." });
      }
      const suspendDate = new Date(suspendUntil);
      if (isNaN(suspendDate.getTime()) || suspendDate <= new Date()) {
        return res.status(400).json({ success: false, message: "suspendUntil must be a future date." });
      }
      user.suspendedUntil = suspendDate;
      user.isBanned = false;
      user.banReason = reason || null;
      // Invalidate all sessions
      user.refreshToken = null;
      user.previousRefreshToken = null;
    } else if (action === "activate") {
      user.isBanned = false;
      user.suspendedUntil = null;
      user.banReason = null;
    }

    await user.save();

    const messages = { ban: "User banned", suspend: "User suspended", activate: "User activated" };
    res.json({ success: true, message: messages[action] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update user status" });
  }
};

// @desc    List reports (paginated, filterable by status)
// @route   GET /api/admin/reports
// @access  Admin
export const getAdminReports = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const validStatuses = ["pending", "reviewed", "resolved", "dismissed"];
    const filter = {};
    if (status && validStatuses.includes(status)) {
      filter.status = status;
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .populate("reporterId", "name email")
        .populate("reportedId", "name email")
        .populate("resolvedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter),
    ]);

    const data = reports.map((r) => ({
      id: r._id,
      reporter: r.reporterId
        ? { id: r.reporterId._id, name: r.reporterId.name, email: r.reporterId.email }
        : null,
      reported: r.reportedId
        ? { id: r.reportedId._id, name: r.reportedId.name, email: r.reportedId.email }
        : null,
      reason: r.reason,
      description: r.description,
      status: r.status,
      adminNote: r.adminNote,
      resolvedBy: r.resolvedBy
        ? { id: r.resolvedBy._id, name: r.resolvedBy.name }
        : null,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
    }));

    res.json({
      success: true,
      data: { data, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch reports" });
  }
};

// @desc    Update a report status and/or admin note
// @route   PUT /api/admin/reports/:id
// @access  Admin
export const updateReport = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid report ID" });
    }

    const { status, adminNote } = req.body;
    const validStatuses = ["pending", "reviewed", "resolved", "dismissed"];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (status) report.status = status;
    if (adminNote !== undefined) report.adminNote = adminNote;

    // Track who resolved/reviewed it and when
    if (status && status !== "pending") {
      report.resolvedBy = req.userId;
      report.resolvedAt = new Date();
    }

    await report.save();

    const updated = await Report.findById(report._id)
      .populate("reporterId", "name email")
      .populate("reportedId", "name email")
      .populate("resolvedBy", "name email")
      .lean();

    res.json({
      success: true,
      data: {
        id: updated._id,
        reporter: updated.reporterId
          ? { id: updated.reporterId._id, name: updated.reporterId.name, email: updated.reporterId.email }
          : null,
        reported: updated.reportedId
          ? { id: updated.reportedId._id, name: updated.reportedId.name, email: updated.reportedId.email }
          : null,
        reason: updated.reason,
        description: updated.description,
        status: updated.status,
        adminNote: updated.adminNote,
        resolvedBy: updated.resolvedBy
          ? { id: updated.resolvedBy._id, name: updated.resolvedBy.name }
          : null,
        resolvedAt: updated.resolvedAt,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update report" });
  }
};
