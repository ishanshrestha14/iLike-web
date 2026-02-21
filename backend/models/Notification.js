import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["match", "like", "message", "system"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actionUrl: {
      type: String,
    },
    avatar: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Fetch user's notifications sorted by newest
notificationSchema.index({ userId: 1, createdAt: -1 });

// Unread count queries
notificationSchema.index({ userId: 1, isRead: 1 });

// Prevent duplicate like/match notifications from the same user pair
notificationSchema.index(
  { userId: 1, fromUserId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: { $in: ["like", "match"] } },
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
