import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Non-binary", "Other"],
      required: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    intentions: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one intention is required",
      },
    },
    age: {
      type: Number,
      required: true,
      min: 18,
      max: 100,
    },
    bio: {
      type: String,
      required: true,
      maxlength: 500,
    },
    interests: [
      {
        type: String,
        required: true,
      },
    ],
    height: {
      type: String,
      required: true,
    },
    photoUrls: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one photo is required",
      },
    },
    profilePictureUrl: {
      type: String,
      default: null,
    },
    preferences: {
      minAge: {
        type: Number,
        default: 18,
        min: 18,
      },
      maxAge: {
        type: Number,
        default: 100,
        max: 100,
      },
      genders: [
        {
          type: String,
          enum: ["Male", "Female", "Non-binary", "Other"],
        },
      ],
      maxDistance: {
        type: Number,
        default: 50, // in kilometers
      },
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
    /**
     * Set to true once at least one profile photo has passed server-side
     * face detection. Used by admin review and match-ranking pipelines to
     * surface only verified profiles.
     */
    faceVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries
// profileSchema.index({ location: "2dsphere" });

const Profile = mongoose.model("Profile", profileSchema);

export default Profile;
