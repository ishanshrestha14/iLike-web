import Profile from "../models/Profile.js";
import User from "../models/user.js";
import { generateAccessToken } from "./userController.js";
import { isValidPhotoUrl } from "../utils/validate.js";
import { uploadToCloudinary } from "../utils/cloudinaryConfig.js";

// @desc    Get current user's profile
// @route   GET /api/profile/me
// @access  Private
export const getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.userId }).select(
      "-__v -createdAt -updatedAt"
    );

    if (!profile) {
      return res
        .status(404)
        .json({ success: false, message: "Profile not found" });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
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

    // Upload files to Cloudinary
    const uploadedPhotos = [];
    if (req.files && req.files.length > 0) {
      const uploads = await Promise.all(
        req.files.map((file) => uploadToCloudinary(file.buffer))
      );
      uploadedPhotos.push(...uploads.map((u) => u.secure_url));
    }

    // Filter invalid URLs from user-provided photos
    const validatedUrls = photoUrlsArray.filter(isValidPhotoUrl);

    // Combine existing and uploaded photos
    const photoUrls = [...validatedUrls, ...uploadedPhotos];

    if (photoUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one photo is required",
      });
    }

    // Prepare profile data
    const profileData = {
      userId: req.userId,
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
    let profile = await Profile.findOne({ userId: req.userId });

    if (profile) {
      // Update existing profile
      profile = await Profile.findOneAndUpdate(
        { userId: req.userId },
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
      req.userId,
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

    // Filter invalid photo URLs if provided
    if (Array.isArray(updates.photoUrls)) {
      updates.photoUrls = updates.photoUrls.filter(isValidPhotoUrl);
    }

    // Handle file upload if exists
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      updates.profilePictureUrl = result.secure_url;
    }

    // Update profile
    const profile = await Profile.findOneAndUpdate(
      { userId: req.userId },
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

    const result = await uploadToCloudinary(req.file.buffer);
    const profilePictureUrl = result.secure_url;

    // Update profile with new profile picture
    const profile = await Profile.findOneAndUpdate(
      { userId: req.userId },
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

    const result = await uploadToCloudinary(req.file.buffer);

    res.json({
      success: true,
      url: result.secure_url,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while uploading photo",
    });
  }
};
