import mongoose from "mongoose";

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const isValidPhotoUrl = (url) => {
  if (typeof url !== "string" || url.length === 0) return false;
  // Allow relative paths from legacy local uploads
  if (url.startsWith("/uploads/")) return true;
  // Allow Cloudinary URLs
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname.endsWith("cloudinary.com") ||
      parsed.hostname.endsWith("res.cloudinary.com")
    );
  } catch {
    return false;
  }
};
