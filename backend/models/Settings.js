import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Notification Settings
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },

    // Privacy Settings
    profileVisibility: {
      type: String,
      enum: ["public", "friends", "private"],
      default: "public",
    },
    showOnlineStatus: { type: Boolean, default: true },
    showLastSeen: { type: Boolean, default: false },
    allowMessagesFrom: {
      type: String,
      enum: ["everyone", "matches", "friends"],
      default: "matches",
    },

    // Discovery Settings
    showMeTo: {
      type: String,
      enum: ["everyone", "women", "men", "matches"],
      default: "everyone",
    },
  },
  { timestamps: true }
);

const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;
