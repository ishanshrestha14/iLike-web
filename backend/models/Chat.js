import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    // Array of user IDs participating in the chat
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    // Last message in the chat for preview
    lastMessage: {
      content: String,
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    // Unread message counts for each participant
    unreadCounts: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    // Whether the chat is active
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
chatSchema.index({ participants: 1 });
chatSchema.index({ "lastMessage.timestamp": -1 });

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
