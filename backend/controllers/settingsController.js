import Settings from "../models/Settings.js";

// @desc    Get user settings
// @route   GET /api/settings
// @access  Private
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.userId });

    if (!settings) {
      // Return defaults without creating a document yet
      settings = {
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        profileVisibility: "public",
        showOnlineStatus: true,
        showLastSeen: false,
        allowMessagesFrom: "matches",
        showMeTo: "everyone",
      };
    }

    res.json({ success: true, data: settings });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Server error while fetching settings",
    });
  }
};

// @desc    Update user settings
// @route   PUT /api/settings
// @access  Private
export const updateSettings = async (req, res) => {
  try {
    const allowedFields = [
      "emailNotifications",
      "pushNotifications",
      "smsNotifications",
      "profileVisibility",
      "showOnlineStatus",
      "showLastSeen",
      "allowMessagesFrom",
      "showMeTo",
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const settings = await Settings.findOneAndUpdate(
      { userId: req.userId },
      { $set: updates },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: settings,
    });
  } catch (error) {

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Invalid settings value",
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error while updating settings",
    });
  }
};
