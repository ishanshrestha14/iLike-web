import Profile from "../models/Profile.js";
import User from "../models/user.js";
import { generateAccessToken } from "./userController.js";

// @desc    Get current user's profile
// @route   GET /api/profile/me
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user._id }).select(
      "-__v -createdAt -updatedAt"
    );

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Create or update user profile
// @route   POST /api/profile/setup
// @access  Private
export const setupProfile = async (req, res) => {
  try {
    const {
      name,
      gender,
      location,
      intentions,
      age,
      bio,
      interests,
      height,
      photoUrls: existingPhotoUrls,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !gender ||
      !location ||
      !intentions ||
      !age ||
      !bio ||
      !interests ||
      !height
    ) {
      return res.status(400).json({
        success: false,
        message: "All profile fields are required",
      });
    }

    // Parse arrays if they're strings
    let intentionsArray = [];
    let interestsArray = [];
    let photoUrlsArray = [];
    try {
      intentionsArray =
        typeof intentions === "string" ? JSON.parse(intentions) : intentions;
      interestsArray =
        typeof interests === "string" ? JSON.parse(interests) : interests;

      // Handle existing photoUrls if provided
      if (existingPhotoUrls) {
        photoUrlsArray =
          typeof existingPhotoUrls === "string"
            ? JSON.parse(existingPhotoUrls)
            : existingPhotoUrls;
      }

      if (!Array.isArray(intentionsArray) || !Array.isArray(interestsArray)) {
        throw new Error("Intentions and interests must be arrays");
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid format for intentions or interests. Must be JSON arrays",
      });
    }

    // Handle uploaded files
    const uploadedPhotos = [];

    // Handle photos upload from any client
    if (req.files && req.files.length > 0) {
      uploadedPhotos.push(...req.files.map((file) => file.path));
    }

    // Combine existing and uploaded photos
    const photoUrls = [...photoUrlsArray, ...uploadedPhotos];

    if (photoUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one photo is required",
      });
    }

    // Prepare profile data
    const profileData = {
      userId: req.user._id,
      name,
      gender,
      location,
      intentions: intentionsArray,
      age: parseInt(age, 10),
      bio,
      interests: interestsArray,
      height,
      photoUrls,
      profilePictureUrl: photoUrls[0] || null,
      isProfileComplete: true,
    };

    // Find and update or create profile
    let profile = await Profile.findOne({ userId: req.user._id });

    if (profile) {
      // Update existing profile
      profile = await Profile.findOneAndUpdate(
        { userId: req.user._id },
        { $set: profileData },
        { new: true, runValidators: true }
      );
    } else {
      // Create new profile
      profile = new Profile(profileData);
      await profile.save();
    }

    // Update user's profile completion status
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { hasCompletedProfile: true },
      { new: true }
    );

    // Generate new access token with updated hasCompletedProfile status
    const newToken = generateAccessToken(updatedUser);

    res.json({
      success: true,
      message: "Profile saved successfully",
      data: profile,
      token: newToken, // Return new token
    });
  } catch (error) {
    console.error("Error saving profile - Full error:", error);
    console.error("Error stack trace:", error.stack);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error while saving profile",
      error: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/profile/update
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const updates = {};
    const allowedUpdates = [
      "name",
      "gender",
      "location",
      "intentions",
      "age",
      "bio",
      "interests",
      "height",
      "photoUrls",
      "preferences",
    ];

    // Filter allowed updates
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        if (
          ["intentions", "interests", "photoUrls"].includes(key) &&
          typeof req.body[key] === "string"
        ) {
          try {
            updates[key] = JSON.parse(req.body[key]);
          } catch (e) {
            return res.status(400).json({
              success: false,
              message: `Invalid ${key} format`,
            });
          }
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    // Handle file upload if exists
    if (req.file) {
      updates.profilePictureUrl = req.file.path;
    }

    // Update profile
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: profile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Server error while updating profile",
    });
  }
};

// @desc    Update profile picture
// @route   PUT /api/profile/picture
// @access  Private
export const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const profilePictureUrl = req.file.path;

    // Update profile with new profile picture
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { profilePictureUrl } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
      });
    }

    res.json({
      success: true,
      message: "Profile picture updated successfully",
      data: { profilePictureUrl: profile.profilePictureUrl },
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating profile picture",
    });
  }
};

// @desc    Upload individual photo during onboarding
// @route   POST /api/profile/upload
// @access  Private
export const uploadIndividualPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Return the URL of the uploaded file
    const photoUrl = req.file.path;

    res.json({
      success: true,
      url: photoUrl,
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    res.status(500).json({
      success: false,
      message: "Server error while uploading photo",
    });
  }
};
