import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — multer 2.x breaks multer-storage-cloudinary's stream piping.
// Files are buffered in memory then uploaded to Cloudinary manually in controllers.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG/JPEG/PNG images are allowed"));
    }
  },
});

/**
 * Upload a buffer to Cloudinary and return the result.
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {object} [options] - Cloudinary upload options
 * @returns {Promise<object>} Cloudinary upload result
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "ilike/profiles", ...options },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

export { upload, cloudinary, uploadToCloudinary };
