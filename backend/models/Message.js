import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    // Unique identifier for the message
    messageId: {
      type: String,
      required: true,
      unique: true,
    },
    // Reference to the chat this message belongs to
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    // ID of the user who sent the message
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Message content
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    // Type of message (text, image, emoji, etc.)
    type: {
      type: String,
      enum: ["text", "image", "emoji"],
      default: "text",
    },
    // Message status (sending, sent, delivered, read, failed)
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "read", "failed"],
      default: "sent",
    },
    // Timestamp when message was sent
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // Soft delete timestamp (null = not deleted)
    deletedAt: {
      type: Date,
      default: null,
    },
    // Whether the message has been read by recipients
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Generate messageId if not provided
messageSchema.pre("save", function (next) {
  if (!this.messageId) {
    this.messageId = `${this.chatId.toString()}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
  next();
});

// Index for efficient queries
messageSchema.index({ chatId: 1, timestamp: -1 });
messageSchema.index({ messageId: 1 });
messageSchema.index({ chatId: 1, senderId: 1, status: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
